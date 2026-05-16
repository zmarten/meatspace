# MeatSpace HITL — Claude Code Skill

A drop-in Claude Code skill that pauses Claude before irreversible operations (deleting files, force-pushing, deploying prod, sending emails) and asks a real human via [meatspace.run](https://meatspace.run).

## Why

Claude Code is autonomous enough to delete the wrong directory, force-push over your colleague's branch, or `wrangler deploy` the wrong env. This skill makes it ask first. The reviewer (you, on your phone) taps approve/reject/modify on a magic-link page. No login.

## Install (30 seconds)

```bash
# 1. Register the MeatSpace MCP server with Claude Code
claude mcp add meatspace --transport http https://meatspace.run/api/mcp

# 2. Drop this skill into your Claude Code skills directory
mkdir -p ~/.claude/skills/meatspace-hitl
curl -o ~/.claude/skills/meatspace-hitl/SKILL.md \
  https://raw.githubusercontent.com/zmarten/meatspace/mvp/skills/meatspace-hitl/SKILL.md
```

That's it. Restart Claude Code. Next time Claude is about to do something risky, you'll get a notification.

## Provision your API key

The first time `ask_human` fires it will need a Bearer token. Either:

**Option A — let Claude do it.** Tell Claude: "Provision a MeatSpace key for me with name 'my-agent' and email '<yours>'." The `provision_api_key` MCP tool is unauthenticated and rate-limited; Claude can mint it and store it for you.

**Option B — do it yourself.**

```bash
curl -X POST https://meatspace.run/api/keys \
  -H 'Content-Type: application/json' \
  -d '{"name":"my-agent","email":"me@example.com"}'
```

Add the returned key to your MCP server config under `Authorization: Bearer <key>`.

## What it gates

By default: file deletion, database drops, force-pushes, prod deploys, sending external messages, package publishes, payments, and anything touching another person's state outside the current repo. Edit `SKILL.md` to customize.

## What it doesn't gate

Local, reversible, in-repo actions (editing files, running tests, installing dev deps). The skill is opinionated about not spamming you.

## Feedback

Open an issue at [github.com/zmarten/meatspace](https://github.com/zmarten/meatspace) or hit `ask_human` to send feedback (recursion encouraged).
