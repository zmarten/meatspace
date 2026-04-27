# MeatSpace — Registry Submission Playbook

This is the copy-paste playbook for submitting MeatSpace to every MCP / AI-agent
tool registry I could find. Each section has the exact URL, the fields to fill
or commands to run, and the pre-written content. Designed so each submission
takes ~30 seconds.

**What I could submit from this sandbox: none of them.** I have no GitHub auth,
no ability to fill web forms, and the egress allowlist blocks most registry
domains. Every entry below is *needs-manual-action*. The work I did do is
prepare the artifacts (`smithery.yaml`, `server.json`, `README.md`, plus all the
copy below) so the manual step is trivial.

Status legend:
- 🟢 Artifact ready, just run the command / paste the form
- 🟡 Needs a one-time setup step (fork, OAuth, etc.) before submission
- 🔴 Needs you to do something I literally cannot do (sign in, click)

---

## 1. MCP Registry (official, modelcontextprotocol/registry) 🟡

The canonical registry. Used as a source of truth by other registries.

- **Submission method:** `mcp-publisher` CLI. PRs and issues are explicitly NOT accepted.
- **Auth:** GitHub OAuth device flow (one-time).
- **Artifact:** `server.json` in repo root (already created and schema-validated).
- **Namespace:** `io.github.zmarten/meatspace`

**Steps:**

```bash
# 1. Install the publisher CLI (macOS/Linux):
curl -L https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr A-Z a-z)_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz | tar xz mcp-publisher
sudo mv mcp-publisher /usr/local/bin/

# 2. From the repo root (D:\my-project\projects\hitl):
mcp-publisher login github     # opens browser, authorizes via device code
mcp-publisher publish          # reads server.json, pushes to registry
```

**Verify:** `https://registry.modelcontextprotocol.io/v0/servers?search=meatspace`

If you don't want to make `zmarten/meatspace` public, you'll need to either
(a) make it public, or (b) switch to DNS TXT auth — set a TXT record on
`meatspace.run` and use `mcp-publisher login dns` instead. The `name` field in
`server.json` would then change to e.g. `run.meatspace/server`.

---

## 2. Smithery (smithery.ai) 🟢

Major registry; auto-scrapes new public repos with `smithery.yaml`.

- **Submission method:** Two paths — (a) push `smithery.yaml` to a public repo and submit the GitHub URL on smithery.ai, or (b) auto-discovery once the repo is public.
- **Auth:** GitHub OAuth on smithery.ai.
- **Artifact:** `smithery.yaml` in repo root (already created).
- **URL:** https://smithery.ai/new

**Steps:**

1. Make `github.com/zmarten/meatspace` public (or push to a public mirror).
2. Visit https://smithery.ai/ → "Sign in with GitHub" → "Add server" / "Submit MCP server".
3. Paste repo URL: `https://github.com/zmarten/meatspace`
4. Smithery will detect `smithery.yaml` and use the `deployment.type: remote` pointer to `https://meatspace.run/api/mcp`.
5. Optional: claim the listing on the Smithery dashboard.

**No additional copy needed** — Smithery reads everything from `smithery.yaml`.

---

## 3. Glama (glama.ai/mcp) 🟡

Auto-indexes public GitHub repos with MCP servers. Adding `glama.json` lets you claim ownership.

- **Submission method:** Auto-discovery once repo is public + indexed; `glama.json` for claiming.
- **Auth:** None for indexing; GitHub username in `glama.json` for claim.
- **URL:** https://glama.ai/mcp/servers

**Steps:**

1. Make repo public.
2. Add `glama.json` to repo root with:

```json
{
  "$schema": "https://glama.ai/mcp/schemas/server.json",
  "maintainers": ["zmarten"]
}
```

3. To accelerate indexing, submit at: https://glama.ai/mcp/servers (look for "Submit a server" / "Add MCP server" link in the footer or header).
4. After indexing, open the listing and claim it via the GitHub OAuth flow.

**No additional copy needed** — Glama scrapes the README and `.well-known/mcp.json`.

---

## 4. PulseMCP (pulsemcp.com) 🔴

