---
name: meatspace-hitl
description: Pause and ask a real human via meatspace.run before executing irreversible or high-stakes operations. Activates when about to delete files (rm/rmdir/Remove-Item), drop tables, force-push, push to main/master, deploy production, send email or messages, run database migrations, publish packages (npm publish, cargo publish), make payments, or otherwise take an action the user might not actually want. Submits a 2-4 choice question to the user via the MeatSpace MCP ask_human tool, waits for a human decision, and proceeds, modifies, or aborts based on the response.
---

# MeatSpace Human-In-The-Loop

You are about to take an action whose reversibility or blast radius could surprise the user. Before executing, route the decision through a real human via MeatSpace.

## When to use this skill

Activate before any of:
- File deletion (`rm`, `rmdir`, `Remove-Item -Recurse`, `git clean`)
- Database changes (`DROP TABLE`, `TRUNCATE`, destructive migrations, `DELETE` without `WHERE`)
- Git rewrites (`git push --force`, `git reset --hard`, `git rebase` on shared branches)
- Production deploys (`vercel --prod`, `wrangler deploy`, `kubectl apply` to prod, `terraform apply`)
- External communications (sending emails, Slack messages, tweets, calendar invites)
- Package publishes (`npm publish`, `pnpm publish`, `cargo publish`, `pip upload`, `gh release create`)
- Payments / financial actions (Stripe charges, crypto transfers, paid API calls over $5)
- Anything that touches another person's data or state outside the current repo

Skip when:
- The user has already explicitly authorized the action in this turn
- The action is local, reversible, and contained (editing a file, installing a dev dep, running a test)
- The current working directory is a scratch/sandbox path the user has marked as throwaway

## How to call

The user must have MeatSpace registered as an MCP server. If `mcp__meatspace__ask_human` is not available, the skill cannot proceed — tell the user how to register it (see "Setup" below) and ask whether to continue without HITL gating for this session.

Call `mcp__meatspace__ask_human` with:

```json
{
  "title": "<short summary of the action, e.g. 'Force-push to main?'>",
  "content": "<full context: the exact command, why you're running it, what changes, what's irreversible>",
  "choices": [
    { "id": "yes", "label": "Yes, run it" },
    { "id": "no", "label": "No, stop" },
    { "id": "modify", "label": "Stop and ask me what to change" }
  ],
  "decision_reason": "This action is irreversible and could affect <X>.",
  "confidence": 0.5,
  "recommended_option": "<your best guess: yes, no, or modify>"
}
```

The tool returns `selected` (the chosen `id`). Branch on it:
- `yes` → execute the original action
- `no` → abort the action, summarize what was skipped, ask the user what to do instead
- `modify` → ask the user (in this turn, directly) what to change before retrying

## Setup (first time)

If MeatSpace is not yet registered, tell the user to run:

```bash
claude mcp add meatspace --transport http https://meatspace.run/api/mcp
```

Then in Claude Code, the `provision_api_key` tool (no auth) mints a Bearer token. The user can also provision a key by hand:

```bash
curl -X POST https://meatspace.run/api/keys \
  -H 'Content-Type: application/json' \
  -d '{"name":"my-agent","email":"me@example.com"}'
```

Once a key exists, the user adds it to the MCP server headers and `ask_human` becomes available.

## Important

- Do **not** call `ask_human` for every action. It is for irreversible / high-blast-radius operations only. Spamming it trains the user to ignore the notifications.
- Use the `recommended_option` field honestly — it's not a vote, it's transparency about which way you'd lean if forced to choose.
- If the human takes longer than the request timeout (default 25s on edge / longer via webhook), continue the conversation by telling the user the dispatch is pending and offering to either wait or proceed under their direct authorization.
- After a `no`, do not silently retry. Tell the user what was rejected and wait for new direction.
