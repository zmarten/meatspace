import { timingSafeEqual, randomBytes } from 'crypto';

export function generateApiKey(): string {
  return 'hitl_' + randomBytes(30).toString('base64url');
}

export function isAllowedCallbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname;
    // IPv4 private/loopback ranges
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;
    if (host.startsWith('10.')) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    if (host.startsWith('192.168.')) return false;
    if (host.startsWith('169.254.')) return false;
    // IPv6 loopback and private ranges
    if (host === '::1') return false;
    if (host.startsWith('fd')) return false; // fd00::/8 ULA range
    if (host.startsWith('::ffff:127.') || host.startsWith('::ffff:0:127.')) return false; // ::ffff: loopback
    // Bracketed IPv6 forms in the raw URL string
    if (url.includes('[::1]')) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a Bearer token against the HITL_API_KEY env var using timing-safe comparison.
 * In mock mode, also accepts the hardcoded dev key — but never in production.
 */
export function validateApiKey(bearerToken: string): boolean {
  const envKey = process.env.HITL_API_KEY;
  if (envKey) {
    try {
      const a = Buffer.from(bearerToken);
      const b = Buffer.from(envKey);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      // ignore buffer errors — fall through to false
    }
  }

  // Mock mode: accept the dev key only outside production
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.USE_MOCK === 'true'
  ) {
    const mockKey = 'hitl_mock-dev-key-for-local-testing';
    try {
      const a = Buffer.from(bearerToken);
      const b = Buffer.from(mockKey);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      // ignore
    }
  }

  return false;
}
