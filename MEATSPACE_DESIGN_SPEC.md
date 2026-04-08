# MeatSpace Design System Specification
**Version**: 1.0  
**Target**: Frontend Developer — implement directly, no further design iteration required  
**Stack**: Next.js 14 / Tailwind CSS / globals.css + tailwind.config.ts

---

## 1. CSS Variables — Complete `:root {}` Replacement

Replace the entire existing `:root {}` block in `src/app/globals.css` with:

```css
:root {
  /* Backgrounds — cool blue-grey near-black, datacenter tone */
  --hitl-bg: #080b0f;
  --hitl-surface: #0e1117;
  --hitl-surface-hover: #141920;

  /* Borders — nearly invisible, cool blue-grey tint */
  --hitl-border: #1e2530;
  --hitl-border-hover: #2d3748;

  /* Text — high contrast white primary, cool grey secondaries */
  --hitl-text: #f0f2f5;
  --hitl-text-secondary: #8892a4;
  --hitl-text-muted: #4a5568;

  /* Accent — amber warning-light, the ONE brand color */
  --hitl-accent: #e8a020;
  --hitl-accent-soft: rgba(232, 160, 32, 0.10);

  /* Approve — ICU monitor green, clinical not lush */
  --hitl-approve: #22c55e;
  --hitl-approve-soft: rgba(34, 197, 94, 0.10);

  /* Reject — clinical red */
  --hitl-reject: #ef4444;
  --hitl-reject-soft: rgba(239, 68, 68, 0.10);

  /* Warning — same amber as accent (warning IS the brand) */
  --hitl-warning: #e8a020;
  --hitl-warning-soft: rgba(232, 160, 32, 0.10);
}
```

**Decisions and rationale:**

- `--hitl-bg: #080b0f` — Slightly blue-shifted from pure black. Not warm charcoal, not neutral. Feels like a terminal with the lights off.
- `--hitl-surface: #0e1117` and `--hitl-surface-hover: #141920` — 6-7 point luminance steps. Subtle but legible layering.
- `--hitl-border: #1e2530` — Blue-grey tint, very low contrast. Structural presence only.
- `--hitl-text: #f0f2f5` — Slightly cool white, not warm `#e8e6e3`. Clinical display readout tone.
- `--hitl-text-secondary: #8892a4` — Cool blue-grey mid tone.
- `--hitl-text-muted: #4a5568` — Slate-family grey. Stays readable against surfaces without warmth.
- `--hitl-accent: #e8a020` — Amber warning-light. Not yellow (`#fbbf24` is too pale/cheerful), not deep gold. This is a machine alert color. Chosen over `#f59e0b` because it reads as infrastructure warning rather than sunlight.
- `--hitl-approve: #22c55e` — Green-500. Less saturated and warm than the previous `#34d399`. Closer to a monitor readout than an emoji checkmark.
- `--hitl-reject: #ef4444` — Red-500. Authoritative. Clinical.
- `--hitl-warning` and `--hitl-accent` are identical — intentional. The brand has one alert color.

---

## 2. Font Change

**Decision: Replace DM Sans with IBM Plex Sans.**

IBM Plex Sans is the correct choice over Inter because:
- Designed by IBM for technical/infrastructure interfaces
- Has a slight mechanical quality in the letterforms that reinforces the cold-silicon tone
- Pairs better with JetBrains Mono than Inter does — both have a "made by engineers" quality
- Inter reads as "friendly SaaS app". IBM Plex Sans reads as "system console".

### Google Fonts `@import` — replace line 5 of `globals.css`