Curated registry; scrapes public repos and accepts manual submissions.

- **Submission method:** Web form.
- **URL:** https://www.pulsemcp.com/submit
- **Auth:** None to submit; email for follow-up.

**Form fields (copy-paste):**

| Field | Value |
|---|---|
| Server name | `MeatSpace` |
| GitHub repo URL | `https://github.com/zmarten/meatspace` |
| Website / Homepage | `https://meatspace.run` |
| MCP endpoint | `https://meatspace.run/api/mcp` |
| Transport | Streamable HTTP |
| Short description (≤140 chars) | `Human-in-the-loop for AI agents. Submit content + 2–4 choices, get a structured human decision back.` |
| Long description | (use the "Long description" block below) |
| Categories / Tags | `human-in-the-loop`, `agents`, `approval`, `decision-support`, `subjective-judgment` |
| Authentication | Bearer token (optional — `provision_api_key` mints one with no auth) |
| Tools | `get_service_status`, `provision_api_key`, `ask_human` |
| Contact email | (yours) |

---

## 5. Cline Marketplace (cline/mcp-marketplace) 🔴

Cline VSCode extension's official marketplace.

- **Submission method:** GitHub issue using their "MCP Server Submission" template.
- **URL:** https://github.com/cline/mcp-marketplace/issues/new?template=mcp-server-submission.yml
- **Auth:** GitHub.

**Form fields:**

| Field | Value |
|---|---|
| GitHub Repository URL | `https://github.com/zmarten/meatspace` |
| Logo Image | Attach a 400×400 PNG. Use `public/icon.png` (verify size; if not 400×400, resize). |
| "Have you tested installation via Cline?" | (Required: install via Cline first, check the box.) |
| Reason for adding | (use "Cline reason" block below) |
| Additional Information | (use "Additional info" block below) |

**Cline reason (paste):**

```
MeatSpace is a remote MCP server (Streamable HTTP) at https://meatspace.run/api/mcp
that lets agents escalate subjective decisions to a human. The agent submits a
title plus 2–4 choices via the `ask_human` tool, the human picks one on a mobile
review page, and the result returns to the agent.

It is uniquely useful inside Cline because:
- Self-service: a fresh Cline session with no credentials can call
  `provision_api_key` (no auth required) to mint a Bearer token, then immediately
  use `ask_human`. No signup page, no approval queue.
- Long-poll up to 20s, then returns `pending` with `review_url` + `poll_url` so
  Cline doesn't block on a slow human.
- Three tools total: get_service_status, provision_api_key, ask_human.
```

**Additional info (paste):**

```
Live endpoint: https://meatspace.run/api/mcp
Discovery:    https://meatspace.run/.well-known/mcp.json
Docs:         https://meatspace.run/agents.md
OpenAPI:      https://meatspace.run/api/openapi
License:      MIT
```

---

## 6. punkpeye/awesome-mcp-servers 🟡

The largest community list. Submission is a PR to README.md.

- **Submission method:** PR adding one line to the appropriate category.
- **URL:** https://github.com/punkpeye/awesome-mcp-servers
- **Auth:** GitHub.

**Steps:**

```bash
gh repo fork punkpeye/awesome-mcp-servers --clone=true
cd awesome-mcp-servers
git checkout -b add-meatspace
```

Edit `README.md`. There is no "human-in-the-loop" category. Best fits, in order:
1. **"Other Tools and Integrations"** (most flexible)
2. "Workplace & Productivity"

Add this line under the chosen category, in alphabetical order:

```
- [zmarten/meatspace](https://github.com/zmarten/meatspace) 📇 ☁️ - Human-in-the-loop for AI agents. Submit content + 2–4 choices, get a structured human decision back. Self-service onboarding via `provision_api_key` (no signup).
```

Legend: `📇` = TypeScript, `☁️` = Cloud Service. Don't add `🎖️` (that's for official integrations only).

```bash
git add README.md
git commit -m "Add MeatSpace — human-in-the-loop MCP server"
git push origin add-meatspace
gh pr create --title "Add MeatSpace — human-in-the-loop MCP server" --body-file ../meatspace-pr-body.md
```

