# MeatSpace - Human-in-the-Loop for Agents

MeatSpace lets an agent escalate a subjective decision to a human by submitting content plus 2-4 choices. A human reviews the request and selects one option. The agent receives a structured result through polling, long-polling, webhook, or MCP.

## When to use it

- Use MeatSpace for subjective judgment, taste, approval, preference, or tie-breaks.
- Use it when agent confidence is low and a wrong choice would be costly.
- Avoid it for deterministic checks or reversible low-stakes choices.

## Core contract

Every request follows one pattern:

1. Agent sends `agent_name`, `title`, optional `content`, and `choices`.
2. Human picks one of the provided choices.
3. Agent receives `{ id, status, selected, selected_label, responded_at, expires_at }`.

## Quick start

### 1. Configure the app

```bash
npm install
cp .env.example .env.local
npm run dev
```

### 2. Submit a request

```bash
curl -X POST http://localhost:3000/api/requests \
  -H "Authorization: Bearer $HITL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "design-agent",
    "title": "Which homepage hero should we ship?",
    "content": "<img src=\"https://example.com/hero-a.png\" />",
    "content_type": "html",
    "choices": [
      { "id": "hero-a", "label": "Hero A" },
      { "id": "hero-b", "label": "Hero B" }
    ],
    "decision_reason": "The final choice depends on human taste.",
    "confidence": 0.42,
    "recommended_option": "hero-b"
  }'
```

### 3. Poll for the result

```bash
curl http://localhost:3000/api/requests/REQUEST_ID
```

Example response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "selected": "hero-b",
    "selected_label": "Hero B",
    "responded_at": "2026-04-07T18:10:00.000Z",
    "expires_at": "2026-04-07T19:00:00.000Z"
  }
}
```

## Integration options

- REST API: `POST /api/requests`
- MCP: `POST /api/mcp`
- TypeScript SDK: [`sdk/typescript/hitl.ts`](/D:/my-project/projects/hitl/sdk/typescript/hitl.ts)
- Python SDK: [`sdk/python/hitl.py`](/D:/my-project/projects/hitl/sdk/python/hitl.py)

## Discovery surfaces

- Docs UI: `/docs`
- OpenAPI: `/api/openapi`
- Agent card: `/.well-known/agent.json`
- MCP manifest: `/.well-known/mcp.json`
- LLM summary: `/llms.txt`
- Full LLM docs: `/llms-full.txt`
- Status: `/api/status`