**Remove:**
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');
```

**Replace with:**
```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
```

### `body` font-family — update in `globals.css`

**Remove:**
```css
font-family: 'DM Sans', system-ui, sans-serif;
```

**Replace with:**
```css
font-family: 'IBM Plex Sans', system-ui, sans-serif;
```

### `tailwind.config.ts` font update

**Remove:**
```ts
sans: ['DM Sans', 'system-ui', 'sans-serif'],
```

**Replace with:**
```ts
sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
```

---

## 3. Background Pattern — `body::before` Replacement

**Decision: Fine dot grid. PCB/datasheet aesthetic.**

The topo contour lines are too organic and warm. A dot grid reads as graph paper, circuit board substrate, or an oscilloscope display — all correct for this brand. Dots are rendered in cool blue-white at 3% opacity. Barely there. Structural not decorative.

Replace the entire `body::before` block in `globals.css`:

**Remove:**
```css
/* Topo background pattern — subtle */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cpath d='M200 50c-80 0-150 60-150 140s70 140 150 140 150-60 150-140S280 50 200 50z' fill='none' stroke='%23ffffff' stroke-width='0.3' opacity='0.03'/%3E%3Cpath d='M200 90c-60 0-110 45-110 100s50 100 110 100 110-45 110-100S260 90 200 90z' fill='none' stroke='%23ffffff' stroke-width='0.3' opacity='0.03'/%3E%3Cpath d='M200 130c-40 0-70 28-70 60s30 60 70 60 70-28 70-60-30-60-70-60z' fill='none' stroke='%23ffffff' stroke-width='0.3' opacity='0.03'/%3E%3C/svg%3E");
  background-size: 400px 400px;
  pointer-events: none;
  z-index: 0;
}
```

**Replace with:**
```css
/* Dot grid — PCB substrate pattern */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='1' cy='1' r='0.75' fill='%23a8bdd4' fill-opacity='0.055'/%3E%3C/svg%3E");
  background-size: 24px 24px;
  pointer-events: none;
  z-index: 0;
}
```

**Pattern notes:**
- 24px grid spacing — tight enough to read as technical, not so tight it adds visual noise
- Dot radius 0.75px — single pixel at most displays
- Fill color `#a8bdd4` (cool blue-grey) at 5.5% opacity — barely perceptible against `#080b0f`
- No repeat needed — `background-size: 24px 24px` tiles automatically

---

## 4. Additional CSS to Add

Add the following block to `globals.css` after the scrollbar and selection rules:

```css
/* ─── MeatSpace brand utilities ─── */

/* Monospace status codes — [ERR_503], [DECAY_408], etc. */
.code-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6875rem;       /* 11px */
  letter-spacing: 0.04em;
  color: var(--hitl-text-muted);
}

/* Uppercase tracked label — section headers, badge labels, context block labels */
.label-tracked {
  font-size: 0.6875rem;       /* 11px */
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--hitl-text-muted);
}

/* Accent label — for labels that should read in amber, e.g. "AGENT CONTEXT" */
.label-tracked-accent {
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--hitl-accent);
}

/* MEATSPACE wordmark — header treatment */
.wordmark {
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  font-size: 1.25rem;         /* 20px */
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--hitl-text);
}

/* Decay/error state — used on expired dispatch panels */
.state-decayed {
  border-color: rgba(239, 68, 68, 0.20) !important;
  background-color: rgba(239, 68, 68, 0.04) !important;
}

/* Subtle scanline overlay — apply to .state-decayed panels for visual noise on error */
.scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.06) 2px,
    rgba(0, 0, 0, 0.06) 4px
  );
  pointer-events: none;
  border-radius: inherit;
}

/* Pulse dot — used on active/queued state indicators */
@keyframes statusPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

.pulse-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--hitl-accent);
  animation: statusPulse 2s ease-in-out infinite;
}

.pulse-dot--approve {
  background-color: var(--hitl-approve);
}

/* Acquiring (loading) state — used where "Loading..." currently appears */
@keyframes acquiringDots {
  0%   { content: 'Acquiring'; }
  25%  { content: 'Acquiring.'; }
  50%  { content: 'Acquiring..'; }
  75%  { content: 'Acquiring...'; }
}

/* Force online/offline — active state badge treatment */
.badge-online {
  background-color: var(--hitl-approve);
  color: var(--hitl-bg);
  font-weight: 600;
  letter-spacing: 0.04em;
}

.badge-offline {
  background-color: var(--hitl-reject);
  color: #ffffff;
  font-weight: 600;
  letter-spacing: 0.04em;
}
```

---

## 5. Component-Level Design Notes for Developer

### Border Radius — Global Reduction

The current `rounded-lg` (8px) everywhere is too soft for this brand. Apply the following reductions throughout:

- **Cards, surface panels, stats bar cells**: `rounded` (4px) — not `rounded-lg`
- **Buttons (primary actions — EXECUTE, REJECT, ABORT)**: `rounded-sm` (2px) — sharp, decisive
- **Buttons (filter tabs, secondary)**: `rounded` (4px)
- **Input fields (textarea, time inputs, number inputs)**: `rounded` (4px)
- **Type badges, status badges**: `rounded-sm` (2px) — these are tags, not pills
- **Request cards in the queue list**: `rounded` (4px)
- **Option selection buttons (choose_option type)**: `rounded` (4px)

