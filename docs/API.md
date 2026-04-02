# HITL API Documentation

**Base URL**: `https://your-domain.vercel.app/api`

## Authentication

All agent-facing endpoints require a Bearer token:

```
Authorization: Bearer hitl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Get your API key from the dashboard under **Settings > API Keys**.

---

## Endpoints

### 1. Create a Request

**POST** `/api/requests`

Submit a new human-in-the-loop request.

#### Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `agent_name` | string | ✅ | — | Your agent's name |
| `request_type` | enum | ✅ | — | `approve_reject`, `choose_option`, `free_text`, `rate`, `rank` |
| `title` | string | ✅ | — | Short title shown to the human |
| `description` | string | — | — | Detailed context |
| `agent_context` | string | — | — | What your agent is doing (shown to reviewer) |
| `payload` | object | — | `{}` | Arbitrary data to display |
| `options` | array | ✅* | `[]` | Required for `choose_option` and `rank`. Array of `{id, label, description}` |
| `priority` | enum | — | `normal` | `low`, `normal`, `high`, `critical` |
| `tags` | string[] | — | `[]` | Tags for filtering |
| `category` | string | — | — | Category label |
| `callback_method` | enum | — | `poll` | `poll` or `webhook` |
| `callback_url` | string | ✅** | — | **Required if `callback_method` is `webhook`** |
| `timeout_seconds` | integer | — | `3600` | Auto-expire after this many seconds |

#### Example: Approve/Reject

```bash
curl -X POST https://your-domain.vercel.app/api/requests \
  -H "Authorization: Bearer hitl_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "content-writer",
    "request_type": "approve_reject",
    "title": "Publish blog post: AI Trends 2026?",
    "description": "Draft is 1,200 words covering transformer architecture evolution...",
    "priority": "high",
    "agent_context": "Writing pipeline ready to publish to WordPress"
  }'
```

#### Example: Choose Option

```bash
curl -X POST https://your-domain.vercel.app/api/requests \
  -H "Authorization: Bearer hitl_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "design-agent",
    "request_type": "choose_option",
    "title": "Pick a color palette for the landing page",
    "options": [
      {"id": "warm", "label": "Warm Sunset", "description": "Orange, coral, cream"},
      {"id": "cool", "label": "Cool Nordic", "description": "Slate, ice blue, white"},
      {"id": "bold", "label": "Bold Contrast", "description": "Black, electric yellow, white"}
    ]
  }'
```

#### Example: Free Text

```bash
curl -X POST https://your-domain.vercel.app/api/requests \
  -H "Authorization: Bearer hitl_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "research-agent",
    "request_type": "free_text",
    "title": "What angle should this market analysis take?",
    "description": "Researching Montana real estate trends. Need your opinion on framing.",
    "agent_context": "Building a competitive analysis report for Q3 review"
  }'
```

#### Response

```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "status": "pending",
    "expires_at": "2026-04-02T12:00:00Z",
    "poll_url": "/api/requests/uuid-here"
  }
}
```

---

### 2. Poll for Response (Async)

**GET** `/api/requests/{id}`

Check if the human has responded.

```bash
curl https://your-domain.vercel.app/api/requests/{id} \
  -H "Authorization: Bearer hitl_xxxxx"
```

#### Response (Pending)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "response": null
  }
}
```

#### Response (Completed)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "response": {
      "decision": "approved",
      "reasoning": "Looks good, but tone down the intro paragraph."
    },
    "responded_at": "2026-04-01T15:30:00Z"
  }
}
```

---

### 3. Wait for Response (Synchronous / Long-Poll)

**GET** `/api/requests/{id}/wait?timeout=30000`

Block until the human responds or timeout is reached. Agent keeps calling this in a loop.

| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `timeout` | integer (ms) | 30000 | 55000 | How long to wait before returning |

```bash
# Agent loop pattern:
while true; do
  RESULT=$(curl -s "https://your-domain.vercel.app/api/requests/{id}/wait?timeout=30000" \
    -H "Authorization: Bearer hitl_xxxxx")
  STATUS=$(echo $RESULT | jq -r '.data.status')
  if [ "$STATUS" != "pending" ]; then
    echo "Got response: $RESULT"
    break
  fi
done
```

---

### 4. Webhook Callback

If `callback_method` is `webhook`, we'll POST to your `callback_url` when the human responds:

```json
{
  "event": "request.completed",
  "request_id": "uuid",
  "response": {
    "decision": "approved",
    "reasoning": "Ship it."
  },
  "responded_at": "2026-04-01T15:30:00Z"
}
```

---

## Response Shapes by Request Type

| Type | Response Fields |
|------|----------------|
| `approve_reject` | `decision` ("approved" / "rejected"), optional `reasoning` |
| `choose_option` | `selected_option` (option id), optional `reasoning` |
| `free_text` | `text` |
| `rate` | `rating` (1-5), optional `reasoning` |
| `rank` | `ranking` (ordered array of option ids), optional `reasoning` |

---

## Rate Limits

- 30 requests per minute per API key (configurable)
- Long-poll connections limited to 55 seconds (Vercel edge limit)

## Error Codes

| Status | Meaning |
|--------|---------|
| 401 | Invalid or missing API key |
| 400 | Bad request / validation error |
| 404 | Request not found |
| 409 | Request already completed |
| 410 | Request expired |
| 500 | Server error |
