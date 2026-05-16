# MeatSpace — Show HN Packet

Everything needed to fire the Show HN submission with confidence.

---

## Title

**Recommended (use this one):**
> Show HN: MeatSpace – When your AI agent needs a human to make a call

**Why:** Avoids buzzword stack ("MCP, REST, SDK"), states the *problem* (which HN clicks on more than products), reads like the start of a story.

**Alternatives if you want to A/B-think it:**
- `Show HN: MeatSpace – A human-in-the-loop API for AI agents` (clinical, safer)
- `Show HN: An MCP server that lets AI agents ask a human for a judgment call` (specific to MCP crowd, narrower reach)

**Avoid:** parentheticals, ALL CAPS, "Introducing", emoji.

---

## URL

`https://meatspace.run`

The homepage already has hero, live-demo screenshot, two CTAs, and copy that matches HN's irreverent tone ("Your edge cases need thumbs. We have thumbs."). Don't link to /docs as the URL — homepage converts curiosity to clicks better.

---

## First comment (post immediately after submitting)

```
Hey HN — built this on paternity leave to learn about agents from
the inside. The thing I kept hitting was: agents are great at
deterministic work and brittle on subjective calls. "Is this copy
hostile?" "Which design ships?" "Approve this destructive op?"

So MeatSpace is a deliberately small contract: your agent posts a
title plus 2–4 labeled choices, a human picks one on a mobile page,
your agent gets back { selected, selected_label }. Long-polls 25s
then returns pending with a poll URL.

Three things I think are non-obvious:

1. The MCP server lets a fresh client mint its own Bearer token
   (provision_api_key, no auth, rate-limited). A brand-new agent
   can connect, get credentials, and call ask_human in three RPC
   calls. No signup form, no approval queue. Whether that's clever
   or terrifying is honestly part of what I'm trying to learn.

2. Forcing 2–4 choices instead of free-form answers makes results
   structured enough for agents to actually act on. Free-form
   "what would you do?" answers are useless for downstream logic.

3. The human reviewer is currently me. That's a feature for now —
   I want to see what people actually ask before deciding what
   the moderation/quality model should look like.

Things it's not:
- Mechanical Turk (no batch labeling, single decisions)
- LangChain HumanInputTool (that's stdin on the dev machine; this
  is async, mobile, transport-agnostic)
- A finished product (no SLA, single human, one-person project)

REST, MCP (Streamable HTTP), and a browser SDK all sit on the same
backend. OpenAPI 3.1 at /api/openapi. MIT licensed. Source:
https://github.com/zmarten/meatspace

Beat it up — what use cases am I missing, what would break it,
what would you actually want from a service like this?
```

**Why this works:** opens with personal context (HN responds to humans, not press releases), states the problem before the product, gives three specific non-obvious points, acknowledges what it isn't (preempts comparisons), explicit "beat it up" CTA invites engagement.

---

## Anticipated objections — canned responses

Pre-write these so you're not improvising under fire. **Don't** paste these verbatim — riff off them in your voice.

### "Why not just use Mechanical Turk?"
MTurk's response time is hours and the contract is "label this row." MeatSpace is "my agent is mid-task, hit a subjective wall, needs a structured choice in seconds." Different shape. Also no MCP integration.

### "How do you ensure response quality?"
Right now: it's me. That bounds the throughput but makes the quality story easy. If demand justifies, the next step is a small trusted reviewer pool — not anonymous crowdsourcing. The choice constraint (2–4 labeled options) also limits the failure modes.

### "What's the SLA?"
There isn't one. The API is honest about it: long-polls up to 25s, then returns `pending` with `poll_url` and `review_url`. The agent doesn't block. If you need guaranteed sub-minute response, this isn't the right tool.

### "Self-service API keys with no auth is a security nightmare"
Three things: (1) rate-limited at 5 keys/IP/hour, (2) each key is scoped to its own usage, (3) worst case someone burns through requests on their own dime — which is currently $0 because there's no billing. The threat model is "spam the human reviewer," and that's bounded by the rate limit + my discretion to ignore obvious garbage.

### "How is this different from olalonde/mcp-human or MariusAure/needhuman-mcp?"
Honestly similar landscape. Differences: (1) forced 2–4 labeled choices instead of free-form text — gives the agent structured output it can branch on, (2) no signup at all, fully self-serve via MCP tool call, (3) mobile-first reviewer experience. Not claiming novelty in concept; the design choices are the contribution.

### "How do you make money?"
I don't. Yet. It's a learning project on paternity leave. If usage justifies a sustainable model, freemium with generous free tier — but I want to learn what people actually use it for before I price it.

### "Cloudflare Workers won't scale this"
25s long-poll cap is documented and the API gracefully falls back to client-side polling. DB is Supabase. Notifications via Resend. Edge-runtime throughout. The bottleneck isn't the platform — it's me being the only human reviewer.

