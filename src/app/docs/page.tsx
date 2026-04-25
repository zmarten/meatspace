const createRequestExample = `{
  "agent_name": "design-agent",
  "title": "Which homepage hero should we ship?",
  "content": "<img src='https://example.com/hero-a.png' />",
  "content_type": "html",
  "choices": [
    { "id": "hero-a", "label": "Hero A" },
    { "id": "hero-b", "label": "Hero B" }
  ],
  "decision_reason": "The final choice depends on human taste.",
  "confidence": 0.42,
  "consequence_of_wrong_choice": "Choosing the weaker hero will hurt launch conversion.",
  "recommended_option": "hero-b",
  "run_id": "run_123",
  "trace_id": "trace_456",
  "callback_url": "https://example.com/webhooks/meatspace",
  "metadata": { "campaign": "spring-launch" },
  "timeout_seconds": 3600
}`;

const createResponseExample = `{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "review_url": "https://meatspace.run/review/uuid?token=opaque-review-token",
    "poll_url": "/api/requests/uuid",
    "expires_at": "2026-04-07T19:00:00.000Z"
  }
}`;

const pollExample = `{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "selected": "hero-b",
    "selected_label": "Hero B",
    "responded_at": "2026-04-07T18:10:00.000Z",
    "expires_at": "2026-04-07T19:00:00.000Z"
  }
}`;

const webhookExample = `{
  "event": "request.completed",
  "request_id": "uuid",
  "selected": "hero-b",
  "selected_label": "Hero B",
  "responded_at": "2026-04-07T18:10:00.000Z",
  "expires_at": "2026-04-07T19:00:00.000Z",
  "metadata": { "campaign": "spring-launch" }
}`;

const mcpExample = `{
  "mcpServers": {
    "meatspace": {
      "url": "https://meatspace.run/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`;

