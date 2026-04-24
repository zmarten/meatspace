'use client';

export const runtime = 'edge';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLoginPage() {
  const router = useRouter();
  const [secret, setSecret] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!secret || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });

      const json = await res.json();
      if (json.success) {
        router.push('/dashboard');
        router.refresh();
        return;
      }

      setError(json.error || 'Sign-in failed');
    } catch {
      setError('Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-hitl-surface border border-hitl-border rounded p-6">
        <p className="label-tracked mb-2">admin access</p>
        <h1 className="text-xl font-medium text-hitl-text mb-2">Dashboard sign-in</h1>
        <p className="text-sm text-hitl-text-secondary mb-6">
          Enter the admin secret to open the internal dispatch dashboard.
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-mono uppercase tracking-[0.16em] text-hitl-text-muted">
              Admin secret
            </span>
            <input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              className="w-full rounded border border-hitl-border bg-hitl-bg px-3 py-2 text-sm text-hitl-text outline-none focus:border-hitl-accent"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="text-sm text-hitl-reject">{error}</p>}

          <button
            type="submit"
            disabled={!secret || submitting}
            className="w-full py-3 rounded-sm text-sm font-semibold tracking-wide uppercase bg-hitl-accent text-hitl-bg hover:opacity-90 transition-all disabled:opacity-40"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
