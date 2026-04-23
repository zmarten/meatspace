'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { HitlRequest, RequestStatus } from '@/types';

const isMockMode =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('mock-') ||
  process.env.USE_MOCK === 'true';

let supabase: any = null;
function getSupabase() {
  if (!supabase && !isMockMode) {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabase;
}

export function useRequests(statusFilter: RequestStatus | 'all' = 'pending') {
  const [requests, setRequests] = useState<HitlRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: statusFilter, limit: '100' });
      const res = await globalThis.fetch(`/api/requests?${params}`, {
        headers: { 'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET || '' },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setRequests(json.data as HitlRequest[]);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();

    if (isMockMode) {
      const interval = setInterval(fetchRequests, 3000);
      return () => clearInterval(interval);
    }

    const client = getSupabase();
    if (client) {
      const channelName = statusFilter === 'all' ? 'hitl-requests' : `hitl-requests-${statusFilter}`;
      const filter = statusFilter !== 'all' ? `status=eq.${statusFilter}` : undefined;
      channelRef.current = client
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'hitl_requests', ...(filter ? { filter } : {}) },
          () => fetchRequests()
        )
        .subscribe();
    }

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [fetchRequests]);

  return { requests, loading, refetch: fetchRequests };
}

export async function submitResponse(id: string, selectedOption: string) {
  const res = await fetch(`/api/requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selected_option: selectedOption }),
  });
  return res.json();
}
