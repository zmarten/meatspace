'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { HitlRequest, ContentType } from '@/types';

type ViewState = 'loading' | 'pending' | 'completed' | 'expired' | 'not_found';

function escHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ContentRenderer({ content, contentType }: { content: string; contentType: ContentType }) {
  switch (contentType) {
    case 'html':
      return (
        <iframe
          srcDoc={content}
          sandbox=""
          className="w-full rounded border border-hitl-border bg-white"
          style={{ minHeight: '200px', maxHeight: '600px' }}
          title="Review content"
        />
      );
    case 'image': {
      const isValidUrl = /^https?:\/\//i.test(content);
      if (!isValidUrl) {
        return <p className="text-sm text-hitl-text-muted italic">Invalid image URL</p>;
      }
      return (
        <div className="flex justify-center">
          <img
            src={content}
            alt="Review content"
            className="max-w-full rounded border border-hitl-border"
          />
        </div>
      );
    }
    case 'markdown': {
      // Basic markdown: bold, italic, code, line breaks
      // Escape HTML first to prevent XSS, then apply markdown replacements
      const safe = escHtml(content);
      const rendered = safe
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code class="bg-hitl-surface-hover px-1 py-0.5 rounded text-xs font-mono">$1</code>')
        .replace(/\n/g, '<br/>');
      return (
        <div
          className="text-sm text-hitl-text-secondary leading-relaxed"
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      );
    }
    default:
      return (
        <p className="text-sm text-hitl-text-secondary leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      );
  }
}

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<HitlRequest | null>(null);
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchRequest() {
      try {
        const res = await fetch(`/api/review/${id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setRequest(json.data);
          setViewState(json.data.status as ViewState);
        } else {
          setViewState('not_found');
        }
      } catch {
        setViewState('not_found');
      }
    }
    fetchRequest();
  }, [id]);

  const handleSubmit = async () => {
    if (!selectedChoice || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_option: selectedChoice }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
        setViewState('completed');
      }
    } catch {
      // Allow retry
    }
    setSubmitting(false);
  };

  if (viewState === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="pulse-dot mx-auto mb-4" />
          <p className="text-sm text-hitl-text-muted">Acquiring dispatch...</p>
        </div>
      </main>
    );
  }

  if (viewState === 'not_found') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-lg font-medium text-hitl-text mb-2">Dispatch not found</p>
          <p className="text-sm text-hitl-text-muted">
            This request ID does not exist or has been removed.
          </p>
        </div>
      </main>
    );
  }

  if (viewState === 'expired') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="relative inline-block p-6 rounded border border-hitl-border state-decayed scanlines">
            <p className="font-mono text-xs text-hitl-reject mb-2">[DECAY_408]</p>
            <p className="text-sm text-hitl-text-secondary">
              This dispatch has expired. The requesting agent has been notified.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (viewState === 'completed' || submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-hitl-approve-soft flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-hitl-approve" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-medium text-hitl-text mb-2">Response transmitted</p>
          <p className="text-sm text-hitl-text-muted">
            {submitted ? 'Your selection has been dispatched to the requesting agent.' : 'This request has already been resolved.'}
          </p>
        </div>
      </main>
    );
  }

  // Pending state — show review UI
  const metadata = (request?.metadata || {}) as Record<string, unknown>;
  const agentCtx = (metadata._agent as Record<string, unknown>) ?? metadata;
  const recommendedOption = typeof agentCtx.recommended_option === 'string' ? agentCtx.recommended_option : null;
  const confidence = typeof agentCtx.confidence === 'number' ? agentCtx.confidence : null;
  const decisionReason = typeof agentCtx.decision_reason === 'string' ? agentCtx.decision_reason : null;
  const consequence = typeof agentCtx.consequence_of_wrong_choice === 'string' ? agentCtx.consequence_of_wrong_choice : null;
  const runId = typeof agentCtx.run_id === 'string' ? agentCtx.run_id : null;
  const traceId = typeof agentCtx.trace_id === 'string' ? agentCtx.trace_id : null;

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <p className="label-tracked mb-2">dispatch from</p>
          <p className="text-sm font-mono text-hitl-text-secondary mb-4">{request?.agent_name}</p>
          <h1 className="text-xl sm:text-2xl font-medium text-hitl-text leading-tight">
            {request?.title}
          </h1>
        </div>

        {(decisionReason || confidence !== null || consequence || recommendedOption || runId || traceId) && (
          <div className="bg-hitl-surface rounded border border-hitl-border p-4 sm:p-5 mb-6">
            <p className="label-tracked mb-3">agent context</p>
            <div className="grid gap-3">
              {decisionReason && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-hitl-text-muted mb-1">why this was escalated</p>
                  <p className="text-sm text-hitl-text-secondary leading-relaxed">{decisionReason}</p>
                </div>
              )}
              {consequence && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-hitl-text-muted mb-1">if this goes wrong</p>
                  <p className="text-sm text-hitl-text-secondary leading-relaxed">{consequence}</p>
                </div>
              )}
              {(confidence !== null || recommendedOption || runId || traceId) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {confidence !== null && (
                    <div className="rounded border border-hitl-border px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-hitl-text-muted mb-1">agent confidence</p>
                      <p className="text-sm font-mono text-hitl-text">{Math.round(confidence * 100)}%</p>
                    </div>
                  )}
                  {recommendedOption && (
                    <div className="rounded border border-hitl-border px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-hitl-text-muted mb-1">agent recommendation</p>
                      <p className="text-sm font-mono text-hitl-text">{recommendedOption}</p>
                    </div>
                  )}
                  {runId && (
                    <div className="rounded border border-hitl-border px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-hitl-text-muted mb-1">run id</p>
                      <p className="text-sm font-mono text-hitl-text break-all">{runId}</p>
                    </div>
                  )}
                  {traceId && (
                    <div className="rounded border border-hitl-border px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-hitl-text-muted mb-1">trace id</p>
                      <p className="text-sm font-mono text-hitl-text break-all">{traceId}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        {request?.content && (
          <div className="bg-hitl-surface rounded border border-hitl-border p-4 sm:p-5 mb-6">
            <ContentRenderer
              content={request.content}
              contentType={(request.content_type || 'text') as ContentType}
            />
          </div>
        )}

        {/* Choices */}
        <div className="mb-6">
          <p className="label-tracked mb-3">select one</p>
          <div className="grid gap-2">
            {(request?.choices || []).map((choice) => (
              <button
                key={choice.id}
                onClick={() => setSelectedChoice(choice.id)}
                className={`w-full text-left p-4 rounded border transition-all duration-150 ${
                  selectedChoice === choice.id
                    ? 'border-hitl-accent bg-hitl-accent-soft/30'
                    : 'border-hitl-border bg-hitl-surface hover:border-hitl-border-hover'
                }`}
                >
                  <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      selectedChoice === choice.id
                        ? 'border-hitl-accent'
                        : 'border-hitl-border-hover'
                    }`}
                  >
                    {selectedChoice === choice.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-hitl-accent" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-hitl-text">{choice.label}</span>
                    {recommendedOption === choice.id && (
                      <p className="text-[11px] uppercase tracking-[0.18em] text-hitl-accent mt-1">
                        Agent recommended
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          disabled={!selectedChoice || submitting}
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-sm text-sm font-semibold tracking-wide uppercase transition-all active:scale-[0.98] disabled:opacity-30 bg-hitl-accent text-hitl-bg hover:opacity-90"
        >
          {submitting ? 'Transmitting...' : 'Transmit selection'}
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-hitl-text-muted mt-8">
          Powered by <span className="font-medium text-hitl-text-secondary">MEATSPACE</span>
        </p>
      </div>
    </main>
  );
}
