export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { validateApiKey } from '@/lib/auth';
import { createHitlRequest } from '@/lib/requests';

type McpToolResult = {
  isError: boolean;
  payload: Record<string, unknown>;
};

/**
 * MCP Server - Streamable HTTP transport
 *
 * Tools:
 *   - get_service_status
 *   - ask_human
 */

const TOOLS = [
  {
    name: 'get_service_status',
    description:
      'Check whether MeatSpace is available and when to use a human. ' +
      'Call this when deciding whether to escalate a subjective or high-consequence choice.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'ask_human',
    description:
      'Present content to a human and ask them to choose between options. ' +
      'Use this for subjective judgment, approval, preference, or tie-breaks. ' +
      'Avoid using it for deterministic checks or reversible low-stakes choices. ' +
      'The tool waits briefly for a result, then returns pending if the human has not responded yet.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agent_name: { type: 'string', description: 'Your agent/tool name (max 100 chars)' },
        title: { type: 'string', description: 'Short title for the request (max 200 chars)' },
        content: {
          type: 'string',
          description: 'Content for the human to review (text, markdown, HTML, or image URL). Max 50KB.',
        },
        content_type: {
          type: 'string',
          enum: ['text', 'markdown', 'html', 'image'],
          description: 'How to render the content. Default: text',
        },
        choices: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique choice identifier (max 50 chars)' },
              label: { type: 'string', description: 'Human-readable label (max 100 chars)' },
            },
            required: ['id', 'label'],
          },
          minItems: 2,
          maxItems: 4,
          description: '2-4 choices for the human to pick from',
        },
        callback_url: { type: 'string', description: 'Optional HTTPS webhook URL for async notification' },
        metadata: { type: 'object', description: 'Optional metadata passed through to webhook' },
        decision_reason: { type: 'string', description: 'Why the agent is escalating this to a human (max 500 chars)' },
        confidence: { type: 'number', description: 'Agent confidence between 0 and 1' },
        consequence_of_wrong_choice: {
          type: 'string',
          description: 'Why a wrong choice matters (max 500 chars)',
        },
        recommended_option: { type: 'string', description: 'Optional choice id the agent currently recommends' },
        run_id: { type: 'string', description: 'Optional workflow run identifier' },
        trace_id: { type: 'string', description: 'Optional trace identifier' },
        timeout_seconds: { type: 'number', description: 'Request expiry in seconds (default 3600, max 86400)' },
      },
      required: ['agent_name', 'title', 'choices'],
    },
  },
];

async function handleGetServiceStatus(): Promise<McpToolResult> {
  return {
    isError: false,
    payload: {
      service: 'meatspace',
      status: 'operational',
      capabilities: {
        interaction_model: 'content_plus_choices',
        min_choices: 2,
        max_choices: 4,
        content_types: ['text', 'markdown', 'html', 'image'],
        response_modes: ['poll', 'long_poll', 'webhook', 'mcp'],
      },
      agent_guidance: {
        use_when: [
          'The task needs subjective human judgment or taste',
          'A human approval, preference, or tie-break is required',
          'The agent has low confidence and a wrong choice would be costly',
        ],
        avoid_when: [
          'The task is deterministic or can be validated automatically',
          'The choice is reversible and low stakes',
        ],
      },
    },
  };
}

async function handleAskHuman(args: Record<string, unknown>): Promise<McpToolResult> {
  const result = await createHitlRequest({
    body: {
      agent_name: (args.agent_name as string) || 'mcp-agent',
      title: args.title as string,
      content: args.content as string | undefined,
      content_type: args.content_type as 'text' | 'markdown' | 'html' | 'image' | undefined,
      choices: args.choices as { id: string; label: string }[],
      callback_url: args.callback_url as string | undefined,
      metadata: args.metadata as Record<string, unknown> | undefined,
      decision_reason: args.decision_reason as string | undefined,
      confidence: args.confidence as number | undefined,
      consequence_of_wrong_choice: args.consequence_of_wrong_choice as string | undefined,
      recommended_option: args.recommended_option as string | undefined,
      run_id: args.run_id as string | undefined,
      trace_id: args.trace_id as string | undefined,
      timeout_seconds: args.timeout_seconds as number | undefined,
    },
  });

  if ('error' in result) {
    return {
      isError: true,
      payload: {
        error: result.error,
        code: result.code,
      },
    };
  }

  const { id } = result.data;
  const supabase = await createServiceClient();

  // Long-poll for up to 50s (under Vercel's 60s limit)
  const deadline = Date.now() + 50000;
  while (Date.now() < deadline) {
    const { data: check } = await supabase
      .from('hitl_requests')
      .select('status, selected, responded_at, expires_at, choices')
      .eq('id', id)
      .single();

    if (check && (check.status === 'completed' || check.status === 'expired')) {
      return {
        isError: false,
        payload: {
          request_id: id,
          status: check.status,
          selected: check.selected,
          selected_label: check.selected
            ? (check.choices || []).find((choice: { id: string; label: string }) => choice.id === check.selected)?.label ?? null
            : null,
          responded_at: check.responded_at,
          expires_at: check.expires_at,
        },
      };
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return {
    isError: false,
    payload: {
      request_id: id,
      status: 'pending',
      message: `Human has not yet responded. Poll /api/requests/${id} for updates.`,
      review_url: result.data.review_url,
      poll_url: result.data.poll_url,
      expires_at: result.data.expires_at,
    },
  };
}

export async function POST(req: NextRequest) {
  const bearerToken = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!bearerToken || !validateApiKey(bearerToken)) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32000, message: 'Unauthorized: valid API key required' } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { method, params, id } = body;

    switch (method) {
      case 'initialize':
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'meatspace', version: '0.1.0' },
          },
        });

      case 'tools/list':
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: { tools: TOOLS },
        });

      case 'tools/call': {
        if (params === null || typeof params !== 'object') {
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Invalid params' },
          });
        }
        const { name, arguments: args } = params;
        if (args !== undefined && args !== null && typeof args !== 'object') {
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Invalid params' },
          });
        }
        if (!['ask_human', 'get_service_status'].includes(name)) {
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: `Unknown tool: ${name}` },
          });
        }

        const result = name === 'get_service_status'
          ? await handleGetServiceStatus()
          : await handleAskHuman(args || {});

        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result.payload, null, 2) }],
            structuredContent: result.payload,
            isError: result.isError,
          },
        });
      }

      default:
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method '${method}' not found` },
        });
    }
  } catch (err) {
    console.error('MCP error:', err);
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' } },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
