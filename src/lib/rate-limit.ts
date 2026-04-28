import { createServiceClient } from './supabase';

/**
 * DB-backed sliding-window rate limit. Replaces the per-isolate in-memory
 * Map<> that did not work on Cloudflare Workers — fresh isolates always
 * started with an empty map, so the limit was effectively never enforced.
 *
 * Fails closed: if the DB call errors, the request is denied. This is the
 * safer default for an unauthenticated key-creation endpoint where the
 * rate limit is the only line of defense between a script and the API.
 */
export async function checkIpRateLimit(
  ip: string,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase.rpc('hitl_check_ip_rate_limit', {
      p_ip: ip,
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error('Rate limit check failed:', error);
      return false;
    }
    return data === true;
  } catch (err) {
    console.error('Rate limit check exception:', err);
    return false;
  }
}
