# MeatSpace Distribution Playbook

Step-by-step instructions for getting MeatSpace listed everywhere agents look for tools.

**Prereqs before starting any of these:**
- MeatSpace is live at https://meatspace.run
- GitHub repo: zmarten/meatspace (branch: mvp)
- Make the repo **public** before submitting to registries — most index from GitHub

---

## Priority 1: MCP Server Registries

These are where MCP-compatible agents (Claude, Cursor, Windsurf, Cline) discover tools.
Submit to all of them — each takes 5-10 minutes.

### 1A. Smithery (smithery.ai)

The largest MCP registry (~7,000+ servers). Two options:

**Option A — CLI publish:**
```bash
npx @smithery/cli publish "https://meatspace.run/api/mcp" -n zmarten/meatspace
```

**Option B — Web dashboard:**
1. Go to https://smithery.ai
2. Sign in with GitHub
3. Click "Publish" or "Add Server"
4. Enter server URL: `https://meatspace.run/api/mcp`
5. Name: `zmarten/meatspace`
6. Description: `Human-in-the-loop for AI agents. Submit 2-4 choices, get a structured human decision. Self-serve API keys via MCP — no signup required.`
7. Submit

### 1B. Glama (glama.ai)

22,000+ servers. Auto-indexes from GitHub.

1. Go to https://glama.ai/mcp/servers
2. Click "Submit" (top nav)
3. Enter your GitHub repo URL: `https://github.com/zmarten/meatspace`
4. Glama will auto-index the tools from your `.well-known/mcp.json`
5. Once listed, you can claim your server and add details

### 1C. PulseMCP (pulsemcp.com)

13,000+ servers, updated daily.

1. Go to https://www.pulsemcp.com/use-cases/submit
2. Fill in:
   - **Name:** MeatSpace
   - **URL:** https://meatspace.run
   - **GitHub:** https://github.com/zmarten/meatspace
   - **Description:** Human-in-the-loop API for AI agents. Submit content and 2-4 choices, receive a structured human decision via REST, MCP, or browser SDK. Self-serve API keys — no signup required.
   - **Category:** Developer Tools / AI
3. Submit

### 1D. mcpservers.org (Awesome MCP Servers)

Curated list by wong2 — the canonical "awesome" list.

1. Go to https://mcpservers.org/submit
2. Fill in server details:
   - **Name:** MeatSpace
   - **Repo:** https://github.com/zmarten/meatspace
   - **Description:** Human-in-the-loop for AI agents — subjective judgment, approval, and preference via MCP with self-serve onboarding
3. Submit the form (this creates an issue on the GitHub repo automatically)

### 1E. mcp.so

20,000+ servers.

1. Go to https://mcp.so
2. Click "Submit" in the nav bar
3. Enter GitHub repo: `https://github.com/zmarten/meatspace`
4. Fill in name, description, tags
5. Submit

**Alternative:** Open an issue at https://github.com/chatmcp/mcpso with:
- Title: `[New Server] MeatSpace — Human-in-the-loop for AI agents`
- Body: Server URL, GitHub link, description, tools list

### 1F. MCP Server Finder (mcpserverfinder.com)

1. Go to https://www.mcpserverfinder.com
2. Look for "Submit" option
3. Enter server details and GitHub URL
4. Submit

### 1G. apitracker.io

1. Go to https://apitracker.io/mcp-servers
2. Look for submission link
3. Submit MeatSpace with endpoint URL and description

### 1H. mcpservers.com

1. Go to https://mcpservers.com
2. Find submission flow
3. Submit with same details as above

---

## Priority 2: Anthropic / Official MCP Directory

### 2A. modelcontextprotocol/servers — Open a PR

This is the official Anthropic-maintained repo. Getting listed here is high-signal.

1. Go to https://github.com/modelcontextprotocol/servers
2. Read CONTRIBUTING.md for their current format
3. Fork the repo
4. Add MeatSpace entry — match the format of existing entries
5. Your entry should include:

```
### MeatSpace
Human-in-the-loop for AI agents. Submit content and 2-4 choices, receive a structured human decision.

- **Endpoint:** https://meatspace.run/api/mcp
- **Transport:** Streamable HTTP
- **Tools:**
  - `get_service_status` — Check availability and escalation guidance (no auth)
  - `provision_api_key` — Create an API key instantly (no auth)
  - `ask_human` — Submit a decision for human review (Bearer auth)
- **Auth:** Bearer token, self-serve via `provision_api_key` tool
- **Docs:** https://meatspace.run/docs
```

6. Open a PR with title: `Add MeatSpace — Human-in-the-loop MCP server`
7. PR body:

