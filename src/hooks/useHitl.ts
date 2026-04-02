'use client';

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef, useState, useCallback } from 'react';
import { HitlRequest, RequestStatus } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useRequests(statusFilter: RequestStatus | 'all' = 'pending') {
  const [requests, setRequests] = useState<HitlRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchRequests = useCallback(async () => {
    let query = supabase
      .from('hitl_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (!error && data) {
      setRequests(data as HitlRequest[]);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();

    // Subscribe to realtime changes
    channelRef.current = supabase
      .channel('hitl-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hitl_requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRequests(prev => [payload.new as HitlRequest, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setRequests(prev =>
              prev.map(r => r.id === (payload.new as HitlRequest).id ? payload.new as HitlRequest : r)
            );
          } else if (payload.eventType === 'DELETE') {
            setRequests(prev => prev.filter(r => r.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [fetchRequests]);

  return { requests, loading, refetch: fetchRequests };
}

export function useStats() {
  const [stats, setStats] = useState({
    pending_count: 0,
    completed_count: 0,
    expired_count: 0,
    last_24h_count: 0,
    avg_response_time_ms: 0,
    unique_agents: 0,
    total_revenue_usdc: 0,
    revenue_24h_usdc: 0,
    pending_binary: 0,
    pending_choice: 0,
    pending_text: 0,
    daily_request_count: 0,
    top_expertise_demand: [] as any[],
    pending_proposals: [] as any[],
  });

  useEffect(() => {
    async function fetch() {
      const res = await globalThis.fetch('/api/stats');
      const json = await res.json();
      if (json.success) setStats(json.data);
    }
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, []);

  return stats;
}

export async function submitResponse(id: string, response: Record<string, any>) {
  const res = await fetch(`/api/requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response),
  });
  return res.json();
}
