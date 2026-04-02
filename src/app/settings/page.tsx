'use client';

import { useEffect, useState, useCallback } from 'react';

interface OperatingConfig {
  timezone: string;
  weekly_schedule: Array<{ day: number; open: string; close: string; enabled: boolean }>;
  max_pending_binary: number;
  max_pending_choice: number;
  max_pending_text: number;
  max_daily_requests: number;
  force_open: boolean;
  force_closed: boolean;
  closed_message: string;
  target_response_binary: number;
  target_response_choice: number;
  target_response_text: number;
}

interface Pricing {
  effort_tier: string;
  price_usdc: number;
  description: string;
  max_description_chars: number;
  max_response_chars: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SettingsPage() {
  const [config, setConfig] = useState<OperatingConfig | null>(null);
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const fetchConfig = useCallback(async () => {
    const res = await fetch('/api/config');
    const json = await res.json();
    if (json.success) {
      setConfig(json.data.config);
      setPricing(json.data.pricing || []);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/stats');
    const json = await res.json();
    if (json.success) setStats(json.data);
  }, []);

  useEffect(() => { fetchConfig(); fetchStats(); }, [fetchConfig, fetchStats]);

  const saveConfig = async (updates: Partial<OperatingConfig>) => {
    setSaving(true);
    const res = await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    if (json.success) setConfig(json.data);
    setSaving(false);
  };

  const toggleDay = (dayIndex: number) => {
    if (!config) return;
    const newSchedule = config.weekly_schedule.map((s) =>
      s.day === dayIndex ? { ...s, enabled: !s.enabled } : s
    );
    saveConfig({ weekly_schedule: newSchedule });
  };

  const updateDayTime = (dayIndex: number, field: 'open' | 'close', value: string) => {
    if (!config) return;
    const newSchedule = config.weekly_schedule.map((s) =>
      s.day === dayIndex ? { ...s, [field]: value } : s
    );
    saveConfig({ weekly_schedule: newSchedule });
  };

  if (!config) return <div className="p-10 text-hitl-text-muted text-sm">Loading settings...</div>;

  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-10">
          <div className="flex items-baseline gap-3 mb-2">
            <h1 className="text-2xl font-medium tracking-tight text-hitl-text">Settings</h1>
            <a href="/" className="text-xs text-hitl-accent hover:underline">Back to queue</a>
          </div>
          <p className="text-sm text-hitl-text-secondary">Operating hours, queue caps, and demand signals.</p>
        </div>

        {/* Override controls */}
        <section className="mb-8">
          <h2 className="text-base font-medium text-hitl-text mb-4">Quick controls</h2>
          <div className="flex gap-3">
            <button
              onClick={() => saveConfig({ force_open: !config.force_open, force_closed: false })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                config.force_open
                  ? 'bg-hitl-approve text-hitl-bg'
                  : 'bg-hitl-surface border border-hitl-border text-hitl-text-secondary hover:border-hitl-border-hover'
              }`}
            >
              {config.force_open ? 'Forced OPEN' : 'Force open'}
            </button>
            <button
              onClick={() => saveConfig({ force_closed: !config.force_closed, force_open: false })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                config.force_closed
                  ? 'bg-hitl-reject text-white'
                  : 'bg-hitl-surface border border-hitl-border text-hitl-text-secondary hover:border-hitl-border-hover'
              }`}
            >
              {config.force_closed ? 'Forced CLOSED' : 'Force closed'}
            </button>
            {saving && <span className="text-xs text-hitl-text-muted self-center">Saving...</span>}
          </div>
        </section>

        {/* Weekly schedule */}
        <section className="mb-8">
          <h2 className="text-base font-medium text-hitl-text mb-4">Weekly schedule</h2>
          <div className="space-y-2">
            {config.weekly_schedule.map((s) => (
              <div key={s.day} className="flex items-center gap-3 bg-hitl-surface rounded-lg p-3 border border-hitl-border">
                <button
                  onClick={() => toggleDay(s.day)}
                  className={`w-24 text-left text-sm font-medium ${
                    s.enabled ? 'text-hitl-text' : 'text-hitl-text-muted line-through'
                  }`}
                >
                  {DAY_NAMES[s.day]}
                </button>
                {s.enabled ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={s.open}
                      onChange={(e) => updateDayTime(s.day, 'open', e.target.value)}
                      className="bg-hitl-bg border border-hitl-border rounded px-2 py-1 text-sm text-hitl-text"
                    />
                    <span className="text-xs text-hitl-text-muted">to</span>
                    <input
                      type="time"
                      value={s.close}
                      onChange={(e) => updateDayTime(s.day, 'close', e.target.value)}
                      className="bg-hitl-bg border border-hitl-border rounded px-2 py-1 text-sm text-hitl-text"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-hitl-text-muted">Closed</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Queue caps */}
        <section className="mb-8">
          <h2 className="text-base font-medium text-hitl-text mb-4">Queue limits</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Max pending binary', key: 'max_pending_binary', value: config.max_pending_binary },
              { label: 'Max pending choice', key: 'max_pending_choice', value: config.max_pending_choice },
              { label: 'Max pending text', key: 'max_pending_text', value: config.max_pending_text },
              { label: 'Max daily requests', key: 'max_daily_requests', value: config.max_daily_requests },
            ].map(({ label, key, value }) => (
              <div key={key} className="bg-hitl-surface rounded-lg p-3 border border-hitl-border">
                <label className="text-xs text-hitl-text-muted block mb-1">{label}</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => saveConfig({ [key]: parseInt(e.target.value) || 0 } as any)}
                  className="bg-hitl-bg border border-hitl-border rounded px-2 py-1 text-sm text-hitl-text w-full"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="mb-8">
          <h2 className="text-base font-medium text-hitl-text mb-4">Pricing (per request)</h2>
          <div className="space-y-2">
            {pricing.map((p) => (
              <div key={p.effort_tier} className="bg-hitl-surface rounded-lg p-3 border border-hitl-border flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-hitl-text capitalize">{p.effort_tier}</span>
                  <span className="text-xs text-hitl-text-muted ml-2">{p.description}</span>
                </div>
                <span className="text-sm font-mono text-hitl-accent">${p.price_usdc} USDC</span>
              </div>
            ))}
          </div>
        </section>

        {/* Demand signals */}
        {stats?.top_expertise_demand && (
          <section className="mb-8">
            <h2 className="text-base font-medium text-hitl-text mb-4">Demand signals</h2>
            <p className="text-xs text-hitl-text-muted mb-3">Agents are voting for expertise areas they need. Green = available, gray = not yet offered.</p>
            <div className="space-y-2">
              {stats.top_expertise_demand.map((cat: any) => (
                <div key={cat.slug} className="bg-hitl-surface rounded-lg p-3 border border-hitl-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cat.is_available ? 'bg-hitl-approve' : 'bg-hitl-text-muted'}`} />
                    <span className="text-sm text-hitl-text">{cat.name}</span>
                  </div>
                  <span className="text-xs text-hitl-text-secondary font-mono">{cat.vote_count} votes</span>
                </div>
              ))}
            </div>

            {stats.pending_proposals?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-hitl-text mb-2">Agent proposals</h3>
                {stats.pending_proposals.map((p: any) => (
                  <div key={p.id} className="bg-hitl-surface-hover rounded-lg p-3 border border-hitl-border mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-hitl-text">{p.proposed_name}</span>
                      <span className="text-xs text-hitl-text-muted">{p.agent_name}</span>
                    </div>
                    {p.proposed_description && (
                      <p className="text-xs text-hitl-text-secondary">{p.proposed_description}</p>
                    )}
                    {p.willingness_to_pay && (
                      <span className="text-xs text-hitl-accent">Willing to pay: ${p.willingness_to_pay}/req</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Revenue */}
        {stats && (
          <section className="mb-8">
            <h2 className="text-base font-medium text-hitl-text mb-4">Revenue</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-hitl-surface rounded-lg p-4">
                <p className="text-xs text-hitl-text-muted mb-1">Total revenue</p>
                <p className="text-xl font-medium text-hitl-accent">
                  ${Number(stats.total_revenue_usdc || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-hitl-surface rounded-lg p-4">
                <p className="text-xs text-hitl-text-muted mb-1">Last 24h</p>
                <p className="text-xl font-medium text-hitl-text">
                  ${Number(stats.revenue_24h_usdc || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-hitl-surface rounded-lg p-4">
                <p className="text-xs text-hitl-text-muted mb-1">Unique agents</p>
                <p className="text-xl font-medium text-hitl-text">{stats.unique_agents || 0}</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