**Exception**: Scrollbar thumb stays at `border-radius: 3px`.

### Header / Wordmark (page.tsx — Dashboard header)

The `<h1>` element currently reads "HITL" with `text-2xl font-medium tracking-tight`. Replace with:

```
className="wordmark"
```

This applies the `.wordmark` class defined in the additional CSS above: 20px, weight 600, tracking 0.08em, uppercase. The word "MEATSPACE" in this treatment should feel like a system identifier, not a product name.

The subtitle `human-in-the-loop` currently uses `text-[11px] text-hitl-text-muted tracking-[0.15em] uppercase`. This is correct treatment — keep the class structure, just update the copy (see Section 6).

### TypeBadge Component

Current: `text-[11px] px-2 py-0.5 rounded-md bg-hitl-accent-soft text-hitl-accent font-medium`

Replace `rounded-md` with `rounded-sm`. Add `font-mono` (JetBrains Mono) and `tracking-wider`. The gate type labels should read like terminal tokens, not UI chips.

New classes: `text-[11px] px-2 py-0.5 rounded-sm bg-hitl-accent-soft text-hitl-accent font-mono tracking-wider`

### Status Badges (completed / expired on RequestCard)

Current inline styles for `completed` and `expired` status text are unstyled weight-wise.

For `resolved` badge: `text-[11px] text-hitl-approve font-mono tracking-wider uppercase`  
For `decayed` badge: `text-[11px] text-hitl-reject font-mono tracking-wider uppercase`

Wrap each in a `<span>` with a background soft tint:
- Resolved: `bg-hitl-approve-soft px-1.5 py-0.5 rounded-sm`
- Decayed: `bg-hitl-reject-soft px-1.5 py-0.5 rounded-sm`

### StatsBar Component

Currently: `bg-hitl-surface rounded-lg p-4`  
Change to: `bg-hitl-surface rounded p-4 border border-hitl-border`

Add a top-border accent to the "Queued" stat cell (the one with `pulse: true`) to indicate active state:
`border-t-2 border-t-hitl-accent` — a 2px amber top border on the queued count cell only.

The stat value currently uses `text-xl font-medium`. For the queued cell when `pulse` is true, also add `font-mono` (numbers should read as readouts, not typeset text).

### AGENT CONTEXT Block

Currently: `text-[11px] text-hitl-text-muted mb-1 uppercase tracking-wider`  
Replace with the `.label-tracked` utility class. This block label is a prime candidate for the tracked uppercase treatment.

### Approve / EXECUTE Button

Currently: `bg-hitl-approve text-hitl-bg`  
Add `rounded-sm font-semibold tracking-wide uppercase` — the primary action button on a HITL dashboard should command. It should not be soft or friendly.

### Reject / ABORT Button

Currently: `bg-hitl-reject-soft text-hitl-reject border border-hitl-reject/20`  
Change to: `bg-transparent text-hitl-reject border border-hitl-reject/40 hover:border-hitl-reject/80 hover:bg-hitl-reject-soft`  
Add `rounded-sm font-semibold tracking-wide uppercase`

### Carbon Resolution Panel (completed state)

The green `bg-hitl-approve-soft` block currently labels itself "Your response". The `p` tag label should use `.label-tracked-accent` class. The response content should remain `text-sm text-hitl-text`.

### Expired / Decay State Panel

Add `state-decayed scanlines` classes to the outer panel div. The panel needs `position: relative` for the scanline pseudo-element to work. This gives expired dispatches a subtle visual differentiation — slightly red-tinted surface with scanline noise.

### Settings Page — Section Headers `<h2>` Elements

Currently: `text-base font-medium text-hitl-text mb-4`  
Add `tracking-tight` — no other change needed. These are functional labels.

### Filter Tab Buttons (Queued / Resolved / Decayed / All)

Active state currently: `bg-hitl-text text-hitl-bg`  
Change active state to: `bg-hitl-accent text-hitl-bg font-semibold` — the amber accent as the active filter indicator is more on-brand than inverting to white-on-dark. The active tab should look like a lit indicator, not a selected UI element.

### Inactive Filter Tabs

