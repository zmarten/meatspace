# HITL — Human-in-the-Loop Service

**Your taste. Your judgment. On demand for any AI agent.**

HITL is a REST API + dashboard that lets AI agents pause and ask a human (you) for approval, opinions, choices, and ratings before continuing. Agents submit requests, you review them in a real-time dashboard, and agents get your response via webhook or polling.

## Architecture

```
┌─────────────┐     POST /api/requests     ┌──────────────┐     Realtime     ┌───────────────┐
│   AI Agent   │ ──────────────────────────▶│  Vercel API  │ ──────────────▶ │   Dashboard   │
│ (any framework)│                          │   Routes     │                 │  (React app)  │
└─────────────┘                             └──────┬───────┘                 └───────┬───────┘
       ▲                                           │                                 │
       │         GET /api/requests/{id}/wait       │         PATCH /api/requests/{id} │
       │◀──────────────────────────────────────────│◀────────────────────────────────┘
       │         (long-poll or webhook)            │
       │                                     ┌─────┴──────┐
       └─────────────────────────────────────│  Supabase   │
                                             │  (Postgres) │
                                             └─────────────┘
```

## Request Types

| Type | What the human does | Agent gets back |
|------|-------------------|-----------------|
| `approve_reject` | Thumbs up/down + optional reasoning | `{decision, reasoning}` |
| `choose_option` | Pick from agent-provided options | `{selected_option, reasoning}` |
| `free_text` | Type whatever they want | `{text}` |
| `rate` | 1-5 stars + optional reasoning | `{rating, reasoning}` |
| `rank` | Order options by preference | `{ranking, reasoning}` |

## Quick Start

### 1. Set up Supabase

1. Create a new Supabase project
2. Run the migration in `supabase/migrations/001_create_hitl_tables.sql`
3. Copy your project URL, anon key, and service role key

### 2. Deploy to Vercel

```bash
cd hitl
npm install
cp .env.example .env.local  # fill in your Supabase keys
npm run dev
```

### 3. Create an API key

```bash
curl -X POST http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -d '{"name": "My First Agent", "agent_name": "test-agent"}'
```

Save the returned `key` — it's only shown once.

### 4. Submit your first request

```bash
curl -X POST http://localhost:3000/api/requests \
  -H "Authorization: Bearer hitl_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_name": "test-agent",
    "request_type": "approve_reject",
    "title": "Should I ship this feature?",
    "description": "The new onboarding flow is ready for review."
  }'
```

### 5. Open the dashboard and respond

Visit `http://localhost:3000` — you'll see the request in your queue.

## Python SDK

```python
from hitl import HitlClient

client = HitlClient(
    api_key="hitl_xxxxx",
    base_url="https://your-app.vercel.app"
)

# Blocks until you respond in the dashboard
result = client.approve_or_reject(
    title="Publish this post?",
    agent_name="content-writer",
)

if result.decision == "approved":
    publish()
```

See `sdk/python/hitl.py` for the full SDK.

## API Docs

Full documentation in `docs/API.md`.

## Roadmap

- [ ] Supabase Auth for dashboard login
- [ ] Push notifications (Pushover / mobile push)
- [ ] MCP server wrapper (for Claude Code and other MCP-native agents)
- [ ] Multi-reviewer support (marketplace mode)
- [ ] Request templates and auto-categorization
- [ ] Analytics dashboard with response time trends
- [ ] Rate limiting middleware
- [ ] TypeScript SDK

## Stack

- **API**: Next.js API routes on Vercel
- **Database**: Supabase (Postgres + Realtime)
- **Dashboard**: React (Next.js)
- **Agent SDK**: Python (requests library)