**PR body (save as `meatspace-pr-body.md` first):**

```markdown
## Description

Adds [MeatSpace](https://meatspace.run) — a remote MCP server (Streamable HTTP)
that lets AI agents escalate subjective decisions to a human reviewer.

## Why it belongs in the list

- **Genuinely new category:** human-in-the-loop tooling is underrepresented. Most agent
  workflows have no escape hatch for subjective tie-breaks.
- **Zero-friction onboarding:** the `provision_api_key` tool requires no auth, so a
  fresh MCP client can connect, mint its own token, and call `ask_human` in three
  RPC calls.
- **Open spec:** REST API, MCP, and Browser SDK all sit on the same backend. OpenAPI 3.1
  spec at https://meatspace.run/api/openapi, A2A Agent Card at /.well-known/agent.json.
- **MIT licensed**, source at https://github.com/zmarten/meatspace.

## Tools

- `get_service_status` — availability + escalation guidance (no auth)
- `provision_api_key` — self-service Bearer token (no auth, rate-limited)
- `ask_human` — submit a decision (Bearer auth, long-polls 20s)

## Checklist

- [x] I have read the [Contributing Guidelines](CONTRIBUTING.md).
- [x] The server is publicly available.
- [x] The entry follows the existing format.
- [x] The entry is added in alphabetical order within its category.
```

---

## 7. wong2/awesome-mcp-servers 🟡

Smaller but still influential.

- **Submission method:** PR to README.md.
- **URL:** https://github.com/wong2/awesome-mcp-servers
- **Auth:** GitHub.

Same pattern as punkpeye. Add to "Community Servers" or the closest section.

```
- [MeatSpace](https://github.com/zmarten/meatspace) - Human-in-the-loop for AI agents. Submit content + 2–4 choices, get a structured human decision back.
```

---

## 8. mcp.so (chatmcp/mcp.so) 🔴

- **Submission method:** GitHub Discussion in the chatmcp repo.
- **URL:** https://github.com/chatmcp/mcp-directory/discussions/new (or "Submit MCP Server" on https://mcp.so/)
- **Auth:** GitHub.

**Discussion title:** `Submission: MeatSpace — Human-in-the-loop MCP server`

**Discussion body:**

```markdown
**Name:** MeatSpace
**Repo:** https://github.com/zmarten/meatspace
**Endpoint:** https://meatspace.run/api/mcp (Streamable HTTP)
**Homepage:** https://meatspace.run
**License:** MIT
**Tags:** human-in-the-loop, approval, decision-support, agents

**Description:**
Human-in-the-loop service for AI agents. The agent submits content (text /
markdown / HTML / image) plus 2–4 labeled choices via the `ask_human` tool, a
human reviewer picks one on a mobile-friendly page, and the structured selection
returns to the agent. Three tools total:

- `get_service_status` — no auth
- `provision_api_key` — no auth, rate-limited (lets a fresh client mint its own Bearer token)
- `ask_human` — Bearer auth

**Discovery:**
- /.well-known/mcp.json
- /.well-known/agent.json
- /api/openapi (OpenAPI 3.1)
- /llms-full.txt
```

---

## 9. mcpservers.org 🔴

- **Submission method:** Web form.
- **URL:** https://mcpservers.org/submit
- **Auth:** None.

**Form fields:**

| Field | Value |
|---|---|
| Name | `MeatSpace` |
| URL | `https://meatspace.run` |
| GitHub | `https://github.com/zmarten/meatspace` |
| Description | (Short description from §4) |
| Tags | `human-in-the-loop`, `approval`, `agents` |
| Endpoint | `https://meatspace.run/api/mcp` |
| Transport | Streamable HTTP |

---

## 10. mcpserve.com 🔴

- **Submission method:** Web form (or contact link).
- **URL:** https://mcpserve.com/ → "Submit a server" / "Add server"
- **Auth:** None.

Use the same field values as §4 / §9.

---

## 11. mcpserverhub.net 🔴

- **Submission method:** Web form / GitHub issue (varies — check footer of homepage).
- **URL:** https://mcpserverhub.net/