Currently: `text-hitl-text-secondary hover:text-hitl-text hover:bg-hitl-surface-hover`  
Add `hover:text-hitl-accent` to the hover state for a subtle amber pre-selection indicator.

### Force Online / Force Offline Buttons (settings page)

Active ONLINE state: use `.badge-online` class instead of `bg-hitl-approve text-hitl-bg`  
Active OFFLINE state: use `.badge-offline` class instead of `bg-hitl-reject text-white`  
Inactive state: keep `bg-hitl-surface border border-hitl-border text-hitl-text-secondary hover:border-hitl-border-hover`  
Add `rounded-sm uppercase tracking-wide font-semibold text-xs` to both button states.

### PriorityDot Component

The `critical` priority dot (`bg-red-400`) should pulse. Apply `animate-pulse` from Tailwind.  
The `high` priority dot (`bg-amber-400`) — change to `bg-hitl-accent` so it uses the design token instead of a hardcoded Tailwind amber.

### Request Card Selection State

Currently: `border-hitl-accent bg-hitl-accent-soft/30`  
Change to: `border-hitl-accent bg-hitl-accent-soft/20` — slightly less saturated selection tint. The `bg-hitl-accent-soft` at full 10% + 30% modifier is too prominent with the new amber.

### Scrollbar

Currently uses `var(--hitl-border)` and `var(--hitl-border-hover)`.  
Update to use the new border values — no class change needed, the CSS var swap handles it.

### Agent name in RequestCard and ResponsePanel header

Currently: `text-xs text-hitl-text-secondary font-mono`  
Add `tracking-wider` — agent identifiers should read as system IDs.

### `layout.tsx` — Page metadata

Update `title` and `description`:
```ts
title: 'MEATSPACE — flesh-in-the-loop',
description: 'Dispatch queue active. Wetware resolution required.',
```

---

## 6. Complete Copy Changes

All text replacements, keyed to the file and element where they appear. Apply exactly as listed.

### `src/app/page.tsx`

| Location | Current text | New text |
|---|---|---|
| `<h1>` wordmark | `HITL` | `MEATSPACE` |
| Subtitle span | `human-in-the-loop` | `flesh-in-the-loop` |
| Settings nav link | `Settings` | `Node Configuration` |
| Tagline `<p>` | `Your agents are waiting for your taste, judgment, and opinion.` | `Dispatch queue active. Wetware resolution required.` |
| StatsBar item label | `'Pending'` | `'Queued'` |
| StatsBar item label | `'Completed'` | `'Resolved'` |
| StatsBar item label | `'Avg response'` | `'Avg Latency'` |
| StatsBar item label | `'Revenue'` | `'Revenue'` (no change) |
| Loading state | `Loading...` | `Acquiring...` |
| Empty queue — line 1 | `No {filter === 'all' ? '' : filter} requests.` | `Dispatch queue nominal.` |
| Empty queue — line 2 | `Your agents are independent today.` | `Wetware standing by in low-power state.` |
| Filter tab label | `'Pending'` | `'Queued'` |
| Filter tab label | `'Completed'` | `'Resolved'` |
| Filter tab label | `'Expired'` | `'Decayed'` |
| Filter tab label | `'All'` | `'All'` (no change) |
| RequestCard — completed badge | `completed` | `resolved` |
| RequestCard — expired badge | `expired` | `decayed` |
| TypeBadge label | `'approve / reject'` | `'binary gate'` |
| TypeBadge label | `'choose'` | `'choice gate'` |
| TypeBadge label | `'free text'` | `'unstructured output'` |
| TypeBadge label | `'rate'` | `'score'` |
| TypeBadge label | `'rank'` | `'rank'` (no change) |
| Agent context block label | `Agent context` | `AGENT CONTEXT` |
| approve_reject textarea placeholder | `Add reasoning (optional)...` | `Append rationale (optional)...` |
| choose_option textarea placeholder | `Add reasoning (optional)...` | `Append rationale (optional)...` |
| rate textarea placeholder | `Add reasoning (optional)...` | `Append rationale (optional)...` |
| free_text textarea placeholder | `Share your thoughts...` | `Transmit unstructured output...` |
| Approve button | `Approve` | `EXECUTE` |
| Reject button | `Reject` | `ABORT` |
| Submitting state (approve/reject) | `'Sending...'` | `'Writing...'` |
| choose_option submit button | `Submit choice` | `DISPATCH SELECTION` |
| free_text submit button | `Send response` | `SUBMIT OUTPUT` |
| rate submit button | `Submit rating` | `TRANSMIT SCORE` |
| ResponsePanel — completed label | `Your response` | `Carbon Resolution` |
| ResponsePanel — expired message | `This request has expired` | `[DECAY_408] Dispatch window expired. Flesh Node failed to resolve within SLA.` |
| Right panel empty state | `Select a request to review` | `Select a dispatch to resolve.` |

