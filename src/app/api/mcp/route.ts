import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { validateApiKey } from '@/lib/auth';
import { getServiceStatus, checkCapacity, getEffortTier } from '@/lib/capacity';
import { checkPayment } from '@/lib/payments';
import { createHitlRequest } from '@/lib/requests';

/**
 * MCP Server Route Handler
 * 
 * Implements the Model Context Protocol over HTTP.
 * Agents using MCP (Claude Code, Cursor, etc.) connect to this endpoint
 * and call tools like ask_human_approval, ask_human_opinion, etc.
 */

// Tool definitions matching the manifest
const TOOLS = [
  {
    name: 'check_hitl_status',
    description: 'Check if the human reviewer is currently available, see pricing, queue depth, and operating hours.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'ask_human_approval',
    description: 'Ask the human to approve or reject something. Binary yes/no. $0.05 USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'What needs approval (max 100 chars)' },
        description: { type: 'string', description: 'Context and details (max 500 chars)' },
        agent_context: { type: 'string', description: 'What your agent is doing' },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'] },
      },
      required: ['title'],
    },
  },
  {
    name: 'ask_human_choice',
    description: 'Ask the human to choose between 2-6 options. $0.10 USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['id', 'label'],
          },
          minItems: 2,
          maxItems: 6,
        },
        agent_context: { type: 'string' },
      },
      required: ['title', 'options'],
    },
  },
  {
    name: 'ask_human_opinion',
    description: 'Ask for free-text opinion, taste, or strategic input. $0.25 USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string', description: 'Full context (max 2000 chars)' },
        agent_context: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    name: 'ask_human_rating',
    description: 'Ask the human to rate something 1-5 stars. $0.05 USDC.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    name: 'vote_expertise',
    description: 'Vote for an expertise area or propose a new one.',
    inputSchema: {
      type: 'object',
      properties: {
        category_slug: { type: 'string' },
        proposed_name: { type: 'string' },
        proposed_description: { type: 'string' },
        use_case: { type: 'string' },
        willingness_to_pay: { type: 'number' },
      },
    },
  },
];

// Map MCP tool names to request types
const TOOL_TO_REQUEST_TYPE: Record<string, string> = {
  ask_human_approval: 'approve_reject',
  ask_human_choice: 'choose_option',
  ask_human_opinion: 'free_text',
  ask_human_rating: 'rate',
};

async function handleToolCall(toolName: string, args: Record<string, any>) {
  // Status check
  if (toolName === 'check_hitl_status') {
    return await getServiceStatus();
  }

  // Vote for expertise
  if (toolName === 'vote_expertise') {
    const supabase = createServiceClient();

    if (args.category_slug) {
      const { data: category } = await supabase
        .from('hitl_expertise_categories')
        .select('id')
        .eq('slug', args.category_slug)
        .single();

      if (!category) return { error: `Category '${args.category_slug}' not found` };

      await supabase.from('hitl_expertise_votes').upsert(
        {
          category_id: category.id,
          agent_name: args.agent_name || 'mcp-agent',
          use_case: args.use_case,
          willingness_to_pay: args.willingness_to_pay,
        },
        { onConflict: 'category_id,agent_name' }
      );

      return { success: true, message: `Vote recorded for '${args.category_slug}'` };
    }

    if (args.proposed_name) {
      await supabase.from('hitl_expertise_proposals').insert({
        agent_name: args.agent_name || 'mcp-agent',
        proposed_name: args.proposed_name,
        proposed_description: args.proposed_description,
        use_case: args.use_case,
        willingness_to_pay: args.willingness_to_pay,
      });

      return { success: true, message: `Proposed '${args.proposed_name}'` };
    }

    return { error: 'Provide category_slug or proposed_name' };
  }

  // HITL request tools
  const requestType = TOOL_TO_REQUEST_TYPE[toolName];
  if (!requestType) return { error: `Unknown tool: ${toolName}` };

  const effortTier = getEffortTier(requestType);

  // Check capacity
  const capacity = await checkCapacity(effortTier);
  if (!capacity.is_open) {
    return {
      error: 'service_unavailable',
      message: capacity.reason,
      opens_at: capacity.opens_at,
    };
  }

  // Create request (MCP requests use api_key auth, no x402 in MCP flow)
  const result = await createHitlRequest({
    body: {
      agent_name: args.agent_name || 'mcp-agent',
      agent_context: args.agent_context,
      request_type: requestType as any,
      title: args.title,
      description: args.description,
      options: args.options || [],
      priority: args.priority || 'normal',
      tags: ['mcp'],
      callback_method: 'poll',
      timeout_seconds: 3600,
    },
    paymentMethod: 'mcp',
  });

  if ('error' in result) return { error: result.error };
  const data = result.data;

  const supabase = createServiceClient();

  // Long-poll for response (block up to 50 seconds for MCP)
  const deadline = Date.now() + 50000;
  while (Date.now() < deadline) {
    const { data: check } = await supabase
      .from('hitl_requests')
      .select('status, response, responded_at')
      .eq('id', data.id)
      .single();

    if (check && ['completed', 'expired', 'cancelled'].includes(check.status)) {
      return {
        request_id: data.id,
        status: check.status,
        response: check.response,
        responded_at: check.responded_at,
      };
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Timed out waiting — return pending with poll URL
  return {
    request_id: data.id,
    status: 'pending',
    message: 'Human has not yet responded. Poll /api/requests/' + data.id + ' for updates.',
    estimated_response_seconds: capacity.estimated_response_seconds[effortTier as keyof typeof capacity.estimated_response_seconds],
  };
}

// MCP protocol handler
export async function POST(req: NextRequest) {
  // Require API key authentication
  const auth = await validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32000, message: auth.error || 'Unauthorized: valid API key required' } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { method, params, id } = body;

    // JSON-RPC style MCP messages
    switch (method) {
      case 'initialize':
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: {
              name: 'hitl',
              version: '1.0.0',
            },
          },
        });

      case 'tools/list':
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: { tools: TOOLS },
        });

      case 'tools/call': {
        const { name, arguments: args } = params;
        const result = await handleToolCall(name, args || {});
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              { type: 'text', text: JSON.stringify(result, null, 2) },
            ],
          },
        });
      }

      case 'resources/list':
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            resources: [
              {
                uri: 'hitl://docs',
                name: 'HITL Documentation',
                description: 'Full API documentation',
                mimeType: 'text/plain',
              },
            ],
          },
        });

      case 'resources/read':
        if (params?.uri === 'hitl://docs') {
          const response = await fetch(new URL('/llms-full.txt', req.url));
          const text = await response.text();
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              contents: [{ uri: 'hitl://docs', mimeType: 'text/plain', text }],
            },
          });
        }
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: 'Resource not found' },
        });

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

// Allow CORS for MCP clients
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
