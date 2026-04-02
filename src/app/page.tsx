'use client';

import { useState } from 'react';
import { HitlRequest, RequestStatus, HitlResponse } from '@/types';
import { useRequests, useStats, submitResponse } from '@/hooks/useHitl';

// ─── Priority indicator ───
function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: 'bg-hitl-text-muted',
    normal: 'bg-blue-400',
    high: 'bg-amber-400',
    critical: 'bg-red-400',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[priority] || colors.normal}`} />
  );
}

// ─── Type badge ───
function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    approve_reject: 'approve / reject',
    choose_option: 'choose',
    free_text: 'free text',
    rate: 'rate',
    rank: 'rank',
  };
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-md bg-hitl-accent-soft text-hitl-accent font-medium">
      {labels[type] || type}
    </span>
  );
}

// ─── Time ago ───
function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// ─── Stats bar ───
function StatsBar() {
  const stats = useStats();
  const avgMin = stats.avg_response_time_ms
    ? `${Math.round(stats.avg_response_time_ms / 60000)}m`
    : '—';
  const rev = stats.total_revenue_usdc
    ? `$${Number(stats.total_revenue_usdc).toFixed(2)}`
    : '$0.00';

  const items = [
    { label: 'Pending', value: `${stats.pending_binary || 0}b ${stats.pending_choice || 0}c ${stats.pending_text || 0}t`, pulse: stats.pending_count > 0 },
    { label: 'Completed', value: stats.completed_count },
    { label: 'Revenue', value: rev, pulse: false },
    { label: 'Avg response', value: avgMin },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mb-8">
      {items.map((item) => (
        <div key={item.label} className="bg-hitl-surface rounded-lg p-4">
          <p className="text-xs text-hitl-text-muted mb-1">{item.label}</p>
          <p className={`text-xl font-medium ${item.pulse ? 'text-hitl-accent' : 'text-hitl-text'}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Request card ───