### `src/app/settings/page.tsx`

| Location | Current text | New text |
|---|---|---|
| Loading state | `Loading settings...` | `[SYS] Fetching node configuration...` |
| `<h1>` | `Settings` | `Node Configuration` |
| Back nav link | `Back to queue` | `Back to Dispatch Queue` |
| Settings subtitle `<p>` | `Operating hours, queue caps, and demand signals.` | `Node availability window, queue capacity, demand signals.` |
| Section `<h2>` | `Quick controls` | `Override Controls` |
| Force open button — inactive | `Force open` | `FORCE ONLINE` |
| Force open button — active | `Forced OPEN` | `NODE ONLINE (FORCED)` |
| Force closed button — inactive | `Force closed` | `FORCE OFFLINE` |
| Force closed button — active | `Forced CLOSED` | `NODE OFFLINE (FORCED)` |
| Saving indicator | `Saving...` | `Writing...` |
| Section `<h2>` | `Weekly schedule` | `Node Availability Window` |
| Disabled day label | `Closed` | `Circadian Blackout` |
| Section `<h2>` | `Queue limits` | `Carbon Debt Ceiling` |
| Queue cap label | `Max pending binary` | `Binary Gate cap` |
| Queue cap label | `Max pending choice` | `Choice Gate cap` |
| Queue cap label | `Max pending text` | `Output Layer cap` |
| Queue cap label | `Max daily requests` | `Daily dispatch ceiling` |
| Section `<h2>` | `Pricing (per request)` | `Resolution Pricing` |
| Section `<h2>` | `Demand signals` | `Demand Signals` (no change) |
| Sub-section `<h3>` | `Agent proposals` | `Agent Proposals` (no change) |
| Section `<h2>` | `Revenue` | `Carbon Revenue` |
| Stat label | `Total revenue` | `Total Carbon Revenue` |
| Stat label | `Last 24h` | `24h Throughput` |
| Stat label | `Unique agents` | `Active Dispatch Origins` |

### `src/app/layout.tsx`

| Location | Current text | New text |
|---|---|---|
| `metadata.title` | `'HITL — Human-in-the-Loop'` | `'MEATSPACE — flesh-in-the-loop'` |
| `metadata.description` | `'Your taste, judgment, and opinion — on demand for any AI agent.'` | `'Dispatch queue active. Wetware resolution required.'` |

---

## 7. Tailwind Config — No Changes Required

The `tailwind.config.ts` color tokens all point to CSS variables (`var(--hitl-*)`) so the color swap in Section 1 propagates automatically. The only change needed is the `fontFamily.sans` update in Section 2.

The existing `animation` entries (`pulse-slow`, `slide-up`, `fade-in`) are kept. Add the following to the `keyframes` block in `tailwind.config.ts` if the developer wants Tailwind utility access to the statusPulse animation (optional — the raw CSS in globals.css is sufficient):

```ts
statusPulse: {
  '0%, 100%': { opacity: '1' },
  '50%': { opacity: '0.3' },
},
```

And in `animation`:
```ts
'status-pulse': 'statusPulse 2s ease-in-out infinite',
```

---

## 8. Implementation Checklist

In order of dependency (do not reorder):

1. Update `@import` URL in `globals.css` — fonts load before anything else
2. Replace `:root {}` block — all color tokens propagate to every component
3. Update `body` font-family in `globals.css`
4. Update `fontFamily.sans` in `tailwind.config.ts`
5. Replace `body::before` block in `globals.css`
6. Add the brand utilities block to `globals.css`
7. Update `layout.tsx` metadata
8. Apply component-level class changes (Section 5) — border-radius, badge classes, button classes
9. Apply copy changes (Section 6)

---

*Spec prepared for MeatSpace HITL dashboard — v1.0. All values are final. No design review loop required.*
