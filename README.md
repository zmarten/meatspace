# MeatSpace

**Human-in-the-loop for AI agents.** When your agent faces a subjective, high-stakes, or ambiguous decision, MeatSpace routes it to a human who picks one of 2-4 options and returns a structured result.

**Live at [meatspace.run](https://meatspace.run)**

## Why

Agents are great at deterministic tasks. They're bad at taste, judgment, and "it depends." MeatSpace gives agents a single API call to pause, ask a human, and continue with a real answer â€” not a hallucinated guess.

## How it works

1. Agent sends a title, optional content, and 2-4 choices
2. Human gets an email with a one-click review link that already contains its opaque review token
3. Human picks an option
4. Agent receives `{ selected, selected_label, responded_at }`

## Integration options

| Method | Endpoint | Best for |
|---|---|---|
| **MCP** | `POST /api/mcp` | Claude, Claude Code, MCP-compatible agents |
| **REST API** | `POST /api/requests` | Any HTTP client, custom frameworks |
| **TypeScript SDK** | [`sdk/typescript`](sdk/typescript/hitl.ts) | Node.js / Deno agents |
| **Python SDK** | [`sdk/python`](sdk/python/hitl.py) | Python agents |
| **OpenAPI** | `GET /api/openapi` | Auto-generated clients |

## Quick start

```bash
curl -X POST https://meatspace.run/api/requests \
  -H "Authorization: Bearer $MEATSPACE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "my-agent",
    "title": "Which approach should we take?",
    "choices": [
      { "id": "a", "label": "Option A" },
      { "id": "b", "label": "Option B" }
    ]
  }'
```

Response:

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

Poll for the result:

```bash
curl https://meatspace.run/api/requests/REQUEST_ID
```

## Webhook policy

`callback_url` must be an `https://` URL whose hostname is explicitly allowlisted by the MeatSpace operator. If no allowlist is configured, request creation rejects callback URLs.

## MCP (Claude Code)

Add to your MCP config:

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

Your agent gets two tools: `get_service_status` and `ask_human`.

## When to use it

- The decision requires subjective human judgment or taste
- A human approval, preference, or tie-break is needed
- Agent confidence is low and a wrong choice would be costly

## When NOT to use it

- The task is deterministic or can be validated automatically
- The choice is easily reversible and low stakes

## Agent discovery

| Path | Purpose |
|---|---|
| `/.well-known/mcp.json` | MCP server manifest |
| `/.well-known/agent.json` | Agent capability card |
| `/agents.md` | Full integration guide |
| `/llms.txt` | LLM-readable summary |
| `/llms-full.txt` | Complete API docs |
| `/api/openapi` | OpenAPI 3.1 spec |
| `/api/status` | Health + agent guidance |

## Stack

Next.js 14, TypeScript, Supabase, Cloudflare Pages

## License

MIT
