export const runtime = 'edge';

import { NextResponse } from 'next/server';

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'MeatSpace API',
    version: '0.1.0',
    description:
      'Flesh-in-the-loop service. AI agents submit content plus 2-4 choices, humans choose, and agents receive a structured result.',
    contact: { url: 'https://meatspace.app' },
  },
  servers: [{ url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' }],
  paths: {
    '/api/requests': {
      post: {
        operationId: 'createRequest',
        summary: 'Create a human decision request',
        description: 'Submit content and 2-4 choices for human review. Requires Bearer token.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateRequestBody' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Request created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', const: true },
                    data: { $ref: '#/components/schemas/CreateRequestResponse' },
                  },
                  required: ['success', 'data'],
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '401': { description: 'Missing or invalid Bearer token' },
        },
      },
      get: {
        operationId: 'listRequests',
        summary: 'List requests (admin)',
        description: 'List all requests. Requires x-admin-secret header.',
        security: [{ adminSecret: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['pending', 'completed', 'expired', 'all'], default: 'pending' },
          },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          '200': { description: 'Request list' },
          '401': { description: 'Missing or invalid admin secret' },
        },
      },
    },
    '/api/requests/{id}': {
      get: {
        operationId: 'pollRequest',
        summary: 'Poll request status',
        description: 'Check whether the human has responded. Returns only the minimal agent-facing status payload.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Request status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', const: true },
                    data: { $ref: '#/components/schemas/PollResponse' },
                  },
                  required: ['success', 'data'],
                },
              },
            },
          },
          '404': { description: 'Request not found' },
        },
      },
      patch: {
        operationId: 'submitResponse',
        summary: 'Submit human response',
        description: 'Called from the review page when a human selects a choice. No auth required.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SubmitResponseBody' },
            },
          },
        },
        responses: {
          '200': { description: 'Response submitted' },
          '400': { description: 'Invalid choice' },
          '404': { description: 'Request not found' },
          '409': { description: 'Already completed' },
          '410': { description: 'Request expired' },
        },
      },
    },
    '/api/requests/{id}/wait': {
      get: {
        operationId: 'waitForResponse',
        summary: 'Long-poll for response',
        description: 'Block until the human responds or timeout. Returns 202 if still pending.',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'timeout', in: 'query', schema: { type: 'integer', default: 25000, maximum: 25000 } },
        ],
        responses: {
          '200': { description: 'Request completed or expired' },
          '202': { description: 'Still pending, retry' },
          '404': { description: 'Request not found' },
        },
      },
    },
    '/api/review/{id}': {
      get: {
        operationId: 'getReviewRequest',
        summary: 'Fetch full request details for the human review page',
        description: 'Returns the full request payload, choices, and agent metadata for the magic-link review experience.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Full review request payload' },
          '404': { description: 'Request not found' },
        },
      },
    },
    '/api/mcp': {
      post: {
        operationId: 'mcpHandler',
        summary: 'MCP server endpoint',
        description: 'Model Context Protocol (JSON-RPC) endpoint. Tools: get_service_status, ask_human.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: {
          '200': { description: 'JSON-RPC response' },
          '401': { description: 'Missing or invalid Bearer token' },
        },
      },
    },
    '/api/status': {
      get: {
        operationId: 'getStatus',
        summary: 'Health and capability check',
        responses: {
          '200': { description: 'Service status and agent guidance' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer' },
      adminSecret: { type: 'apiKey', in: 'header', name: 'x-admin-secret' },
    },
    schemas: {
      Choice: {
        type: 'object',
        required: ['id', 'label'],
        properties: {
          id: { type: 'string', maxLength: 50 },
          label: { type: 'string', maxLength: 100 },
        },
      },
      CreateRequestBody: {
        type: 'object',
        required: ['agent_name', 'title', 'choices'],
        properties: {
          agent_name: { type: 'string', maxLength: 100 },
          title: { type: 'string', maxLength: 200 },
          content: { type: 'string', description: 'Content for human review (max 50KB)' },
          content_type: { type: 'string', enum: ['text', 'markdown', 'html', 'image'], default: 'text' },
          choices: { type: 'array', items: { $ref: '#/components/schemas/Choice' }, minItems: 2, maxItems: 4 },
          callback_url: { type: 'string', format: 'uri', description: 'Public HTTPS webhook URL' },
          metadata: { type: 'object', description: 'Passed through to webhook (max 10KB)' },
          decision_reason: { type: 'string', maxLength: 500 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          consequence_of_wrong_choice: { type: 'string', maxLength: 500 },
          recommended_option: { type: 'string', description: 'Must match one of the choice ids' },
          run_id: { type: 'string' },
          trace_id: { type: 'string' },
          timeout_seconds: { type: 'integer', default: 3600, maximum: 86400 },
        },
      },
      SubmitResponseBody: {
        type: 'object',
        required: ['selected_option'],
        properties: {
          selected_option: { type: 'string', description: 'Must match a choice id' },
        },
      },
      CreateRequestResponse: {
        type: 'object',
        required: ['id', 'status', 'review_url', 'poll_url', 'expires_at'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending'] },
          review_url: { type: 'string', format: 'uri' },
          poll_url: { type: 'string' },
          expires_at: { type: 'string', format: 'date-time' },
        },
      },
      PollResponse: {
        type: 'object',
        required: ['id', 'status', 'selected', 'selected_label', 'responded_at', 'expires_at'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'completed', 'expired'] },
          selected: { type: ['string', 'null'] },
          selected_label: { type: ['string', 'null'] },
          responded_at: { type: ['string', 'null'], format: 'date-time' },
          expires_at: { type: ['string', 'null'], format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['success', 'error', 'code'],
        properties: {
          success: { type: 'boolean', const: false },
          error: { type: 'string' },
          code: { type: 'string' },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