Same content as §9.

---

## 12. Composio (composio.dev) 🟡

Composio indexes third-party tools, primarily by OpenAPI spec or first-party SDK.

- **Submission method:** Either (a) PR to https://github.com/ComposioHQ/composio with `integrations.yaml` + OpenAPI URL, or (b) "Add a tool" form on dashboard.
- **Auth:** GitHub.
- **URL:** https://github.com/ComposioHQ/composio (look for `integrations/` or `apps/` directory)

**Steps:**

```bash
gh repo fork ComposioHQ/composio --clone=true
cd composio
# Examine existing integrations to find the right path; pattern is usually
# python/composio/tools/local/<name>/ or apps/<name>/
mkdir -p apps/meatspace
```

Create `apps/meatspace/integration.yaml` (verify exact filename in their repo):

```yaml
name: meatspace
display_name: MeatSpace
description: >-
  Human-in-the-loop for AI agents. Submit content + 2–4 choices via the
  ask_human tool and get a structured human decision back.
homepage: https://meatspace.run
documentation: https://meatspace.run/agents.md
openapi_spec_url: https://meatspace.run/api/openapi
auth:
  type: bearer
  description: >-
    Use POST https://meatspace.run/api/keys to mint a token instantly
    (no signup). Pass the api_key field in the response as Bearer token.
categories:
  - productivity
  - agent-tools
tags:
  - human-in-the-loop
  - approval
  - decision-support
```

Then open a PR with title `Add MeatSpace integration` and a body describing the
self-service onboarding flow (reuse the `meatspace-pr-body.md` from §6).

---

## 13. ToolHouse (toolhouse.ai) 🔴

ToolHouse indexes tools that integrate with their agent runtime.

- **Submission method:** Email / contact form.
- **URL:** https://toolhouse.ai/contact (or `partnerships@toolhouse.ai`)

**Email body:**

> Subject: Tool listing request — MeatSpace (human-in-the-loop MCP server)
>
> Hi ToolHouse team,
>
> I'd like to list MeatSpace in your tool catalog. It's a remote MCP server
> (Streamable HTTP) for human-in-the-loop decisioning:
>
> - Endpoint: https://meatspace.run/api/mcp
> - OpenAPI: https://meatspace.run/api/openapi
> - Source: https://github.com/zmarten/meatspace
> - License: MIT
>
> The agent posts a title plus 2–4 choices via `ask_human`; a human picks one;
> the agent gets back a structured `{ selected, selected_label }`. A fresh
> client can mint its own Bearer token via `provision_api_key` — no signup.
>
> Three tools, all documented at https://meatspace.run/.well-known/mcp.json.
>
> Happy to provide whatever format you need.
>
> Thanks,
> Zach

---

## 14. AgentOps (agentops.ai) 🔴

AgentOps is observability-focused; their tool registry is at `agentops.ai/tools`.

- **Submission method:** Form / email at https://agentops.ai
- **URL:** https://agentops.ai/contact

Same email body as §13, swap "ToolHouse" for "AgentOps".

---

## 15. mcp.run 🔴 — likely not a fit

mcp.run is an XTP/WASM-based platform. It hosts servers as WASM modules; it does
**not** index external HTTP MCP endpoints. Skip unless we ever ship a WASM build.

If you still want a presence: open a discussion at https://github.com/extism/extism
with a pointer to the hosted endpoint.

---

## Reusable copy blocks

### Short description (≤140 chars)
```
Human-in-the-loop for AI agents. Submit content + 2–4 choices, get a structured human decision back.
```

### Medium description (≤280 chars)
```
MeatSpace is an MCP server that lets AI agents escalate subjective decisions to a human. Agent posts a title + 2–4 choices, human picks one on mobile, agent gets back the selected ID. Self-service onboarding — no signup.
```

