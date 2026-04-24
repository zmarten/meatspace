'use client';

import { useEffect, useRef, useState } from 'react';
import { HitlRequest, RequestStatus } from '@/types';

export function useRequests(statusFilter: RequestStatus | 'all' = 'pending') {
  const [requests, setRequests] = useState<HitlRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRequests() {
      try {
        const params = new URLSearchParams({ status: statusFilter, limit: '100' });
        const res = await globalThis.fetch(`/api/requests?${params}`, {
          credentials: 'same-origin',
        });

        if (res.status === 401) {
          if (!cancelled) {
            setUnauthorized(true);
            setLoading(false);
          }
          return;
        }

        const json = await res.json();
        if (!cancelled && json.success && json.data) {
          setRequests(json.data as HitlRequest[]);
          setUnauthorized(false);
        }
      } catch (err) {
        console.error('Failed to fetch requests:', err);
      }

      if (!cancelled) setLoading(false);
    }

    void fetchRequests();
    intervalRef.current = window.setInterval(() => {
      void fetchRequests();
    }, 5000);

    return () => {
      cancelled = true;
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [statusFilter]);

  return { requests, loading, unauthorized };
}
