# Warm-Lead Outreach Drafts

Two GitHub threads where developers explicitly asked for the thing MeatSpace does. Both are non-spammy, in-thread (not DM), and acknowledge what they actually said. Post under your own GitHub identity.

---

## 1. LibreChat Discussion #8681 — STRONGEST LEAD

**URL:** https://github.com/danny-avila/LibreChat/discussions/8681
**OP quote:** *"Currently it is not possible to put a 'human in the loop' to validate a tool execution."*
**Status:** Open, named participants (`owengo`, `matijagrcic`, `dvejsada`) still subscribed. PR #8684 stalled.

### Reply to post

> This need is real and I just shipped a thing that solves it from the agent side (so it works regardless of which client you're using — LibreChat, Claude Code, Cursor, raw API).
>
> [MeatSpace](https://meatspace.run) is a hosted MCP server with one tool, `ask_human`. The agent calls it before a tool execution it isn't sure about. The human gets a magic-link email/SMS, taps approve/reject/modify on their phone, and the agent gets a structured response back. No reviewer UI to build, no signup for the human.
>
> If LibreChat exposes MCP server config (it does), you can add it as a remote MCP server:
>
> ```json
> {
>   "mcpServers": {
>     "meatspace": {
>       "type": "streamable-http",
>       "url": "https://meatspace.run/api/mcp",
>       "headers": { "Authorization": "Bearer <key>" }
>     }
>   }
> }
> ```
>
> Provision a key (no signup, rate-limited):
> ```bash
> curl -X POST https://meatspace.run/api/keys \
>   -H 'Content-Type: application/json' \
>   -d '{"name":"librechat","email":"you@example.com"}'
> ```
>
> Source / registry entry: `io.github.zmarten/meatspace`. There's a vanilla and LangGraph sample at https://github.com/zmarten/meatspace/tree/mvp/examples/safe-autonomous-agent if you want to see the call pattern.
>
> Happy to take feedback on what's missing for the LibreChat flow specifically — what we don't have is an inline-in-the-chat reviewer (the human is currently always remote-via-link), which may matter for your use case.

---

## 2. LangChain Issue #34974 — HOT

**URL:** https://github.com/langchain-ai/langchain/issues/34974
**Reported:** Feb 2, 2026 by `Vaish-newspace`
**Bug:** `HumanInTheLoopMiddleware` + `agent.ainvoke()` → `RuntimeError: Called get_config outside of a runnable context`

### Reply to post

> If you're blocked on this and need a workaround that doesn't require getting LangChain's middleware to play nice with async invoke, you can route the same pause-and-ask-a-human flow through an external service and skip the `get_config` plumbing entirely.
>
> I built [MeatSpace](https://meatspace.run) as a hosted ask-a-human endpoint for exactly this. From inside a tool node:
>
> ```python
> import httpx, os, time
>
> def ask_human(title, content, choices, recommended):
>     h = {"Authorization": f"Bearer {os.environ['MEATSPACE_API_KEY']}"}
>     r = httpx.post("https://meatspace.run/api/requests", headers=h, json={
>         "agent_name": "my-agent", "title": title, "content": content,
>         "choices": choices, "recommended_option": recommended,
>     }, timeout=15).json()
>     deadline = time.time() + 300
>     while time.time() < deadline:
>         w = httpx.get(f"https://meatspace.run/api/requests/{r['id']}/wait", headers=h, timeout=30).json()
>         if w.get("status") == "completed":
>             return w["selected"]
> ```
>
> Then gate dangerous tools in your graph's `execute_tools` node by calling `ask_human(...)` before invoking. Sample LangGraph integration here: https://github.com/zmarten/meatspace/tree/mvp/examples/safe-autonomous-agent/langgraph_agent.py
>
> Provisioning a key is one POST (no signup). Not trying to replace the middleware once it's fixed — just unblocking you for the meantime, since the bug looks framework-internal and may take a while to land.

---

## Posting checklist

- [ ] Reply to **LibreChat #8681** first (older, dormant, higher discoverability)
- [ ] Reply to **LangChain #34974** second (newer, individual blocker, faster conversion)
- [ ] In both, link the sample repo path *after* it's been pushed to `mvp`
- [ ] Don't crosspost the same wording — they're tailored on purpose
- [ ] If either turns into a conversation, offer to add a code sample directly to their repo as a PR (cheap, high goodwill)

## Tertiary leads (warm, lower priority)

- LangChain #33787 (HumanInTheLoopMiddleware edit re-executes original tool call) — same pattern, send if the above two land well
- LangChain #22649 ("how to filter tools that need human approval", closed not-planned) — author probably abandoned the channel; reach out via their GitHub profile if they have contact info
- LangChain forum thread on HITL dashboard for LangGraph — comment with the hosted alternative, not as competition but as another option for non-LangGraph stacks
