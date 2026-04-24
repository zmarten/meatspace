'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HitlRequest, RequestStatus, ApiKeyInfo, CreateApiKeyResponse } from '@/types';

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

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/keys', { credentials: 'same-origin' });
      const json = await res.json();
      if (json.success && json.data) {
        setKeys(json.data as ApiKeyInfo[]);
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  const createKey = useCallback(async (name: string, ownerEmail?: string): Promise<CreateApiKeyResponse | null> => {
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name, owner_email: ownerEmail || undefined }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        await fetchKeys();
        return json.data as CreateApiKeyResponse;
      }
    } catch (err) {
      console.error('Failed to create API key:', err);
    }
    return null;
  }, [fetchKeys]);

  const toggleKey = useCallback(async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ is_active: isActive }),
      });
      await fetchKeys();
    } catch (err) {
      console.error('Failed to toggle API key:', err);
    }
  }, [fetchKeys]);

  return { keys, loading, createKey, toggleKey };
}