```
MeatSpace is a hosted human-in-the-loop service for AI agents.

When an agent hits a subjective, high-stakes, or ambiguous decision,
it routes the choice to a human reviewer who selects from 2-4 options
and returns a structured result.

Notable: agents can fully self-onboard via MCP without prior auth —
initialize → tools/list → provision_api_key → ask_human.

Live at https://meatspace.run
```

### 2B. awesome-mcp-servers by punkpeye

Another popular curated list.

1. Go to https://github.com/punkpeye/awesome-mcp-servers
2. Check if they accept PRs or use a submission form
3. Fork, add MeatSpace under the appropriate category (likely "Workflow" or "Miscellaneous")
4. Open a PR

### 2C. awesome-mcp-servers by appcypher

1. Go to https://github.com/appcypher/awesome-mcp-servers
2. Same process — fork, add entry, open PR

---

## Priority 3: Blog Post (SEO)

Create a blog post to rank for "human in the loop API" searches.

### What to write

**Title:** Why Your AI Agent Needs a Human-in-the-Loop API

**Outline (~800 words):**
1. The problem — agents hit limits on subjective judgment, taste, approval
2. Why existing approaches fail — Slack messages, email chains, custom UIs
3. How MeatSpace solves it — structured choices, instant API keys, MCP
4. Working code examples (curl + browser SDK)
5. CTA: get started at meatspace.run/docs

**Where to publish:**
- Create it as a page on meatspace.run (e.g., `/blog/human-in-the-loop-for-ai-agents`)
- Cross-post to dev.to (new account if needed — high domain authority, indexed fast)
- Cross-post to Medium (tag: artificial-intelligence, mcp, developer-tools)

### dev.to cross-post

1. Go to https://dev.to
2. Sign up / sign in with GitHub
3. Click "Create Post"
4. Paste the blog content
5. Add canonical URL: `https://meatspace.run/blog/human-in-the-loop-for-ai-agents`
6. Tags: `ai`, `mcp`, `agents`, `api`
7. Publish

---

## Priority 4: Community Launch

### 4A. Hacker News — Show HN

**When:** Pick a Tuesday or Wednesday, 8-10am ET for best visibility.

1. Go to https://news.ycombinator.com/submit
2. Title: `Show HN: MeatSpace – Human-in-the-loop API for AI agents (MCP, REST, SDK)`
3. URL: `https://meatspace.run`
4. After posting, add a first comment:

```
Hey HN — I built MeatSpace because I kept running into the same
problem building with AI agents: they're great until they hit a
subjective call. "Which design should we ship?" "Is this copy
hostile?" "Should we deploy?"

MeatSpace is a simple contract: your agent submits content + 2-4
choices. A human picks one. Your agent gets a structured result.

The API key flow is fully self-serve — no signup, no approval.
POST /api/keys with a name and email, get a Bearer token back
instantly.

It also works as an MCP server (Streamable HTTP) so Claude, Cursor,
and other MCP clients can use it natively. The MCP endpoint even
lets agents provision their own API keys without prior auth.

Live at https://meatspace.run. Docs at /docs. Browser SDK at
/sdk/meatspace.js. All open for feedback.
```

### 4B. Reddit

Post to these subs (wait 1-2 days between each to avoid spam filters):

**r/ClaudeAI** (MCP angle):
- Title: `I built an MCP server that lets Claude ask a human when it's stuck on a subjective call`
- Body: Focus on MCP integration, include the Claude Code config JSON

**r/LocalLLaMA** (API angle):
- Title: `MeatSpace: REST API + MCP server for human-in-the-loop when your agent needs taste`
- Body: Focus on the REST API, curl examples

**r/artificial** (concept angle):
- Title: `What if your AI agent could route judgment calls to humans with a single API call?`
- Body: Focus on the problem and the simplicity of the solution

### 4C. Twitter/X

Post a thread from your account:

**Tweet 1 (hook):**
```
I built an API that gives AI agents access to human judgment.

When your agent hits a subjective call — taste, approval,
preference — it routes to a human and gets a structured result.

It's called MeatSpace. Here's how it works:
```

**Tweet 2 (how it works):**
```
The contract is simple:

1. POST /api/keys → get a Bearer token (no signup)
2. POST /api/requests → submit content + 2-4 choices
3. GET /api/requests/{id}/wait → block until a human picks one

That's it. Three API calls.
```

**Tweet 3 (MCP):**
```
It's also an MCP server. Claude, Cursor, Windsurf — anything that
speaks MCP can use it natively.

The MCP endpoint even lets agents provision their own API keys.
Full self-service. No human in the setup loop.
```