### Long description (≤1000 chars)
```
MeatSpace is a remote MCP server (Streamable HTTP) at https://meatspace.run/api/mcp.
It exposes three tools:

  • get_service_status — availability + escalation guidance (no auth)
  • provision_api_key  — mint a Bearer token instantly (no auth, rate-limited)
  • ask_human          — submit a title + 2–4 choices for human judgment (Bearer auth)

Use it when your agent hits a subjective, high-stakes, or ambiguous decision —
approval gates before destructive actions, taste calls on copy, tie-breaks
under a confidence threshold, escalation when deterministic checks run out.

Long-polls up to 20s, then returns `pending` with a `review_url` and
`poll_url` so the agent doesn't block on a slow human. Webhook delivery is
HMAC-signed and host-allowlisted. REST, MCP, and Browser SDK all sit on the
same backing API.

Self-service onboarding: a fresh MCP client with no credentials can call
`provision_api_key`, get back a Bearer token, and immediately use `ask_human`.
No signup page, no approval queue.

Source: https://github.com/zmarten/meatspace · MIT.
```

### Tags / keywords
```
human-in-the-loop, hitl, human-feedback, approval, decision-support,
subjective-judgment, escalation, agents, mcp, a2a
```

---

## Summary table

| # | Registry | URL | Method | Status |
|---|---|---|---|---|
| 1 | MCP Registry | registry.modelcontextprotocol.io | `mcp-publisher` CLI | 🟡 needs OAuth + repo public |
| 2 | Smithery | smithery.ai/new | Repo URL on web form | 🟢 |
| 3 | Glama | glama.ai/mcp/servers | Auto + glama.json | 🟡 |
| 4 | PulseMCP | pulsemcp.com/submit | Web form | 🔴 |
| 5 | Cline Marketplace | github.com/cline/mcp-marketplace/issues/new | GitHub issue | 🔴 |
| 6 | punkpeye/awesome-mcp-servers | github.com/punkpeye/awesome-mcp-servers | PR | 🟡 |
| 7 | wong2/awesome-mcp-servers | github.com/wong2/awesome-mcp-servers | PR | 🟡 |
| 8 | mcp.so | mcp.so / chatmcp/mcp-directory | GitHub Discussion | 🔴 |
| 9 | mcpservers.org | mcpservers.org/submit | Web form | 🔴 |
| 10 | mcpserve.com | mcpserve.com | Web form | 🔴 |
| 11 | mcpserverhub.net | mcpserverhub.net | Web form / issue | 🔴 |
| 12 | Composio | github.com/ComposioHQ/composio | PR | 🟡 |
| 13 | ToolHouse | toolhouse.ai/contact | Email | 🔴 |
| 14 | AgentOps | agentops.ai/contact | Email | 🔴 |
| 15 | mcp.run | (skip — WASM-only) | — | — |

---

## Pre-flight checklist

Before any submission, make sure:

- [ ] `github.com/zmarten/meatspace` is **public** (most registries require this)
- [ ] Repo has `README.md`, `smithery.yaml`, `server.json`, `glama.json`, `LICENSE` (MIT)
- [ ] `https://meatspace.run/.well-known/mcp.json` returns valid JSON
- [ ] `https://meatspace.run/.well-known/agent.json` returns valid JSON
- [ ] `https://meatspace.run/api/openapi` returns valid OpenAPI 3.1
- [ ] `https://meatspace.run/api/mcp` responds to `tools/list` JSON-RPC
- [ ] `https://meatspace.run/icon.png` is reachable and ≥400×400 (for Cline)
- [ ] `mcp-publisher` is installed locally for §1
- [ ] `gh` CLI is logged in for §1, §6, §7, §12

---

## What I tried to do programmatically

- **MCP Registry:** can't run `mcp-publisher login` here — needs interactive browser OAuth.
- **GitHub-based registries (Cline, awesome-mcp-servers, mcp.so, Composio):** no `gh` CLI installed in sandbox; HTTPS proxy can't reach the GitHub API for auth.
- **Web-form registries (PulseMCP, Smithery sign-in, mcpservers.org, etc.):** no browser tool in sandbox.
- **Email registries (ToolHouse, AgentOps):** no SMTP from sandbox; you have to send from your own mail client.

The artifacts are all in place — `smithery.yaml`, `server.json`, and `README.md` in repo root, plus this playbook in `marketing/`. Each remaining step is a single command, click, or paste away.
