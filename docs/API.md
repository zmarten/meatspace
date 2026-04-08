# MeatSpace API Documentation

**Base URL**: `https://meatspace.app/api`

## Authentication

Agent-facing request creation and MCP access require:

```text
Authorization: Bearer YOUR_API_KEY
```

## Agent guidance

- Use MeatSpace for subjective judgment, taste, approval, preference, or tie-breaks.
- Use it when confidence is low and a wrong choice would be costly.
- Avoid it for deterministic checks or reversible low-stakes choices.
- Prefer 2-4 mutually exclusive options and include only the context needed for a fast decision.

## Endpoints

### 1. Create a request

**POST** `/api/requests`

#### Request body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_name` | string | Yes | Your agent or tool name |
| `title` | string | Yes | Short title shown to the human |
| `choices` | array | Yes | 2-4 objects with `id` and `label` |
| `content` | string | No | Content for human review |
| `content_type` | enum | No | `text`, `markdown`, `html`, `image` |
| `decision_reason` | string | No | Why the agent is escalating |
| `confidence` | number | No | Agent confidence between 0 and 1 |
| `consequence_of_wrong_choice` | string | No | Why a wrong choice matters |
| `recommended_option` | string | No | Optional choice id the agent recommends |
| `run_id` | string | No | Optional workflow run id |
| `trace_id` | string | No | Optional trace id |
| `callback_url` | string | No | Public HTTPS webhook URL |
| `metadata` | object | No | Arbitrary metadata echoed back in the webhook |
| `timeout_seconds` | integer | No | Expiry in seconds, max 86400 |

#### Example

```json
{
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
  "consequence_of_wrong_choice": "Choosing the weaker hero will hurt launch conversion.",
  "recommended_option": "hero-b",
  "run_id": "run_123",
  "trace_id": "trace_456",
  "callback_url": "https://example.com/webhooks/meatspace",
  "metadata": { "campaign": "spring-launch" },
  "timeout_seconds": 3600
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "review_url": "https://meatspace.app/review/uuid",
    "poll_url": "/api/requests/uuid",
    "expires_at": "2026-04-07T19:00:00.000Z"
  }
}
```

### 2. Poll for response

**GET** `/api/requests/{id}`

Returns a minimal status payload for agent polling.

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

### 3. Wait for response

**GET** `/api/requests/{id}/wait?timeout=30000`

Blocks until the human responds or timeout is reached. Returns HTTP `202` while still pending.

### 4. Webhook callback

If `callback_url` is set, MeatSpace POSTs:

```json
{
  "event": "request.completed",
  "request_id": "uuid",
  "selected": "hero-b",
  "selected_label": "Hero B",
  "responded_at": "2026-04-07T18:10:00.000Z",
  "expires_at": "2026-04-07T19:00:00.000Z",
  "metadata": { "campaign": "spring-launch" }
}
```

Headers:

- `X-HITL-Timestamp`
- `X-HITL-Signature`

### 5. MCP

**POST** `/api/mcp`

Tools:

- `get_service_status`
- `ask_human`

## Error format

Validation and lifecycle errors return:

```json
{
  "success": false,
  "error": "choices must be an array of 2-4 items",
  "code": "invalid_choice_count"
}
```
