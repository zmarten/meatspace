'use client';

import { useState } from 'react';

type Step = 'idle' | 'provisioning' | 'keyed' | 'requesting' | 'polling' | 'done';

export function TryItWidget() {
  const [step, setStep] = useState<Step>('idle');
  const [apiKey, setApiKey] = useState('');
  const [agentName, setAgentName] = useState('test-agent');
  const [email, setEmail] = useState('');
  const [requestId, setRequestId] = useState('');
  const [reviewUrl, setReviewUrl] = useState('');
  const [result, setResult] = useState<{ status: string; selected: string | null; selected_label: string | null } | null>(null);
  const [error, setError] = useState('');
  const [pollCount, setPollCount] = useState(0);

  async function provisionKey() {
    setError('');
    setStep('provisioning');
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agentName, email }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setApiKey(json.data.api_key);
      setStep('keyed');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to provision key');
      setStep('idle');
    }
  }

  async function submitRequest() {
    setError('');
    setStep('requesting');
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          agent_name: agentName,
          title: 'Test request from MeatSpace docs',
          content: 'This is a test dispatch from the interactive docs widget. Pick any option.',
          content_type: 'text',
          choices: [
            { id: 'approve', label: 'Approve' },
            { id: 'reject', label: 'Reject' },
          ],
          decision_reason: 'Testing the MeatSpace flow end-to-end.',
          timeout_seconds: 300,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setRequestId(json.data.id);
      setReviewUrl(json.data.review_url);
      setStep('polling');
      pollForResult(json.data.id, 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
      setStep('keyed');
    }
  }

  async function pollForResult(id: string, count: number) {
    if (count > 30) {
      setError('Timed out waiting for response. Open the review link and choose an option.');
      return;
    }
    setPollCount(count);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const json = await res.json();
      if (!json.success) return;
      if (json.data.status === 'completed' || json.data.status === 'expired') {
        setResult(json.data);
        setStep('done');
        return;
      }
      setTimeout(() => pollForResult(id, count + 1), 2000);
    } catch {
      setTimeout(() => pollForResult(id, count + 1), 3000);
    }
  }

  return (
    <div className="bg-hitl-surface border border-hitl-border rounded overflow-hidden">
      <div className="px-4 py-3 border-b border-hitl-border flex items-center gap-2">
        <span className="pulse-dot" />
        <span className="font-mono text-xs text-hitl-text-muted">INTERACTIVE</span>
        <span className="font-mono text-xs text-hitl-accent">TRY IT</span>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {error && (
          <div className="bg-hitl-reject-soft border border-hitl-reject/30 rounded px-3 py-2 text-xs text-hitl-reject font-mono">
            {error}
          </div>
        )}

        {/* Step 1: Provision key */}
        <div className="flex flex-col gap-2">
          <div className="label-tracked text-hitl-text-muted text-xs">STEP 1 — GET AN API KEY</div>
          {step === 'idle' || step === 'provisioning' ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Agent name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="bg-hitl-bg border border-hitl-border rounded px-3 py-2 text-xs font-mono text-hitl-text focus:border-hitl-accent outline-none"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-hitl-bg border border-hitl-border rounded px-3 py-2 text-xs font-mono text-hitl-text focus:border-hitl-accent outline-none"
              />
              <button
                onClick={provisionKey}
                disabled={step === 'provisioning' || !agentName || !email}
                className="self-start px-4 py-2 rounded-sm bg-hitl-accent text-hitl-bg text-xs font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {step === 'provisioning' ? 'CREATING...' : 'GET API KEY'}
              </button>
            </div>
          ) : (
            <div className="bg-hitl-bg border border-hitl-border rounded px-3 py-2 text-xs font-mono text-hitl-approve">
              Key provisioned: {apiKey.slice(0, 16)}...
            </div>
          )}
        </div>

        {/* Step 2: Send request */}
        {(step === 'keyed' || step === 'requesting' || step === 'polling' || step === 'done') && (
          <div className="flex flex-col gap-2">
            <div className="label-tracked text-hitl-text-muted text-xs">STEP 2 — SEND A REQUEST</div>
            {step === 'keyed' || step === 'requesting' ? (
              <button
                onClick={submitRequest}
                disabled={step === 'requesting'}
                className="self-start px-4 py-2 rounded-sm bg-hitl-accent text-hitl-bg text-xs font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {step === 'requesting' ? 'SENDING...' : 'SEND TEST REQUEST'}
              </button>
            ) : (
              <div className="bg-hitl-bg border border-hitl-border rounded px-3 py-2 text-xs font-mono text-hitl-approve">
                Request created: {requestId.slice(0, 8)}...
              </div>
            )}
          </div>
        )}

        {/* Step 3: Poll & review */}
        {(step === 'polling' || step === 'done') && (
          <div className="flex flex-col gap-2">
            <div className="label-tracked text-hitl-text-muted text-xs">STEP 3 — HUMAN REVIEWS</div>
            {step === 'polling' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-mono text-hitl-text-secondary">
                  <span className="pulse-dot" />
                  Waiting for human response... (poll #{pollCount})
                </div>
                <a
                  href={reviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start px-4 py-2 rounded-sm border border-hitl-accent text-hitl-accent text-xs font-semibold uppercase tracking-wide hover:bg-hitl-accent/10 transition-colors"
                >
                  OPEN REVIEW PAGE
                </a>
              </div>
            )}
            {step === 'done' && result && (
              <pre className="bg-hitl-bg border border-hitl-border rounded p-3 font-mono text-xs text-hitl-approve leading-relaxed overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
