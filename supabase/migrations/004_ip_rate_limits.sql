-- Distributed IP rate limit storage.
--
-- Replaces the in-memory Map<string, …> in /api/keys and /api/mcp that did
-- not survive Cloudflare Workers isolate churn. With many isolates per
-- region, each request would land on an isolate with its own (often empty)
-- counter, letting an attacker mint far more than the advertised 5 keys
-- per IP per hour. This table + RPC gives a single source of truth.
--
-- See SECURITY_AUDIT note: confirmed live by minting 9 keys with 12 calls
-- before this migration shipped.

CREATE TABLE IF NOT EXISTS public.hitl_ip_rate_limits (
  ip text NOT NULL,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, bucket)
);

ALTER TABLE public.hitl_ip_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies — service_role bypasses RLS; nothing else may read or write.

COMMENT ON TABLE public.hitl_ip_rate_limits IS
  'Sliding-window IP rate limits. Service role only. Replaces broken in-memory map that did not survive Cloudflare Workers isolate churn.';

-- Atomic check-and-increment. Resets the counter when the previous window
-- has fully elapsed. Returns true iff the new count is within p_limit.
CREATE OR REPLACE FUNCTION public.hitl_check_ip_rate_limit(
  p_ip text,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_count integer;
BEGIN
  INSERT INTO public.hitl_ip_rate_limits AS r (ip, bucket, window_start, count)
  VALUES (p_ip, p_bucket, v_now, 1)
  ON CONFLICT (ip, bucket) DO UPDATE
    SET
      window_start = CASE
        WHEN r.window_start + (p_window_seconds || ' seconds')::interval < v_now
        THEN v_now
        ELSE r.window_start
      END,
      count = CASE
        WHEN r.window_start + (p_window_seconds || ' seconds')::interval < v_now
        THEN 1
        ELSE r.count + 1
      END
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.hitl_check_ip_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hitl_check_ip_rate_limit(text, text, integer, integer) TO service_role;