export default function DocsPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <a href="/" className="wordmark text-sm tracking-[0.2em] font-semibold text-hitl-text">
            MEATSPACE
          </a>
          <span className="label-tracked text-hitl-text-muted text-xs">API DOCS</span>
        </div>

        <h1 className="text-2xl font-semibold text-hitl-text mb-2">API Documentation</h1>
        <p className="text-sm text-hitl-text-secondary mb-10">
          MeatSpace exposes one core pattern: submit content plus 2-4 choices, then receive a structured decision from a human.
        </p>

        <div className="flex flex-col gap-12 text-sm text-hitl-text-secondary leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-hitl-text mb-4">When Agents Should Use MeatSpace</h2>
            <ul className="flex flex-col gap-2 list-disc ml-5">
              <li>Use it for subjective judgment, taste, approval, preference, or tie-breaks.</li>
              <li>Use it when your confidence is low and a wrong choice would be costly.</li>
              <li>Avoid it for deterministic checks or reversible low-stakes choices.</li>
              <li>Prefer 2-4 mutually exclusive options and include only the context needed for a fast decision.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-hitl-text mb-4">Get an API Key</h2>
            <p className="mb-3">
              Create a key instantly — no signup or approval required.
            </p>
            <Endpoint method="POST" path="/api/keys" />
            <CodeBlock code={`{\n  "name": "my-agent",\n  "email": "you@example.com"\n}`} />
            <p className="mt-3 mb-3">
              The response includes your <code className="bg-hitl-surface-hover px-1.5 py-0.5 rounded text-xs font-mono">api_key</code>. Save it — it is shown only once. Max 5 active keys per email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-hitl-text mb-4">Authentication</h2>
            <p className="mb-3">
              All other endpoints require a Bearer token in the <code className="bg-hitl-surface-hover px-1.5 py-0.5 rounded text-xs font-mono">Authorization</code> header.
            </p>
            <CodeBlock code={`Authorization: Bearer YOUR_API_KEY`} />
          </section>

          <section>
            <h2 className="text-lg font-medium text-hitl-text mb-4">Create Request</h2>
            <Endpoint method="POST" path="/api/requests" />
            <CodeBlock code={createRequestExample} />
            <h3 className="text-sm font-medium text-hitl-text mt-6 mb-3">Response (201)</h3>
            <CodeBlock code={createResponseExample} />
          </section>

          <section>
            <h2 className="text-lg font-medium text-hitl-text mb-4">Fields</h2>
            <div className="bg-hitl-surface rounded border border-hitl-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-hitl-border">
                    <th className="text-left px-4 py-2 text-hitl-text-muted font-medium">Field</th>
                    <th className="text-left px-4 py-2 text-hitl-text-muted font-medium">Required</th>
                    <th className="text-left px-4 py-2 text-hitl-text-muted font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hitl-border">
                  <FieldRow name="agent_name" required desc="Your agent or tool name" />
                  <FieldRow name="title" required desc="Short summary shown to the human reviewer" />
                  <FieldRow name="choices" required desc="2-4 objects with id and label" />
                  <FieldRow name="content" desc="Optional review content, up to 50KB" />
                  <FieldRow name="content_type" desc="text | markdown | html | image" />
                  <FieldRow name="decision_reason" desc="Why the agent is escalating to a human" />
                  <FieldRow name="confidence" desc="Agent confidence between 0 and 1" />
                  <FieldRow name="consequence_of_wrong_choice" desc="Why an incorrect decision would matter" />
                  <FieldRow name="recommended_option" desc="Optional choice id the agent currently recommends" />
                  <FieldRow name="run_id" desc="Optional workflow run identifier" />
                  <FieldRow name="trace_id" desc="Optional trace identifier" />
                  <FieldRow name="callback_url" desc="Allowlisted HTTPS webhook URL for async completion" />
                  <FieldRow name="metadata" desc="Arbitrary JSON echoed back in the webhook" />
                  <FieldRow name="timeout_seconds" desc="Request expiry in seconds, max 86400" />
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-hitl-text mb-4">Poll for Result</h2>
            <Endpoint method="GET" path="/api/requests/{id}" />
            <p className="mb-3">Returns a minimal status payload safe for agent polling.</p>
            <CodeBlock code={pollExample} />
          </section>

          <section>
            <h2 className="text-lg font-medium text-hitl-text mb-4">Long-Poll</h2>
            <Endpoint method="GET" path="/api/requests/{id}/wait?timeout=30000" />
            <p className="mb-3">Blocks until the human responds or timeout. Returns HTTP 202 while still pending.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-hitl-text mb-4">Webhook Callback</h2>
            <p className="mb-3">
              If <code className="bg-hitl-surface-hover px-1.5 py-0.5 rounded text-xs font-mono">callback_url</code> is set, MeatSpace POSTs this payload when the request completes:
            </p>
            <CodeBlock code={webhookExample} />
            <p className="mt-3">
              Verify HMAC signatures using
              <code className="bg-hitl-surface-hover px-1.5 py-0.5 rounded text-xs font-mono mx-1">X-HITL-Signature</code>
              and
              <code className="bg-hitl-surface-hover px-1.5 py-0.5 rounded text-xs font-mono mx-1">X-HITL-Timestamp</code>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-hitl-text mb-4">MCP Tools</h2>
            <p className="mb-3">
              MeatSpace exposes two MCP tools:
              <code className="bg-hitl-surface-hover px-1.5 py-0.5 rounded text-xs font-mono mx-1">get_service_status</code>
              and
              <code className="bg-hitl-surface-hover px-1.5 py-0.5 rounded text-xs font-mono mx-1">ask_human</code>.
            </p>
            <CodeBlock code={mcpExample} />
          </section>

          <section>
            <h2 className="text-lg font-medium text-hitl-text mb-4">Resources</h2>
            <ul className="flex flex-col gap-2">
              <li><a href="/api/openapi" className="text-hitl-accent hover:underline font-mono text-xs">OpenAPI 3.1 Spec</a></li>
              <li><a href="/llms.txt" className="text-hitl-accent hover:underline font-mono text-xs">llms.txt</a></li>
              <li><a href="/.well-known/agent.json" className="text-hitl-accent hover:underline font-mono text-xs">Agent Card</a></li>
              <li><a href="/.well-known/mcp.json" className="text-hitl-accent hover:underline font-mono text-xs">MCP Manifest</a></li>
              <li><a href="/api/status" className="text-hitl-accent hover:underline font-mono text-xs">Status</a></li>
            </ul>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-hitl-border">
          <a href="/" className="text-sm text-hitl-accent hover:underline">Back to home</a>
        </div>
      </div>
    </main>
  );
}

function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="bg-hitl-approve-soft text-hitl-approve text-xs font-mono font-semibold px-2 py-0.5 rounded">{method}</span>
      <code className="text-xs font-mono text-hitl-text">{path}</code>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-hitl-surface border border-hitl-border rounded p-4 font-mono text-xs text-hitl-text-secondary leading-relaxed overflow-x-auto">
      {code}
    </pre>
  );
}

function FieldRow({ name, required, desc }: { name: string; required?: boolean; desc: string }) {
  return (
    <tr>
      <td className="px-4 py-2 font-mono text-hitl-text">{name}</td>
      <td className="px-4 py-2">{required ? <span className="text-hitl-accent">Yes</span> : 'No'}</td>
      <td className="px-4 py-2">{desc}</td>
    </tr>
  );
}
