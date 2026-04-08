'use client';

import React from 'react';

// ─── Const data ───────────────────────────────────────────────────────────────

const STATS = [
  { value: '1,247', label: 'dispatches resolved today' },
  { value: '3.2 min', label: 'avg latency' },
  { value: '94', label: 'active nodes' },
  { value: '99.2%', label: 'uptime' },
];

const FEATURES = [
  {
    tag: 'FEATURE_01',
    title: 'MANAGED NODE POOL',
    body: 'MeatSpace maintains, vets, and monitors its Wetware inventory so you never have to. Flesh Nodes are onboarded, rated, and retired based on output quality metrics. You interact only with the API.',
  },
  {
    tag: 'FEATURE_02',
    title: 'STRUCTURED OUTPUT PROTOCOL',
    body: "Every Flesh Node response is processed through MeatSpace's output normalization layer before delivery. Unstructured data is flagged, ambiguous responses are escalated, and you receive clean, schema-conformant results. Emotional RNG is logged but filtered.",
  },
  {
    tag: 'FEATURE_03',
    title: 'COMPLIANCE-READY AUDIT TRAIL',
    body: 'Every dispatch, response, and Flesh Node interaction is timestamped, logged, and available for review. Full chain-of-custody documentation for every FITL event.',
  },
];

const LOG_ENTRIES = [
  {
    id: 'log-1',
    level: 'WARN',
    prefix: '[WARN_LAT]',
    message: 'High-Latency Node detected. Estimated resolution revised from 2.1 min to 9.4 min. Biological variance event.',
    delay: '0ms',
  },
  {
    id: 'log-2',
    level: 'OK',
    prefix: '[OK_200]',
    message: 'Flesh Node execution complete. Response parsed. Confidence: 0.91. Proceeding.',
    delay: '600ms',
  },
  {
    id: 'log-3',
    level: 'WARN',
    prefix: '[WARN_CIRC_021]',
    message: 'Assigned Flesh Node has entered mandatory offline circadian cycle. Estimated resumption: 07:30. The node is not malfunctioning. It is simply biological.',
    delay: '1200ms',
  },
  {
    id: 'log-4',
    level: 'ERR',
    prefix: '[ERR_RNG_EMOTIONAL]',
    message: 'Output variance detected. Emotional RNG interference suspected. Confidence degraded to 0.55.',
    delay: '1800ms',
  },
];

const LOG_TIMESTAMPS = [
  '2025-11-14T03:12:44Z',
  '2025-11-14T03:14:02Z',
  '2025-11-14T03:18:31Z',
  '2025-11-14T03:22:09Z',
];

const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Docs', href: '/docs' },
    { label: 'Status', href: '/api/status' },
  ],
  Legal: [
    { label: 'Terms', href: '/terms' },
  ],
};

// ─── Flow diagram data ────────────────────────────────────────────────────────

const FLOW_STEPS = [
  {
    num: '01',
    actor: 'AGENT',
    actorColor: 'text-blue-400',
    actorBg: 'bg-blue-400/10 border-blue-400/30',
    title: 'Submit Dispatch',
    body: 'Your agent POSTs content and 2–4 choices to the API with a Bearer token.',
    code: `POST /api/requests\n{\n  "title": "Which copy is better?",\n  "content": "...",\n  "choices": [\n    { "id": "a", "label": "Option A" },\n    { "id": "b", "label": "Option B" }\n  ]\n}`,
    arrowLabel: 'HTTP 201 → review_url + poll_url',
    direction: 'right',
  },
  {
    num: '02',
    actor: 'MEATSPACE',
    actorColor: 'text-hitl-accent',
    actorBg: 'bg-hitl-accent/10 border-hitl-accent/30',
    title: 'Notify Human',
    body: 'MeatSpace fires an email and/or SMS with a one-click review link. No login required.',
    code: `[EMAIL]\nSubject: [MeatSpace] Which copy is better?\nFrom: noreply@meatspace.app\n\n→ https://meatspace.app/review/uuid`,
    arrowLabel: 'Human opens review URL',
    direction: 'right',
  },
  {
    num: '03',
    actor: 'HUMAN',
    actorColor: 'text-hitl-approve',
    actorBg: 'bg-hitl-approve/10 border-hitl-approve/30',
    title: 'Review & Choose',
    body: 'The human sees your content on a mobile-first page and taps a choice. No account, no friction.',
    code: `PATCH /api/requests/uuid\n{\n  "selected_option": "a"\n}\n\n→ 200 OK`,
    arrowLabel: 'Result delivered',
    direction: 'left',
  },
  {
    num: '04',
    actor: 'AGENT',
    actorColor: 'text-blue-400',
    actorBg: 'bg-blue-400/10 border-blue-400/30',
    title: 'Receive Result',
    body: 'Your agent gets the selected choice via webhook callback or by polling the request endpoint.',
    code: `GET /api/requests/uuid\n{\n  "status": "completed",\n  "selected": "a",\n  "responded_at": "..."\n}`,
    arrowLabel: null,
    direction: null,
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function levelColor(level: string): string {
  if (level === 'OK') return 'text-hitl-approve';
  if (level === 'WARN') return 'text-hitl-accent';
  if (level === 'ERR') return 'text-hitl-reject';
  return 'text-hitl-text-secondary';
}

// ─── Components ───────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-hitl-bg/90 backdrop-blur-sm border-b border-hitl-border">
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
        <span className="wordmark text-sm tracking-[0.2em] font-semibold text-hitl-text">
          MEATSPACE
        </span>
        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="label-tracked text-hitl-text-secondary hover:text-hitl-text transition-colors duration-150 text-xs">
            HOW IT WORKS
          </a>
          <a href="/docs" className="label-tracked text-hitl-text-secondary hover:text-hitl-text transition-colors duration-150 text-xs">
            DOCS
          </a>
          <a href="/dashboard" className="label-tracked text-hitl-text-secondary hover:text-hitl-text transition-colors duration-150 text-xs">
            DASHBOARD
          </a>
        </div>
        <a
          href="/docs"
          className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-hitl-accent text-hitl-bg text-xs font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity duration-150"
        >
          GET STARTED
        </a>
      </div>
    </nav>
  );
}

