export const runtime = 'edge';

import { NextResponse } from 'next/server';

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'MeatSpace API',
    version: '0.1.0',
    description:
      'Flesh-in-the-loop service. AI agents submit content plus 2-4 choices, humans choose, and agents receive a structured result. ' +
      'Browser SDK available at /sdk/meatspace.js. MCP endpoint supports unauthenticated discovery and key provisioning.',
    contact: { url: 'https://meatspace.run' },
  },
  servers: [{ url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' }],
  paths: {
    '/api/keys': {
      post: {
        operationId: 'createApiKey',
        summary: 'Create an API key (self-serve)',
        description: 'No authentication required. Creates an API key instantly. Max 5 active keys per email.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                  name: { type: 'string', maxLength: 100, description: 'Key name (e.g. your agent name)' },
                  email: { type: 'string', format: 'email', description: 'Owner email for confirmation' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'API key created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', const: true },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        key_prefix: { type: 'string' },
                        api_key: { type: 'string', description: 'Full API key — shown only once' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '429': { description: 'Too many active keys for this email, or too many requests from this IP' },
        },
      },
    },
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
        description: 'List all requests. Requires a valid admin session cookie.',
        security: [{ adminSession: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['pending', 'completed', 'expired', 'all'],
              default: 'pending',
            },
          },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          '200': { description: 'Request list' },
          '401': { description: 'Missing or invalid admin session' },
        },
      },
    },
    '/api/requests/{id}': {
      get: {
        operationId: 'pollRequest',
        summary: 'Poll request status',
        description:
          'Check whether the human has responded. Requires Bearer token or x-review-token header.',
        security: [{ bearerAuth: [] }],
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
          '401': { description: 'Missing or invalid Bearer token / review token' },
          '404': { description: 'Request not found' },
        },
      },
      patch: {
        operationId: 'submitResponse',
        summary: 'Submit human response',
        description: 'Called from the review page when a human selects a choice. Requires x-review-token.',
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
          '404': { description: 'Request not found or review token invalid' },
          '409': { description: 'Already completed' },
          '410': { description: 'Request expired' },
        },
      },
    },
    '/api/requests/{id}/wait': {
      get: {
        operationId: 'waitForResponse',
        summary: 'Long-poll for response',
        description: 'Block until the human responds or timeout. Requires Bearer token or x-review-token. Returns 202 if still pending.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'timeout', in: 'query', schema: { type: 'integer', default: 25000, maximum: 25000 } },
        ],
        responses: {
          '200': { description: 'Request completed or expired' },
          '202': { description: 'Still pending, retry' },
          '401': { description: 'Missing or invalid Bearer token / review token' },
          '404': { description: 'Request not found' },
        },
      },
    },
    '/api/review/{id}': {
      get: {
        operationId: 'getReviewRequest',
        summary: 'Fetch full request details for the human review page',
        description: 'Returns the full request payload when a valid x-review-token header is supplied.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Full review request payload' },
          '404': { description: 'Request not found or review token invalid' },
        },
      },
    },
    '/api/mcp': {
      get: {
        operationId: 'mcpServerInfo',
        summary: 'MCP server info (discovery)',
        description: 'Returns MCP server capabilities. No auth required.',
        responses: {
          '200': { description: 'Server info with protocol version and capabilities' },
        },
      },
      post: {
        operationId: 'mcpHandler',
        summary: 'MCP server endpoint',
        description: 'Model Context Protocol (JSON-RPC) endpoint. Tools: get_service_status (no auth), provision_api_key (no auth), ask_human (requires Bearer).',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' } } },
        },
        responses: {
          '200': { description: 'JSON-RPC response' },
          '401': { description: 'Missing or invalid Bearer token (only for ask_human)' },
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
      adminSession: { type: 'apiKey', in: 'cookie', name: 'hitl_admin_session' },
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
          callback_url: {
            type: 'string',
            format: 'uri',
            description: 'HTTPS webhook URL whose hostname is explicitly allowlisted by the operator',
          },
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
          review_url: {
            type: 'string',
            format: 'uri',
            description: 'Opaque human review URL that already includes the review token query parameter',
          },
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
