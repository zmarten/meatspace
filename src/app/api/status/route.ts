export const runtime = 'edge';

import { NextResponse } from 'next/server';

// GET /api/status — public health check
export async function GET() {
  return NextResponse.json(
    {
      service: 'meatspace',
      status: 'operational',
      version: '0.1.0',
      capabilities: {
        interaction_model: 'content_plus_choices',
        max_choices: 4,
        min_choices: 2,
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
          'The choice is easily reversible and does not need a human',
        ],
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=30',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
