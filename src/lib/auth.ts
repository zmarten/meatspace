// Use Web Crypto globals — Edge runtime does not allow `import ... from 'crypto'`

/** Constant-time string comparison to prevent timing attacks. */
function timingSafeCompare(a: string, b: string): boolean {
  const aBuf = new TextEncoder().encode(a);
  const bBuf = new TextEncoder().encode(b);
  if (aBuf.length !== bBuf.length) return false;
  let result = 0;
  for (let i = 0; i < aBuf.length; i++) result |= aBuf[i] ^ bBuf[i];
  return result === 0;
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(30);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return 'hitl_' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
  if (envKey && timingSafeCompare(bearerToken, envKey)) return true;

  // Mock mode: accept the dev key only outside production
  if (process.env.NODE_ENV !== 'production' && process.env.USE_MOCK === 'true') {
    if (timingSafeCompare(bearerToken, 'hitl_mock-dev-key-for-local-testing')) return true;
  }

  return false;
}
