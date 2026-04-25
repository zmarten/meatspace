# MeatSpace â€” Agent Integration Guide

MeatSpace is a human-in-the-loop service for AI agents. When your agent faces a subjective, high-stakes, or ambiguous decision, MeatSpace routes it to a human who selects one of 2-4 options and returns a structured result.

**Base URL:** `https://meatspace.run`

## Quick Start

### 1. Get an API key

Create one instantly — no signup or approval required:

```bash
curl -X POST https://meatspace.run/api/keys \
  -H "Content-Type: application/json" \
  -d '{"name": "my-agent", "email": "you@example.com"}'
```

The response includes your `api_key`. Save it — it's shown once. All other endpoints require `Authorization: Bearer <token>`.

### 2. Choose your integration

| Method | Endpoint | Best for |
|---|---|---|
| **MCP** | `POST /api/mcp` | Claude, Claude Code, MCP-compatible agents |
| **REST API** | `POST /api/requests` | Any HTTP client, custom agent frameworks |
| **OpenAPI** | `GET /api/openapi` | Auto-generated SDK clients |

### 3. Ask a human

```bash
curl -X POST https://meatspace.run/api/requests \
  -H "Authorization: Bearer $MEATSPACE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "my-agent",
    "title": "Which approach should I take?",
    "choices": [
      { "id": "a", "label": "Option A" },
      { "id": "b", "label": "Option B" }
    ]
  }'
```

### 4. Get the result

Poll `GET /api/requests/{id}` or use long-poll at `GET /api/requests/{id}/wait?timeout=25000`.

---

## When to Use MeatSpace

**Use it when:**
- The decision requires subjective human judgment or taste
- A human approval, preference, or tie-break is needed
- Your agent has low confidence and a wrong choice would be costly

**Don't use it when:**
- The task is deterministic or can be validated automatically
- The choice is easily reversible and low stakes

---

## MCP Integration

MeatSpace implements MCP (Model Context Protocol) with Streamable HTTP transport.

**Discovery:** `GET /.well-known/mcp.json`

**Tools:**
- `get_service_status` â€” Check availability and get escalation guidance
- `ask_human` â€” Submit a decision to a human reviewer

### Claude Code Configuration

Add to your MCP settings:

```json
{
  "mcpServers": {
    "meatspace": {
      "type": "url",
      "url": "https://meatspace.run/api/mcp",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

### MCP Example

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "ask_human",
    "arguments": {
      "agent_name": "deploy-bot",
      "title": "Ship v2.0 to production?",
      "content": "All tests pass. Staging looks good. 2 minor warnings in lint.",
      "content_type": "text",
      "choices": [
        { "id": "ship", "label": "Ship it" },
        { "id": "wait", "label": "Wait for next cycle" }
      ],
      "confidence": 0.7,
      "consequence_of_wrong_choice": "Shipping prematurely could affect 50k users"
    }
  }
}
```

The tool long-polls for up to 20 seconds. If the human hasn't responded, it returns `status: "pending"` with a `review_url` and `poll_url`.

---

## REST API

### Create a request

`POST /api/requests`

**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

**Required fields:**
- `agent_name` (string, max 100) â€” Your agent's name
- `title` (string, max 200) â€” What the human is deciding
- `choices` (array, 2-4 items) â€” Each with `id` (max 50) and `label` (max 100)

**Optional fields:**
- `content` (string, max 50KB) â€” Review material for the human
- `content_type` â€” `text` (default), `markdown`, `html`, or `image`
- `decision_reason` (max 500) â€” Why you're escalating
- `confidence` (0-1) â€” Your confidence level
- `consequence_of_wrong_choice` (max 500) â€” Stakes of a bad pick
- `recommended_option` â€” Choice `id` you'd recommend
- `callback_url` â€” Allowlisted HTTPS webhook for async notification
- `metadata` â€” Arbitrary JSON passed through to webhook
- `run_id`, `trace_id` â€” For workflow tracing
- `timeout_seconds` (default 3600, max 86400) â€” When the request expires

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "review_url": "https://meatspace.run/review/uuid?token=opaque-review-token",
    "poll_url": "/api/requests/uuid",
    "expires_at": "2026-04-23T19:00:00.000Z"
  }
}
```

### Poll for result

`GET /api/requests/{id}`

```json
{
  "success": true,
  "data": {
    "status": "completed",
    "selected": "ship",
    "selected_label": "Ship it",
    "responded_at": "2026-04-23T18:10:00.000Z"
  }
}
```

### Long-poll

`GET /api/requests/{id}/wait?timeout=25000`

Holds the connection open until the human responds or the timeout is reached. Returns `202` while still pending.

### Webhook

If `callback_url` is set, MeatSpace POSTs the result when the human responds:

```json
{
  "event": "request.completed",
  "request_id": "uuid",
  "selected": "ship",
  "selected_label": "Ship it",
  "responded_at": "2026-04-23T18:10:00.000Z",
  "metadata": {}
}
```

`callback_url` must be an `https://` URL whose hostname is explicitly allowlisted by the operator.

Signed with `X-HITL-Timestamp` and `X-HITL-Signature` headers.

---

## Discovery Endpoints

| Path | Format | Purpose |
|---|---|---|
| `/.well-known/mcp.json` | JSON | MCP server manifest |
| `/.well-known/agent.json` | JSON | Agent capability card |
| `/api/openapi` | JSON | OpenAPI 3.1 spec |
| `/api/status` | JSON | Health check + agent guidance |
| `/llms.txt` | Text | LLM-readable summary |
| `/llms-full.txt` | Text | Full API documentation |
| `/agents.md` | Markdown | This file |
| `/robots.txt` | Text | Crawler directives + discovery pointers |

---

## Error Handling

All errors return:

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "machine_readable_code"
}
```

Common codes: `agent_name_required`, `invalid_choice_count`, `content_too_large`, `callback_url_not_allowed`, `request_create_failed`.

---

## Best Practices

1. **Be specific in your title.** "Which deploy strategy?" beats "Help me decide."
2. **Include context in content.** Give the human what they need to decide quickly.
3. **Use `decision_reason`** to explain why you're escalating â€” it's shown to the reviewer.
4. **Set `confidence`** so the human knows how uncertain you are.
5. **Use `recommended_option`** when you have a lean â€” the reviewer sees it as a suggestion.
6. **Keep choices to 2-3** when possible. Four max.
7. **Set a reasonable timeout.** Default is 1 hour. Don't set 24h unless the decision can genuinely wait.
8. **Use webhooks for async flows.** Don't long-poll if your agent can continue other work.
