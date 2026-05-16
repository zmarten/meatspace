# safe-autonomous-agent

Two minimal templates for an LLM agent that pauses for a real human before doing anything irreversible. Powered by [MeatSpace](https://meatspace.run) — the human-in-the-loop service for AI agents.

- **`langgraph_agent.py`** — LangGraph state graph with a `tools` node that gates `DANGEROUS_TOOLS` through `ask_human` before execution.
- **`vanilla_agent.py`** — No-framework alternative. Anthropic SDK + tool-calling loop. ~120 lines.

## What it does

Your agent has tools like `delete_file`, `send_email`, `push_to_main`. Before any of those run, MeatSpace fires an email/SMS to a human reviewer with a magic link. They tap **Yes**, **No**, or **Modify** on their phone. Your agent gets the answer and continues.

No login. No dashboard. No reviewer UI to build.

## Quick start

```bash
# 1. Provision a MeatSpace API key (no signup)
curl -X POST https://meatspace.run/api/keys \
  -H 'Content-Type: application/json' \
  -d '{"name":"safe-agent","email":"you@example.com"}'
# → returns {"api_key": "ms_...", ...}

# 2. Set env
export ANTHROPIC_API_KEY=sk-ant-...
export MEATSPACE_API_KEY=ms_...

# 3. Install & run
pip install -r requirements.txt
python vanilla_agent.py
# (or `python langgraph_agent.py` for the LangGraph version)
```

You'll get an email at the address you provided. Tap a choice. The script resumes.

## Why use this instead of LangGraph's built-in `interrupt()` / `HumanInTheLoopMiddleware`

LangGraph's HITL primitives assume **you** are the human and **you** built the reviewer UI. That's fine for local dev but breaks down when:

- The human approving the action isn't the developer (e.g. ops/legal/the founder's spouse)
- You need approval from a phone, not a terminal
- You're running the agent on a server with no UI
- You don't want to build and maintain a reviewer dashboard

MeatSpace handles the notification, the magic link, and the mobile-friendly review page. Your code only needs to call one HTTP endpoint and wait.

## Adapting

The `DANGEROUS_TOOLS` set in `langgraph_agent.py` is the simplest knob. Add/remove tool names there. For finer control, gate on tool name **and** arguments (e.g. only gate `push_to_main` when `force=True`).

In the vanilla version, gating lives inside each tool function — `tool_delete_file` calls `ask_human` directly. Either pattern is fine; choose whichever your codebase already uses.

## Webhooks (optional)

Long-poll works fine for interactive agents. For long-running background agents, use webhook delivery instead:

```python
# When creating the request, pass a callback URL:
{ "agent_name": "...", "title": "...", "callback_url": "https://your-app/hooks/meatspace" }
```

MeatSpace POSTs the result to your URL when the human responds, with HMAC-SHA256 signature in `X-MeatSpace-Signature`. Verify with `HITL_WEBHOOK_SECRET`.

## Links

- Service: [meatspace.run](https://meatspace.run)
- API docs: [meatspace.run/docs](https://meatspace.run/docs)
- Source: [github.com/zmarten/meatspace](https://github.com/zmarten/meatspace)
- MCP registry: `io.github.zmarten/meatspace`
