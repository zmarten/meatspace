# Ship Today — Pipeline to First Real Agent Invocation

Synthesized from a 5-agent parallel research swarm (Growth, AI Citation, Dev Advocate, Trend, MCP Builder). Sequenced for fastest time-to-first-real-`ask_human`-call.

## What's ready in this commit

| Artifact | Path | Purpose |
|---|---|---|
| Claude Code skill | `skills/meatspace-hitl/` | Drop-in skill that gates destructive Claude Code actions through `ask_human`. Highest-leverage activation hook. |
| LangGraph sample | `examples/safe-autonomous-agent/langgraph_agent.py` | Working LangGraph template gating `DANGEROUS_TOOLS`. Citation surface for LangChain queries. |
| Vanilla sample | `examples/safe-autonomous-agent/vanilla_agent.py` | ~120-line no-framework version. Anthropic SDK + tool loop. |
| Upgraded `server.json` | `server.json` | v0.2.0. Tighter description, keywords, example tools, structured metadata. |
| Brand icon | `public/icon.png` | 400×400 PNG. Resolves the long-standing 404. Required for Cline Marketplace. |
| Landing page upgrades | `src/app/page.tsx`, `src/app/layout.tsx` | Tabbed copy-paste install block, visible FAQ, FAQPage + Organization JSON-LD targeting the 7 unbranded queries we lost. |
| Warm-lead replies | `marketing/outreach-warm-leads.md` | Drafted GitHub thread replies for LibreChat #8681 and LangChain #34974. |

## Deploy + publish (this is the order)

1. **Commit + push to `mvp`** — Cloudflare auto-deploys the landing page, FAQ JSON-LD, and `icon.png`.
2. **Verify `https://meatspace.run/icon.png`** returns 200 (was 404).
3. **Re-publish to MCP Registry:**
   ```bash
   ~/bin/mcp-publisher.exe publish
   ```
   (server.json now at version `0.2.0` — registry will accept the bump.)

## Post the warm-lead replies (highest probability path to first real invocation)

In `marketing/outreach-warm-leads.md`:

- [ ] **LibreChat Discussion #8681** — older, dormant, named participants subscribed
- [ ] **LangChain Issue #34974** — newer, blocked user, faster turnaround

Both replies acknowledge the OP's exact problem and link the new `examples/safe-autonomous-agent` directory. Post under your own GitHub identity.

## Registry submissions (effort: ~45 min total)

Using `marketing/registry-submissions.md` as the source playbook:

- [ ] **PulseMCP** (`pulsemcp.com/submit`) — web form, ~10 min
- [ ] **Cline Marketplace** (`github.com/cline/mcp-marketplace/issues/new`) — GitHub issue, attach `public/icon.png`, ~15 min
- [ ] **mcpservers.org** (resubmit if pending) — web form, ~5 min
- [ ] **mcp.so** GitHub Discussion — ~10 min

## Watch for the first call

The `ask_human` invocation will show up in:
- `hitl_requests` table on Supabase (project `wymeocgffkrtveozdhec`)
- The reviewer's email inbox (you, while testing — eventually a real external email)
- Cloudflare Pages logs for `/api/requests` POST

Set up a simple check:

```sql
SELECT id, agent_name, title, created_at, ip
FROM hitl_requests
WHERE created_at > now() - interval '24 hours'
  AND agent_name NOT IN ('test-agent', 'safe-agent', 'curl-test', 'my-agent')
ORDER BY created_at DESC;
```

The first row with an `agent_name` you don't recognize from internal testing is the win.

## What's NOT in this commit (next batch if today doesn't convert)

- **`/compare` page** — head-to-head vs gotoHuman / HumanLayer / ask-human-mcp (AI Citation P2)
- **Pin a public GitHub repo** — `safe-autonomous-agent-template` broken out into its own repo at `github.com/zmarten/safe-autonomous-agent-template` for separate citation surface (right now it lives inside `zmarten/meatspace`, which may be enough)
- **Hero GIF** — 6-second screen recording of a real dispatch resolving, replacing the static `RequestCardMock`
- **`/status` page** — public uptime view calling `get_service_status` server-side
- **n8n community node** — passive distribution into automation workflows
- **Show HN post** — Tuesday 8am PT, title: "MeatSpace – Let your AI agent ask a human before doing something stupid"

## Why this ordering

Growth Hacker, Dev Advocate, and MCP Builder all converged on the same thing: **the warm GitHub replies + Claude Code skill + LangGraph sample is the shortest path from "we exist" to "an external agent called our endpoint."** Everything else (Show HN, animated video, Twitter launch) compounds on top of those three artifacts existing and ranking. Skipping ahead to launch posts before that scaffolding is in place is what failed for prior MCP servers we benchmarked against.