function RequestCard({
  request,
  selected,
  onClick,
}: {
  request: HitlRequest;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all duration-150 mb-2 ${
        selected
          ? 'border-hitl-accent bg-hitl-accent-soft/30'
          : 'border-hitl-border bg-hitl-surface hover:border-hitl-border-hover hover:bg-hitl-surface-hover'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <PriorityDot priority={request.priority} />
          <span className="text-sm font-medium text-hitl-text truncate">{request.title}</span>
        </div>
        <span className="text-xs text-hitl-text-muted whitespace-nowrap flex-shrink-0">
          {timeAgo(request.created_at)}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-hitl-text-secondary font-mono">{request.agent_name}</span>
        <TypeBadge type={request.request_type} />
        {request.tags?.map((t) => (
          <span key={t} className="text-[11px] text-hitl-text-muted">#{t}</span>
        ))}
        {request.status === 'completed' && (
          <span className="text-[11px] text-hitl-approve font-medium">completed</span>
        )}
        {request.status === 'expired' && (
          <span className="text-[11px] text-hitl-reject font-medium">expired</span>
        )}
      </div>
    </button>
  );
}

// ─── Response panel ───
function ResponsePanel({
  request,
  onSubmit,
}: {
  request: HitlRequest;
  onSubmit: (response: Record<string, any>) => void;
}) {
  const [reasoning, setReasoning] = useState('');
  const [freeText, setFreeText] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (response: Record<string, any>) => {
    setSubmitting(true);
    await onSubmit(response);
    setSubmitting(false);
    setReasoning('');
    setFreeText('');
    setSelectedOption(null);
    setRating(0);
  };

  // Completed state
  if (request.status === 'completed' && request.response) {
    const resp = request.response as HitlResponse;
    return (
      <div className="bg-hitl-surface rounded-lg border border-hitl-border p-5 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-hitl-text">{request.title}</h3>
          <span className="text-xs font-mono text-hitl-text-secondary">{request.agent_name}</span>
        </div>
        {request.description && (
          <p className="text-sm text-hitl-text-secondary mb-4 leading-relaxed">{request.description}</p>
        )}
        <div className="bg-hitl-approve-soft rounded-lg p-4">
          <p className="text-xs font-medium text-hitl-approve mb-1">Your response</p>
          {resp.decision && <p className="text-sm text-hitl-text capitalize">{resp.decision}</p>}
          {resp.text && <p className="text-sm text-hitl-text">{resp.text}</p>}
          {resp.selected_option && <p className="text-sm text-hitl-text">Chose: {resp.selected_option}</p>}
          {resp.rating && <p className="text-sm text-hitl-text">{'★'.repeat(resp.rating)}{'☆'.repeat(5 - resp.rating)}</p>}
          {resp.reasoning && <p className="text-xs text-hitl-text-secondary mt-1">{resp.reasoning}</p>}
        </div>
      </div>
    );
  }

  // Expired state
  if (request.status === 'expired') {
    return (
      <div className="bg-hitl-surface rounded-lg border border-hitl-border p-5">
        <h3 className="text-base font-medium text-hitl-text mb-2">{request.title}</h3>
        <div className="bg-hitl-reject-soft rounded-lg p-4">
          <p className="text-xs font-medium text-hitl-reject">This request has expired</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-hitl-surface rounded-lg border border-hitl-border p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-hitl-text">{request.title}</h3>
        <span className="text-xs font-mono text-hitl-text-secondary">{request.agent_name}</span>
      </div>

      {request.description && (
        <p className="text-sm text-hitl-text-secondary mb-5 leading-relaxed">{request.description}</p>
      )}

      {request.agent_context && (
        <div className="bg-hitl-surface-hover rounded-md p-3 mb-5 border border-hitl-border">
          <p className="text-[11px] text-hitl-text-muted mb-1 uppercase tracking-wider">Agent context</p>
          <p className="text-sm text-hitl-text-secondary">{request.agent_context}</p>
        </div>
      )}

      {/* Approve / Reject */}
      {request.request_type === 'approve_reject' && (
        <div>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Add reasoning (optional)..."
            className="w-full bg-hitl-bg border border-hitl-border rounded-lg p-3 text-sm text-hitl-text placeholder:text-hitl-text-muted resize-none min-h-[80px] focus:outline-none focus:border-hitl-accent transition-colors"
          />
          <div className="flex gap-3 mt-3">
            <button
              disabled={submitting}
              onClick={() => handleSubmit({ decision: 'approved', reasoning })}
              className="px-6 py-2.5 rounded-lg text-sm font-medium bg-hitl-approve text-hitl-bg hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Approve'}
            </button>
            <button
              disabled={submitting}
              onClick={() => handleSubmit({ decision: 'rejected', reasoning })}
              className="px-6 py-2.5 rounded-lg text-sm font-medium bg-hitl-reject-soft text-hitl-reject border border-hitl-reject/20 hover:bg-hitl-reject/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Choose Option */}
      {request.request_type === 'choose_option' && (
        <div>
          <div className="grid gap-2 mb-4">
            {(request.options || []).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedOption(opt.id)}
                className={`text-left p-3.5 rounded-lg border transition-all ${
                  selectedOption === opt.id
                    ? 'border-hitl-accent bg-hitl-accent-soft/30'
                    : 'border-hitl-border bg-hitl-surface-hover hover:border-hitl-border-hover'
                }`}
              >
                <p className="text-sm font-medium text-hitl-text">{opt.label}</p>
                {opt.description && (
                  <p className="text-xs text-hitl-text-secondary mt-1">{opt.description}</p>
                )}
              </button>
            ))}
          </div>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Add reasoning (optional)..."
            className="w-full bg-hitl-bg border border-hitl-border rounded-lg p-3 text-sm text-hitl-text placeholder:text-hitl-text-muted resize-none min-h-[60px] focus:outline-none focus:border-hitl-accent transition-colors"
          />
          <button
            disabled={!selectedOption || submitting}
            onClick={() => handleSubmit({ selected_option: selectedOption, reasoning })}
            className="mt-3 px-6 py-2.5 rounded-lg text-sm font-medium bg-hitl-text text-hitl-bg hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-30"
          >
            Submit choice
          </button>
        </div>
      )}

      {/* Free Text */}
      {request.request_type === 'free_text' && (
        <div>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Share your thoughts..."
            className="w-full bg-hitl-bg border border-hitl-border rounded-lg p-3 text-sm text-hitl-text placeholder:text-hitl-text-muted resize-none min-h-[120px] focus:outline-none focus:border-hitl-accent transition-colors"
          />
          <button
            disabled={!freeText.trim() || submitting}
            onClick={() => handleSubmit({ text: freeText })}
            className="mt-3 px-6 py-2.5 rounded-lg text-sm font-medium bg-hitl-text text-hitl-bg hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-30"
          >
            Send response
          </button>
        </div>
      )}

      {/* Rate */}
      {request.request_type === 'rate' && (
        <div>
          <div className="flex gap-1.5 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-2xl transition-colors ${
                  star <= rating ? 'text-amber-400' : 'text-hitl-text-muted hover:text-hitl-text-secondary'
                }`}
              >
                ★
              </button>
            ))}
            {rating > 0 && (
              <span className="text-xs text-hitl-text-secondary self-end ml-2 mb-1">{rating}/5</span>
            )}
          </div>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Add reasoning (optional)..."
            className="w-full bg-hitl-bg border border-hitl-border rounded-lg p-3 text-sm text-hitl-text placeholder:text-hitl-text-muted resize-none min-h-[60px] focus:outline-none focus:border-hitl-accent transition-colors"
          />
          <button
            disabled={!rating || submitting}
            onClick={() => handleSubmit({ rating, reasoning })}
            className="mt-3 px-6 py-2.5 rounded-lg text-sm font-medium bg-hitl-text text-hitl-bg hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-30"
          >
            Submit rating
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ───
export default function Dashboard() {
  const [filter, setFilter] = useState<RequestStatus | 'all'>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { requests, loading } = useRequests('all');

  const filteredRequests = filter === 'all'
    ? requests
    : requests.filter((r) => r.status === filter);

  const selectedRequest = requests.find((r) => r.id === selectedId);

  const handleResponse = async (response: Record<string, any>) => {
    if (!selectedId) return;
    await submitResponse(selectedId, response);
    setSelectedId(null);
  };

  const filters: { label: string; value: RequestStatus | 'all' }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Completed', value: 'completed' },
    { label: 'Expired', value: 'expired' },
    { label: 'All', value: 'all' },
  ];

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-baseline gap-3 mb-2">
            <h1 className="text-2xl font-medium tracking-tight">HITL</h1>
            <span className="text-[11px] text-hitl-text-muted tracking-[0.15em] uppercase">
              human-in-the-loop
            </span>
            <a href="/settings" className="text-xs text-hitl-accent hover:underline ml-auto">Settings</a>
          </div>
          <p className="text-sm text-hitl-text-secondary">
            Your agents are waiting for your taste, judgment, and opinion.
          </p>
        </div>

        {/* Stats */}
        <StatsBar />

        {/* Layout */}
        <div className="grid grid-cols-[1fr_1fr] gap-6">
          {/* Left: Queue */}
          <div>
            {/* Filters */}
            <div className="flex gap-2 mb-4">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => { setFilter(f.value); setSelectedId(null); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filter === f.value
                      ? 'bg-hitl-text text-hitl-bg'
                      : 'text-hitl-text-secondary hover:text-hitl-text hover:bg-hitl-surface-hover'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Request list */}
            {loading ? (
              <div className="text-center py-12 text-hitl-text-muted text-sm">Loading...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-hitl-text-muted text-sm">
                No {filter === 'all' ? '' : filter} requests.
                <br />
                <span className="text-xs">Your agents are independent today.</span>
              </div>
            ) : (
              <div>
                {filteredRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    selected={selectedId === req.id}
                    onClick={() => setSelectedId(req.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Response panel */}
          <div className="sticky top-10 self-start">
            {selectedRequest ? (
              <ResponsePanel request={selectedRequest} onSubmit={handleResponse} />
            ) : (
              <div className="bg-hitl-surface rounded-lg border border-hitl-border p-8 text-center">
                <p className="text-sm text-hitl-text-muted">
                  Select a request to review
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