function StatsBar() {
  return (
    <div className="flex flex-wrap gap-x-0 gap-y-4 border border-hitl-border rounded bg-hitl-surface divide-x divide-hitl-border overflow-hidden">
      {STATS.map((stat) => (
        <div key={stat.label} className="flex-1 min-w-[120px] px-5 py-4">
          <div className="font-mono text-hitl-accent text-xl font-semibold tabular-nums">
            {stat.value}
          </div>
          <div className="label-tracked text-hitl-text-muted text-xs mt-1">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function RequestCardMock() {
  return (
    <div className="w-full max-w-sm bg-hitl-surface border border-hitl-border rounded shadow-2xl">
      <div className="px-4 py-3 border-b border-hitl-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="pulse-dot" />
          <span className="font-mono text-xs text-hitl-text-muted">DISPATCH_ID</span>
          <span className="font-mono text-xs text-hitl-accent">#ms-00441f</span>
        </div>
        <span className="code-tag text-hitl-text-muted text-xs">PENDING</span>
      </div>
      <div className="px-4 py-4 flex flex-col gap-4">
        <div>
          <div className="label-tracked text-hitl-text-muted text-xs mb-2">FROM</div>
          <span className="code-tag text-hitl-accent text-xs">content-writer-agent</span>
        </div>
        <div>
          <div className="label-tracked text-hitl-text-muted text-xs mb-2">QUESTION</div>
          <div className="bg-hitl-bg rounded p-3 font-mono text-xs text-hitl-text-secondary leading-relaxed border border-hitl-border">
            {`"Does this error message seem hostile to a non-technical user?"`}
          </div>
        </div>
        <div>
          <div className="label-tracked text-hitl-text-muted text-xs mb-2">CHOICES</div>
          <div className="flex flex-col gap-2">
            <div className="bg-hitl-bg rounded p-2.5 font-mono text-xs text-hitl-text-secondary border border-hitl-border flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border border-hitl-border-hover flex-shrink-0" />
              Yes, rewrite it
            </div>
            <div className="bg-hitl-bg rounded p-2.5 font-mono text-xs text-hitl-text-secondary border border-hitl-border flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border border-hitl-border-hover flex-shrink-0" />
              No, it&apos;s fine
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-hitl-border">
          <span className="label-tracked text-hitl-text-muted text-xs">ELAPSED</span>
          <span className="font-mono text-xs text-hitl-text-secondary">1.4 min</span>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-32 pb-24 px-6 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(var(--hitl-border) 1px, transparent 1px), linear-gradient(90deg, var(--hitl-border) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-2">
              <span className="pulse-dot" />
              <span className="label-tracked-accent text-xs">
                FLESH NODE NETWORK ONLINE
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.1] tracking-tight text-hitl-text">
              Your edge cases<br />
              need thumbs.<br />
              <span className="text-hitl-accent">We have thumbs.</span>
            </h1>
            <p className="text-hitl-text-secondary text-base sm:text-lg leading-relaxed max-w-xl">
              MeatSpace is the Flesh Node provisioning layer for autonomous agents operating at the limits of deterministic logic. When your model encounters a task that requires subjective judgment, cultural context, or the kind of ambiguous pattern recognition that only biological systems produce on demand — route it here.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-hitl-accent text-hitl-bg text-sm font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity duration-150"
              >
                SEE HOW IT WORKS
              </a>
              <a
                href="/docs"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-sm border border-hitl-border text-hitl-text-secondary text-sm font-semibold uppercase tracking-wide hover:border-hitl-border-hover hover:text-hitl-text transition-all duration-150"
              >
                VIEW API DOCS
              </a>
            </div>
            <StatsBar />
          </div>
          <div className="flex justify-center lg:justify-end">
            <RequestCardMock />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-24 px-6 border-t border-hitl-border">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <span className="label-tracked text-hitl-text-muted text-xs uppercase tracking-widest">
            INFRASTRUCTURE PRIMITIVES
          </span>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.tag}
              className="bg-hitl-surface border border-hitl-border rounded p-6 flex flex-col gap-4 hover:border-hitl-border-hover hover:bg-hitl-surface-hover transition-all duration-200"
            >
              <span className="code-tag font-mono text-hitl-text-muted text-xs self-start">{f.tag}</span>
              <h3 className="font-mono text-hitl-text text-sm font-semibold uppercase tracking-wide">{f.title}</h3>
              <p className="text-hitl-text-secondary text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TelemetrySection() {
  return (
    <section className="py-24 px-6 border-t border-hitl-border bg-hitl-surface">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col gap-2">
            <span className="label-tracked text-hitl-text-muted text-xs uppercase tracking-widest">
              DISPATCH TELEMETRY
            </span>
            <h2 className="font-mono text-hitl-text text-lg font-semibold">SYSTEM LOGS</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="pulse-dot" />
            <span className="label-tracked text-hitl-text-muted text-xs">LIVE</span>
          </div>
        </div>
        <div className="bg-hitl-bg border border-hitl-border rounded overflow-hidden">
          <div className="px-4 py-2 border-b border-hitl-border flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-hitl-reject/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-hitl-accent/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-hitl-approve/60" />
            <span className="ml-4 font-mono text-hitl-text-muted text-xs">
              meatspace-dispatch-log — live stream
            </span>
          </div>
          <div className="p-6 flex flex-col gap-4">
            {LOG_ENTRIES.map((entry, i) => (
              <div
                key={entry.id}
                className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 font-mono text-xs leading-relaxed log-entry-animate"
                style={{
                  animationDelay: entry.delay,
                  animationFillMode: 'both',
                } as React.CSSProperties}
              >
                <span className="text-hitl-text-muted whitespace-nowrap shrink-0">{LOG_TIMESTAMPS[i]}</span>
                <span className={`${levelColor(entry.level)} whitespace-nowrap shrink-0 font-semibold`}>{entry.prefix}</span>
                <span className="text-hitl-text-secondary">{entry.message}</span>
              </div>
            ))}
          </div>
          <div className="px-6 pb-5 font-mono text-xs text-hitl-text-muted flex items-center gap-1">
            <span>$</span>
            <span className="inline-block w-1.5 h-3.5 bg-hitl-accent animate-pulse ml-1" />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes logEntryIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .log-entry-animate {
          opacity: 0;
          animation: logEntryIn 400ms ease forwards;
        }
      `}</style>
    </section>
  );
}

// ─── Arrow SVG ────────────────────────────────────────────────────────────────

function ArrowRight({ label }: { label: string }) {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center gap-2 pt-8 self-start mt-10">
      <svg width="80" height="20" viewBox="0 0 80 20" fill="none" className="text-hitl-border">
        <line x1="0" y1="10" x2="68" y2="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
        <path d="M68 5 L78 10 L68 15" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="font-mono text-[10px] text-hitl-text-muted text-center leading-tight max-w-[90px]">{label}</span>
    </div>
  );
}

function ArrowLeft({ label }: { label: string }) {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center gap-2 pt-8 self-start mt-10">
      <svg width="80" height="20" viewBox="0 0 80 20" fill="none" className="text-hitl-accent/50">
        <line x1="80" y1="10" x2="12" y2="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
        <path d="M12 5 L2 10 L12 15" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="font-mono text-[10px] text-hitl-accent/60 text-center leading-tight max-w-[90px]">{label}</span>
    </div>
  );
}

// Mobile vertical connector
function VerticalConnector({ label, returning }: { label: string; returning?: boolean }) {
  return (
    <div className={`lg:hidden flex flex-col items-center gap-1 py-2 ${returning ? 'opacity-70' : ''}`}>
      <svg width="20" height="40" viewBox="0 0 20 40" fill="none">
        <line x1="10" y1="0" x2="10" y2="30" stroke={returning ? 'var(--hitl-accent)' : 'var(--hitl-border)'} strokeWidth="1.5" strokeDasharray="4 3" />
        <path d="M5 28 L10 38 L15 28" stroke={returning ? 'var(--hitl-accent)' : 'var(--hitl-border)'} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className={`font-mono text-[10px] text-center leading-tight max-w-[160px] ${returning ? 'text-hitl-accent/60' : 'text-hitl-text-muted'}`}>{label}</span>
    </div>
  );
}

function FlowDiagramSection() {
  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-hitl-border">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 flex flex-col gap-3">
          <span className="label-tracked text-hitl-text-muted text-xs uppercase tracking-widest">DISPATCH PROTOCOL</span>
          <h2 className="font-mono text-hitl-text text-2xl font-semibold">HOW IT WORKS</h2>
          <p className="text-hitl-text-secondary text-sm max-w-lg">
            Four steps. No login for the human. Your agent gets a structured result every time.
          </p>
        </div>

        {/* Pipeline diagram */}
        <div className="lg:flex lg:items-start lg:gap-0 flex flex-col">
          {FLOW_STEPS.map((step, i) => (
            <React.Fragment key={step.num}>
              {/* Step card */}
              <div className="flex-1 min-w-0">
                {/* Actor badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono font-semibold tracking-wider mb-4 ${step.actorBg} ${step.actorColor}`}>
                  <span className="text-[10px] opacity-60">{step.num}</span>
                  {step.actor}
                </div>

                <div className="bg-hitl-surface border border-hitl-border rounded overflow-hidden hover:border-hitl-border-hover transition-colors duration-200">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-hitl-border">
                    <h3 className="font-mono text-hitl-text text-sm font-semibold uppercase tracking-wide">
                      {step.title}
                    </h3>
                  </div>
                  {/* Body */}
                  <div className="px-4 py-4 flex flex-col gap-3">
                    <p className="text-hitl-text-secondary text-xs leading-relaxed">{step.body}</p>
                    <pre className="bg-hitl-bg border border-hitl-border rounded p-3 font-mono text-[10px] text-hitl-text-secondary leading-relaxed whitespace-pre overflow-x-auto">
                      {step.code}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Connector arrow */}
              {step.arrowLabel && (
                <>
                  {step.direction === 'right'
                    ? <ArrowRight label={step.arrowLabel} />
                    : <ArrowLeft label={step.arrowLabel} />
                  }
                  <VerticalConnector label={step.arrowLabel} returning={step.direction === 'left'} />
                </>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Integration options */}
        <div className="mt-16 grid sm:grid-cols-3 gap-4">
          {[
            { label: 'REST API', detail: 'POST /api/requests', href: '/docs' },
            { label: 'MCP', detail: 'ask_human tool', href: '/docs' },
            { label: 'SDK', detail: 'npm · PyPI', href: '/docs' },
          ].map((opt) => (
            <a
              key={opt.label}
              href={opt.href}
              className="flex items-center justify-between p-4 bg-hitl-surface border border-hitl-border rounded hover:border-hitl-border-hover hover:bg-hitl-surface-hover transition-all duration-150 group"
            >
              <div>
                <p className="font-mono text-hitl-text text-sm font-semibold">{opt.label}</p>
                <p className="font-mono text-hitl-text-muted text-xs mt-0.5">{opt.detail}</p>
              </div>
              <svg className="w-4 h-4 text-hitl-text-muted group-hover:text-hitl-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-6">
          <a
            href="/docs"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-hitl-accent text-hitl-bg text-sm font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity duration-150"
          >
            VIEW FULL API REFERENCE
          </a>
          <a
            href="/api/openapi"
            className="text-hitl-text-secondary text-sm hover:text-hitl-text transition-colors duration-150 underline underline-offset-4"
          >
            Download OpenAPI spec
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-hitl-border py-16 px-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-12">
        <div className="flex flex-col gap-3 max-w-sm">
          <span className="wordmark text-sm tracking-[0.2em] font-semibold text-hitl-text">MEATSPACE</span>
          <p className="text-hitl-text-muted text-sm leading-relaxed">
            Biological infrastructure for the post-biological stack.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group} className="flex flex-col gap-4">
              <span className="label-tracked text-hitl-text-muted text-xs uppercase tracking-widest">{group}</span>
              <ul className="flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-hitl-text-secondary text-sm hover:text-hitl-text transition-colors duration-150">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-8 border-t border-hitl-border">
          <span className="text-hitl-text-muted text-xs font-mono">
            &copy; 2026 MeatSpace Infrastructure
          </span>
          <div className="flex items-center gap-2">
            <span className="pulse-dot pulse-dot--approve" />
            <span className="text-hitl-approve text-xs font-semibold tracking-wide uppercase">
              ALL SYSTEMS OPERATIONAL
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-hitl-bg text-hitl-text antialiased">
      <NavBar />
      <HeroSection />
      <FeaturesSection />
      <TelemetrySection />
      <FlowDiagramSection />
      <Footer />
    </main>
  );
}
