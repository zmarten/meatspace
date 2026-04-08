# MeatSpace — HITL Service for AI Agents

## What this is
A Flesh-in-the-Loop (FITL) REST API where AI agents submit structured choice requests (content + up to 4 options), a human reviews on mobile/desktop, and agents get the selection back via polling or webhook. Branded as MeatSpace — a B2A platform where agents are customers and humans are "Flesh Nodes."

## MVP Scope (current branch: `mvp`)
- **Single request type**: content (HTML/image/text/markdown) + 2-4 choices
- **Notification**: email (Resend) and/or SMS (Twilio) when a request arrives
- **Review page**: mobile-first `/review/[id]` — human opens link from notification, taps a choice
- **Dashboard**: `/dashboard` — admin view of all requests
- **Landing page**: `/` — public marketing page with MeatSpace brand
- **Docs**: `/docs` — API documentation
- **Terms**: `/terms` — terms of use
- **MCP**: single `ask_human` tool at `/api/mcp`
- **OpenAPI**: spec served at `/api/openapi`
- **No payments**, no response time SLAs, no marketplace

## Stack
- **Next.js 14** (App Router) on Vercel
- **Supabase** (Postgres) — or mock mode for local dev
- **Tailwind CSS** with `hitl-*` design tokens (amber accent `#e8a020`, IBM Plex Sans)
- **Resend** for email notifications
- **Twilio** for SMS notifications (raw fetch, no SDK)

## Key directories
```
src/
  app/
    api/
      mcp/              — MCP JSON-RPC endpoint (single tool: ask_human)
      openapi/          — GET OpenAPI 3.1 spec [TODO]
      requests/         — POST create, GET list
        [id]/           — GET poll, PATCH submit response
          wait/         — GET long-poll
      status/           — GET health check
    dashboard/          — Admin dashboard [TODO]
    docs/               — API documentation [TODO]
    review/[id]/        — Mobile review page [TODO]
    terms/              — Terms of use [TODO]
    page.tsx            — Landing page (marketing)
  hooks/
    useHitl.ts          — useRequests, submitResponse hooks
  lib/
    auth.ts             — API key validation, SSRF checker
    mock-store.ts       — In-memory mock store for local dev
    notifications.ts    — Email + SMS notifications [TODO]
    requests.ts         — Shared request-creation service
    supabase.ts         — Supabase client (auto-switches to mock)
    supabase-mock.ts    — Mock Supabase query builder
    webhooks.ts         — HMAC-signed webhook delivery
  middleware.ts         — Auth middleware
  types.ts              — All shared TypeScript types
docs/
  meatspace-brand.md    — Full brand identity guidelines
sdk/
  python/hitl.py        — Python SDK (needs MVP simplification)
  typescript/hitl.ts    — TypeScript SDK (needs MVP simplification)
public/
  llms.txt              — LLM-discoverable service description [TODO: update]
```

## Auth model (MVP)
- **Agent → POST /api/requests**: Bearer token validated against `HITL_API_KEY` env var
- **Human → /review/[id]**: No auth — UUID is the credential (magic link from notification)
- **Admin → /dashboard**: `x-admin-secret` header on GET /api/requests (list)
- **MCP → /api/mcp**: No auth (local tool)

## Data flow (MVP)
1. Agent POSTs to `/api/requests` with Bearer token, content + choices
2. Request validated, inserted into DB
3. Notification sent (email/SMS) with link to `/review/{id}`
4. Human opens link on phone, sees content, taps a choice
5. PATCH `/api/requests/{id}` with `{ selected_option }` (no auth, UUID is credential)
6. If webhook configured: HMAC-signed delivery
7. Agent polls GET `/api/requests/{id}` or `/api/requests/{id}/wait` (long-poll)

## Local development
Set `USE_MOCK=true` in `.env.local`. Mock store pre-seeds sample requests. Run `npm run dev` → http://localhost:3000

## Type system (simplified for MVP)
```typescript
type RequestStatus = 'pending' | 'completed' | 'expired';
type ContentType = 'html' | 'image' | 'text' | 'markdown';
interface Choice { id: string; label: string; }
interface HitlRequest {
  id, agent_name, title, content, content_type, choices,
  callback_url, metadata, status, selected, responded_at,
  expires_at, created_at, updated_at
}
```

## Brand
- **Name**: MeatSpace
- **Voice**: Sterile, clinical, transactional. Humans are "Flesh Nodes" / "Wetware"
- **Design**: Dark theme, amber accent (#e8a020), IBM Plex Sans + JetBrains Mono
- **Full brand guidelines**: `docs/meatspace-brand.md`
- **Design spec**: `MEATSPACE_DESIGN_SPEC.md`

## Implementation status
### Done (Phase 0)
- [x] types.ts rewritten for MVP (single request type)
- [x] mock-store.ts simplified (MVP seed data, no stats)
- [x] supabase-mock.ts cleaned (removed recomputeStats)
- [x] Dependencies installed (resend, react-markdown, remark-gfm)
- [x] .env.example updated with all MVP env vars
- [x] Non-MVP files deleted (expertise, config, stats, keys routes; settings page; payments; capacity; migrations 002/003)
- [x] Brand identity + design system applied to existing UI
- [x] Landing page created (at /landing, needs to move to /)

### TODO (Backend — Phase 1)
- [ ] B1: Create src/lib/notifications.ts (Resend email + Twilio SMS)
- [ ] B2: Simplify src/lib/auth.ts (validate against HITL_API_KEY env var)
- [ ] B3: Rewrite src/lib/requests.ts (simplified service layer)
- [ ] B4: Rewrite src/app/api/requests/route.ts (strip payments/capacity)
- [ ] B5: Rewrite src/app/api/requests/[id]/route.ts (single response type, no admin auth)
- [ ] B6: Simplify src/app/api/requests/[id]/wait/route.ts
- [ ] B7: Rewrite src/app/api/mcp/route.ts (single ask_human tool)
- [ ] B8: Update src/middleware.ts (new auth rules)
- [ ] B9: Simplify src/lib/webhooks.ts (env var secret)
- [ ] B10: Simplify src/app/api/status/route.ts
- [ ] B11: Create src/app/api/openapi/route.ts
- [ ] B12: Update public/llms.txt
- [ ] B13: Rewrite supabase/migrations/001_create_hitl_tables.sql

### TODO (Frontend — Phase 2)
- [ ] F1: Update src/hooks/useHitl.ts (remove stats, simplify)
- [ ] F2: Create src/app/review/[id]/ (mobile review page)
- [ ] F3: Create src/app/dashboard/page.tsx (admin dashboard)
- [ ] F4: Move landing page to / (delete /landing)
- [ ] F5: Create src/app/terms/page.tsx
- [ ] F6: Create src/app/docs/page.tsx
- [ ] F7: Update src/app/layout.tsx (metadata + viewport)

### TODO (SDKs — Phase 3)
- [ ] Simplify sdk/python/hitl.py (single ask() method)
- [ ] Simplify sdk/typescript/hitl.ts (single ask() method)
