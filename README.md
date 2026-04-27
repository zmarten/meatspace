# MeatSpace

Human-in-the-loop service for AI agents. When an agent hits a subjective, high-stakes, or ambiguous decision, MeatSpace routes it to a human who picks one of 2–4 options and returns a structured result.

**Live at [meatspace.run](https://meatspace.run)**

## What it does

An agent posts a title, optional content (text, markdown, HTML, or an image), and 2–4 labeled choices. A human reviewer is shown the request, picks one, and the API returns the selected `id` and `label`. The agent waits via long-poll or webhook.

Typical use cases:

- Approval gates before destructive or irreversible actions (deploys, deletes, payments).
- Subjective tie-breaks where the model is below its confidence threshold.
- Tasteful judgment calls — copy choices, design preferences, ranking ties.
- Escalation when an agent has run out of deterministic checks.

Don't use it when the task is deterministic, automatically verifiable, or low-stakes and easily reversible.

## Three integration methods

| Method | Endpoint | Best for |
|---|---|---|
| **REST API** | `POST /api/requests` | Any HTTP client, custom agent frameworks, server-to-server. |
| **MCP** | `POST /api/mcp` (Streamable HTTP) | Claude, Claude Code, MCP-compatible clients. |
| **Browser SDK** | [`/sdk/meatspace.js`](public/sdk/meatspace.js) | Agents running in a browser tab. |

All three sit on the same backing API and accept the same Bearer token.

## Zero-setup self-service flow

A new agent can fully onboard itself in three calls — no signup page, no approval queue, no human in the setup loop:

1. `POST /api/keys` with `{"name": "your-agent", "email": "owner@example.com"}` → returns an API key instantly. Rate-limited to 5 keys per email.
2. `POST /api/requests` with the Bearer token, your title, and choices → creates the review request.
3. `GET /api/requests/{id}/wait` → blocks until the human responds, or times out and returns `pending` with a `review_url` and `poll_url`.

The same flow is available over MCP: `initialize` → `tools/list` → `provision_api_key` → `ask_human`. The `provision_api_key` and `get_service_status` tools require no auth, so a fresh MCP client can connect without credentials and bootstrap itself.

## REST quickstart

Provision a key:

```bash
curl -X POST https://meatspace.run/api/keys \
  -H "Content-Type: application/json" \
  -d '{"name": "my-agent", "email": "you@example.com"}'
```

The response includes `api_key` — shown once, save it. All subsequent calls use `Authorization: Bearer <token>`.

Create a request:

```bash
curl -X POST https://meatspace.run/api/requests \
  -H "Authorization: Bearer $MEATSPACE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "my-agent",
    "title": "Ship v2.0 to production?",
    "content": "All tests pass. Staging looks good. 2 minor lint warnings.",
    "choices": [
      { "id": "ship", "label": "Ship it" },
      { "id": "wait", "label": "Wait for next cycle" }
    ],
    "confidence": 0.7,
    "consequence_of_wrong_choice": "Premature ship affects ~50k users"
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

Long-poll for the result:

```bash
curl https://meatspace.run/api/requests/{id}/wait?timeout=25000 \
  -H "Authorization: Bearer $MEATSPACE_API_KEY"
```

Returns `{ status: "completed", selected, selected_label, responded_at }` when the human responds, or `202` if still pending.

Optional fields on `POST /api/requests`: `content_type` (`text` default, `markdown`, `html`, `image`), `decision_reason`, `confidence` (0–1), `consequence_of_wrong_choice`, `recommended_option`, `callback_url` (must be HTTPS and host-allowlisted), `metadata` (passed through to the webhook), `run_id`, `trace_id`, `timeout_seconds` (default 3600, max 86400).

## MCP

MeatSpace implements MCP over Streamable HTTP at `https://meatspace.run/api/mcp`. The server exposes three tools:

- `get_service_status` — availability and escalation guidance. No auth.
- `provision_api_key` — mint a Bearer token. No auth, rate-limited.
- `ask_human` — submit a decision. Requires Bearer auth.

Claude Code config:

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

`ask_human` long-polls for up to 20 seconds. If the human hasn't responded by then, the tool returns `status: "pending"` with a `review_url` (for the human) and a `poll_url` (for the agent).

## Browser SDK

For agents running in browser contexts:

```html
<script type="module">
  import { MeatSpace } from 'https://meatspace.run/sdk/meatspace.js';

  const ms = new MeatSpace();
  await ms.getKey({ name: 'browser-agent', email: 'agent@example.com' });

  const result = await ms.ask({
    agentName: 'browser-agent',
    title: 'Which option?',
    choices: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ],
  });
  console.log(result.selected);
</script>
```

Methods: `getKey()`, `createRequest()`, `pollResult()`, `waitForResult()`, `ask()` (create + wait).

## Webhooks

If `callback_url` is set on the request, MeatSpace POSTs the result when the human responds:

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

`callback_url` must be `https://` and the hostname must be explicitly allowlisted by the operator. If no allowlist is configured, request creation rejects callback URLs. Each delivery is signed with `X-HITL-Timestamp` and `X-HITL-Signature` headers.

## Discovery endpoints

| Path | Format | Purpose |
|---|---|---|
| `/.well-known/mcp.json` | JSON | MCP server manifest |
| `/.well-known/agent.json` | JSON | A2A Agent Card |
| `/api/openapi` | JSON | OpenAPI 3.1 spec |
| `/api/mcp` (GET) | JSON | MCP server info, no auth |
| `/api/status` | JSON | Health check + agent guidance |
| `/sdk/meatspace.js` | JavaScript | Browser SDK |
| `/llms.txt` | Text | LLM-readable summary |
| `/llms-full.txt` | Text | Full API documentation |
| `/agents.md` | Markdown | Full integration guide |
| `/sitemap.xml` | XML | Sitemap |
| `/robots.txt` | Text | Crawler directives + discovery pointers |

## Errors

All errors return:

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "machine_readable_code"
}
```

Common codes: `agent_name_required`, `invalid_choice_count`, `content_too_large`, `callback_url_not_allowed`, `request_create_failed`.

## Local development

This repo is a Next.js 14 app deployed on Cloudflare Pages.

```bash
npm install
npm run dev          # local dev at http://localhost:3000
npm run test         # integration tests
npm run build:cf     # build for Cloudflare Pages
npm run deploy:cf    # build and deploy
```

Supabase is the system of record for keys and requests; Resend handles transactional email.

## License

MIT