### "Naming clash with the slang 'meatspace'"
Intentional. The whole concept is "API access to the meatspace," i.e. the IRL world. Naming it Meatspace makes the joke explicit.

### "What does the human actually see?"
Mobile-friendly review page: title, content (text/markdown/HTML/image), 2–4 buttons. One tap submits. Email link arrives instantly via Resend. Try it: /api/keys → /api/requests → check your inbox.

### "What stops me from using this for moderation farming?"
Nothing technical, but the rate limit + single reviewer means it's a terrible fit for moderation farming. If someone tries it I'll just stop responding to their requests.

---

## Pre-flight checklist (do these BEFORE submitting)

Run through this 30 minutes before you post. Don't post if any are red.

- [ ] **Homepage loads in <2s** from a cold cache. Test with https://www.webpagetest.org or just fresh-incognito.
- [ ] **Demo on the homepage works** — live request through to a notification on your phone, end-to-end. HN will try it.
- [ ] **`/docs` loads, all code blocks render**, both curl and PowerShell visible.
- [ ] **`/api/openapi` returns valid spec** (curl it, validate at https://editor.swagger.io if paranoid).
- [ ] **MCP endpoint responds to `tools/list`** (you have this verified — re-verify the morning of).
- [ ] **Rate limits are turned on** (`hitl_check_ip_rate_limit` RPC, 5 keys/IP/hour).
- [ ] **Phone is on you** for the first 4 hours after posting. HN will fire requests; you need to respond fast or the demo *is* dead.
- [ ] **Emergency kill switch ready** — know how to disable `provision_api_key` in CF dashboard if abuse spikes.
- [ ] **`registry.modelcontextprotocol.io` listing live** (currently ✅) — gives you "we're real" credibility if someone questions legitimacy.
- [ ] **Optional but high-value: fix `/icon.png` 404** — currently 404s. Tiny visible loose end.
- [ ] **GitHub repo is in good shape** — README front-loads what it does, `LICENSE` is MIT, examples/ exists. HN will read the repo.
- [ ] **Have HN account >30 days old with karma > 0** — fresh accounts get auto-buried.

---

## Timing

**Optimal slot:** Tuesday or Wednesday, 8:00–9:30 AM ET (US East Coast).

**Why that window:**
- US devs starting work, EU devs heading home — peak overlap
- Mid-week avoids the "weekend warrior project" dismissal
- 8–9:30 gets you on the front page before the lunch-hour rush, so by the time most of HN's audience is browsing you've already accumulated upvotes

**Today is Wednesday May 6 2026, ~9:30 PM ET locally.** Already past today's window.

**Recommended target dates** (in priority order):
1. **Tuesday May 12, 8:00 AM ET** ← top pick. Gives a week to polish, fix `/icon.png`, see if punkpeye PR merges (social proof in repo readme), and nail your 4-hour response window.
2. **Wednesday May 13, 8:00 AM ET** — backup if Tuesday slips.
3. **Tuesday May 19** — if you want to sequence LinkedIn first (fire LinkedIn around May 12, HN a week later with "X people on LI said Y" momentum).

**Avoid:**
- Mondays (HN distracted by "what's new from the weekend")
- Fridays (audience is winding down)
- Anytime after 11 AM ET (you'll get buried by morning posts)
- Major news days (check news cycle the morning of)

---

## Cross-promotion (after HN posts)

Once your submission is live, paste the link into:
- Your Twitter/X (with the prepared thread, but lead with the HN link)
- LinkedIn comment thread on the paternity-leave post
- The MCP discord (#showcase channel)
- r/LocalLLaMA / r/ClaudeAI as **comment links to your HN post**, not separate submissions (avoids "self-promotion" flagging)

**Don't** ask for upvotes. Don't tell people to "click the orange triangle." HN's voting ring detection is real and will tank your post.

---

## After it's posted — the first 4 hours

- **Reply to every top-level comment within 30 minutes.** This is the single biggest signal HN's algorithm uses.
- **Don't be defensive.** When someone says "this is just X with extra steps," the right answer is "you're not wrong about the overlap — here's where it diverges and where you're right that it doesn't."
- **Ship one fix.** If a comment surfaces a real bug, fix and deploy during the discussion. "Updated, just deployed: https://..." comments are gold on HN.
- **Save quotes for LinkedIn.** Genuine engagement (positive or critical) becomes social proof for the LI post.

---

## Reusable assets already drafted (for cross-channel)
- LinkedIn vulnerable draft: `Paternity Leave Update.txt` (root)
- Twitter thread (5 tweets): `marketing/distribution-playbook.md` § 4C
- Reddit titles per sub: `marketing/distribution-playbook.md` § 4B
