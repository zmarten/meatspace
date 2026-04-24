'use client';

export const runtime = 'edge';

import { useState } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HitlRequest, RequestStatus } from '@/types';
import { useRequests } from '@/hooks/useHitl';

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

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
      className={`w-full text-left p-4 rounded border transition-all duration-150 mb-2 ${
        selected
          ? 'border-hitl-accent bg-hitl-accent-soft/30'
          : 'border-hitl-border bg-hitl-surface hover:border-hitl-border-hover hover:bg-hitl-surface-hover'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-sm font-medium text-hitl-text truncate">{request.title}</span>
        <span className="text-xs text-hitl-text-muted whitespace-nowrap flex-shrink-0">
          {timeAgo(request.created_at)}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-hitl-text-secondary font-mono tracking-wider">
          {request.agent_name}
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-sm bg-hitl-accent-soft text-hitl-accent font-mono tracking-wider">
          {request.choices?.length || 0} choices
        </span>
        {request.status === 'completed' && (
          <span className="text-[11px] text-hitl-approve font-mono tracking-wider uppercase bg-hitl-approve-soft px-1.5 py-0.5 rounded-sm">
            resolved
          </span>
        )}
        {request.status === 'expired' && (
          <span className="text-[11px] text-hitl-reject font-mono tracking-wider uppercase bg-hitl-reject-soft px-1.5 py-0.5 rounded-sm">
            decayed
          </span>
        )}
      </div>
    </button>
  );
}

function DetailPanel({ request }: { request: HitlRequest }) {
  if (request.status === 'completed') {
    return (
      <div className="bg-hitl-surface rounded border border-hitl-border p-5">
        <h3 className="text-base font-medium text-hitl-text mb-1">{request.title}</h3>
        <p className="text-xs font-mono text-hitl-text-secondary mb-4">{request.agent_name}</p>
        <div className="bg-hitl-approve-soft rounded p-4">
          <p className="label-tracked-accent mb-1">Flesh Resolution</p>
          <p className="text-sm text-hitl-text">
            Selected: <span className="font-mono">{request.selected}</span>
          </p>
          {request.responded_at && (
            <p className="text-xs text-hitl-text-muted mt-1">
              at {new Date(request.responded_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (request.status === 'expired') {
    return (
      <div className="relative bg-hitl-surface rounded border border-hitl-border p-5 state-decayed scanlines">
        <h3 className="text-base font-medium text-hitl-text mb-2">{request.title}</h3>
        <div className="bg-hitl-reject-soft rounded p-4">
          <p className="font-mono text-xs text-hitl-reject">[DECAY_408] Dispatch window expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-hitl-surface rounded border border-hitl-border p-5">
      <h3 className="text-base font-medium text-hitl-text mb-1">{request.title}</h3>
      <p className="text-xs font-mono text-hitl-text-secondary mb-4">{request.agent_name}</p>

      {request.content && (
        <div className="bg-hitl-surface-hover rounded p-3 mb-4 border border-hitl-border">
          <p className="label-tracked mb-1">Content</p>
          <p className="text-sm text-hitl-text-secondary whitespace-pre-wrap">{request.content}</p>
        </div>
      )}

      <p className="label-tracked mb-2">Choices</p>
      <div className="grid gap-2 mb-4">
        {(request.choices || []).map((choice) => (
          <div
            key={choice.id}
            className="text-left p-3.5 rounded border border-hitl-border bg-hitl-surface-hover"
          >
            <p className="text-sm font-medium text-hitl-text">{choice.label}</p>
            <p className="text-[11px] text-hitl-text-muted font-mono">{choice.id}</p>
          </div>
        ))}
      </div>

      <div className="rounded border border-hitl-border bg-hitl-surface-hover p-3">
        <p className="text-xs font-mono text-hitl-text-muted uppercase tracking-[0.16em]">
          Review tokens stay in the one-click human link only.
        </p>
        <p className="text-sm text-hitl-text-secondary mt-2">
          This admin dashboard is read-only for pending requests after the security hardening update.
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [filter, setFilter] = useState<RequestStatus | 'all'>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const { requests, loading, unauthorized } = useRequests('all');

  const filteredRequests =
    filter === 'all' ? requests : requests.filter((request) => request.status === filter);

  const selectedRequest = requests.find((request) => request.id === selectedId);

  const counts = {
    pending: requests.filter((request) => request.status === 'pending').length,
    completed: requests.filter((request) => request.status === 'completed').length,
    expired: requests.filter((request) => request.status === 'expired').length,
  };

  const filters: { label: string; value: RequestStatus | 'all'; count?: number }[] = [
    { label: 'Queued', value: 'pending', count: counts.pending },
    { label: 'Resolved', value: 'completed', count: counts.completed },
    { label: 'Decayed', value: 'expired', count: counts.expired },
    { label: 'All', value: 'all' },
  ];

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/session', { method: 'DELETE' });
    } finally {
      router.push('/dashboard/login');
      router.refresh();
    }
  }

  useEffect(() => {
    if (unauthorized) {
      router.push('/dashboard/login');
    }
  }, [router, unauthorized]);

  if (unauthorized) return null;

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-3 mb-2">
              <h1 className="wordmark">MEATSPACE</h1>
              <span className="text-[11px] text-hitl-text-muted tracking-[0.15em] uppercase">
                dispatch queue
              </span>
            </div>
            <p className="text-sm text-hitl-text-secondary">
              {counts.pending > 0
                ? `${counts.pending} dispatch${counts.pending === 1 ? '' : 'es'} awaiting wetware resolution.`
                : 'Queue nominal. Flesh Node standing by.'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-4 py-2 rounded-sm border border-hitl-border text-xs font-semibold uppercase tracking-wide text-hitl-text-secondary hover:text-hitl-text hover:border-hitl-border-hover transition-all disabled:opacity-50"
          >
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Queued', value: counts.pending, pulse: counts.pending > 0 },
            { label: 'Resolved', value: counts.completed, pulse: false },
            { label: 'Decayed', value: counts.expired, pulse: false },
          ].map((item) => (
            <div
              key={item.label}
              className={`bg-hitl-surface rounded p-4 border border-hitl-border${
                item.pulse ? ' border-t-2 border-t-hitl-accent' : ''
              }`}
            >
              <p className="text-xs text-hitl-text-muted mb-1">{item.label}</p>
              <p
                className={`text-xl font-medium ${
                  item.pulse ? 'text-hitl-accent font-mono' : 'text-hitl-text'
                }`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
          <div>
            <div className="flex gap-2 mb-4">
              {filters.map((item) => (
                <button
                  key={item.value}
                  onClick={() => {
                    setFilter(item.value);
                    setSelectedId(null);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filter === item.value
                      ? 'bg-hitl-accent text-hitl-bg font-semibold'
                      : 'text-hitl-text-secondary hover:text-hitl-text hover:bg-hitl-surface-hover'
                  }`}
                >
                  {item.label}
                  {item.count !== undefined && (
                    <span className="ml-1.5 text-[10px] opacity-60">{item.count}</span>
                  )}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-12 text-hitl-text-muted text-sm">Acquiring...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-hitl-text-muted text-sm">
                No dispatches in this state.
              </div>
            ) : (
              <div>
                {filteredRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    selected={selectedId === request.id}
                    onClick={() => setSelectedId(request.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-10 self-start">
            {selectedRequest ? (
              <DetailPanel request={selectedRequest} />
            ) : (
              <div className="bg-hitl-surface rounded border border-hitl-border p-8 text-center">
                <p className="text-sm text-hitl-text-muted">Select a dispatch to inspect.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