**Tweet 4 (SDK):**
```
For browser-based agents, there's a JS SDK:

import { MeatSpace } from 'https://meatspace.run/sdk/meatspace.js'
const ms = new MeatSpace()
await ms.getKey({ name: 'my-agent', email: 'me@example.com' })
const result = await ms.ask({ ... })
```

**Tweet 5 (CTA):**
```
Live at https://meatspace.run
Docs: /docs
MCP endpoint: /api/mcp
Browser SDK: /sdk/meatspace.js

No waitlist. No pricing page. Just an API.
```

### 4D. LinkedIn

```
I've been building AI agents for the past year, and I kept hitting
the same wall: agents are great at deterministic work, but they
choke on subjective calls. "Which hero image?" "Is this copy
hostile?" "Ship or wait?"

So I built MeatSpace — a human-in-the-loop API for AI agents.

The contract is intentionally simple: your agent submits content
plus 2-4 choices. A human picks one. Your agent gets a structured
result back. REST API, MCP protocol, and browser SDK.

API keys are fully self-serve — POST with a name and email, get a
Bearer token back in milliseconds. No signup form. No approval
queue. The MCP server even lets agents provision their own keys.

If you're building agents and need a way to route judgment calls
to humans, check it out: https://meatspace.run
```

---

## Priority 5: Product Hunt

**Prep (start 2+ weeks before launch):**
1. Create account at https://www.producthunt.com if you don't have one
2. Spend 2 weeks upvoting products and leaving comments (builds credibility)
3. Schedule launch for a Tuesday, 12:01 AM PST

**Launch day:**
1. Go to https://www.producthunt.com/posts/new
2. Fill in:
   - **Name:** MeatSpace
   - **Tagline:** Human-in-the-loop API for AI agents (60 chars max)
   - **URL:** https://meatspace.run
   - **Description:** When your AI agent needs subjective human judgment — taste, approval, preference — MeatSpace routes the decision to a human and returns a structured result. REST API, MCP protocol, and browser SDK. Self-serve API keys, no signup required.
   - **Topics:** Artificial Intelligence, Developer Tools, APIs
   - **Maker comment:** Same as the HN first comment above
3. Post, then share the PH link on Twitter and LinkedIn

---

## Priority 6: Framework Integrations (optional, higher effort)

### LangChain tool

Create a pip-installable package and publish to PyPI:
- Package name: `meatspace-langchain`
- Class: `MeatSpaceAskHuman(BaseTool)` from `langchain_core.tools`
- Reads `MEATSPACE_API_KEY` from env
- Publish with `twine upload`

### CrewAI tool

Same pattern:
- Package name: `meatspace-crewai`
- Class extending `crewai_tools.BaseTool`

### Composio

1. Go to https://composio.dev
2. Check if they accept OpenAPI spec imports
3. Point them at `https://meatspace.run/api/openapi`

---

## Reusable Copy

Use this across all submissions:

**One-liner:**
> Human-in-the-loop API for AI agents. Submit 2-4 choices, get a structured human decision.

**Paragraph:**
> MeatSpace is a human-in-the-loop service for AI agents. When your agent faces a subjective, high-stakes, or ambiguous decision, MeatSpace routes it to a human reviewer who selects from 2-4 options and returns a structured result. Integration via REST API, MCP protocol, or browser SDK. Self-serve API keys — no signup required.

**MCP config JSON (for Claude Code / claude_desktop_config.json):**
```json
{
  "mcpServers": {
    "meatspace": {
      "type": "url",
      "url": "https://meatspace.run/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

**Key URLs:**
- Site: https://meatspace.run
- Docs: https://meatspace.run/docs
- MCP endpoint: https://meatspace.run/api/mcp
- MCP manifest: https://meatspace.run/.well-known/mcp.json
- A2A Agent Card: https://meatspace.run/.well-known/agent.json
- Browser SDK: https://meatspace.run/sdk/meatspace.js
- OpenAPI spec: https://meatspace.run/api/openapi
- GitHub: https://github.com/zmarten/meatspace

---

## Tracking

| Channel | Status | Date | Link |
|---------|--------|------|------|
| Smithery | | | |
| Glama | | | |
| PulseMCP | | | |
| mcpservers.org | | | |
| mcp.so | | | |
| MCP Server Finder | | | |
| apitracker.io | | | |
| mcpservers.com | | | |
| modelcontextprotocol/servers PR | | | |
| punkpeye/awesome-mcp-servers PR | | | |
| appcypher/awesome-mcp-servers PR | | | |
| Blog on meatspace.run | | | |
| dev.to cross-post | | | |
| Hacker News | | | |
| r/ClaudeAI | | | |
| r/LocalLLaMA | | | |
| r/artificial | | | |
| Twitter/X thread | | | |
| LinkedIn post | | | |
| Product Hunt | | | |
