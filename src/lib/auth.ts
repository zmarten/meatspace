// Use Web Crypto globals â€” Edge runtime does not allow `import ... from 'crypto'`

const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const encoder = new TextEncoder();

function encodeUtf8(value: string) {
  return encoder.encode(value);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function textToBase64Url(value: string): string {
  return bytesToBase64Url(encodeUtf8(value));
}

function base64UrlToText(value: string): string | null {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  try {
    return atob(padded);
  } catch {
    return null;
  }
}

async function signValue(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encodeUtf8(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encodeUtf8(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

/** Constant-time string comparison to prevent timing attacks.
 *  Hashes both inputs with SHA-256 so comparison time is always
 *  fixed-length regardless of input lengths — no length oracle. */
export async function timingSafeCompare(a: string, b: string): Promise<boolean> {
  const [aHash, bHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encodeUtf8(a)),
    crypto.subtle.digest('SHA-256', encodeUtf8(b)),
  ]);
  const aBuf = new Uint8Array(aHash);
  const bBuf = new Uint8Array(bHash);
  let result = 0;
  for (let i = 0; i < aBuf.length; i++) result |= aBuf[i] ^ bBuf[i];
  return result === 0;
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(30);
  crypto.getRandomValues(bytes);
  return 'hitl_' + bytesToBase64Url(bytes);
}

export async function hashApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encodeUtf8(key));
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function generateReviewToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function hashReviewToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encodeUtf8(token));
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function reviewTokenMatches(
  token: string | null | undefined,
  tokenHash: string | null | undefined
) {
  if (!token || !tokenHash) return false;
  const computedHash = await hashReviewToken(token);
  return await timingSafeCompare(computedHash, tokenHash);
}

export function getAllowedWebhookHosts(): string[] {
  const raw = process.env.WEBHOOK_ALLOWED_HOSTS || '';
  return raw
    .split(',')
    .map(host => host.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedCallbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const allowedHosts = getAllowedWebhookHosts();
    if (allowedHosts.length === 0) return false;
    return allowedHosts.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export async function createAdminSessionValue(): Promise<string | null> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;

  const payload = textToBase64Url(
    JSON.stringify({
      exp: Date.now() + ADMIN_SESSION_TTL_MS,
      v: 1,
    })
  );
  const signature = await signValue(payload, secret);
  return `${payload}.${signature}`;
}

export async function validateAdminSession(sessionValue: string | undefined | null): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!sessionValue || !secret) return false;

  const [payload, signature] = sessionValue.split('.');
  if (!payload || !signature) return false;

  const expectedSignature = await signValue(payload, secret);
  if (!(await timingSafeCompare(signature, expectedSignature))) return false;

  const decoded = base64UrlToText(payload);
  if (!decoded) return false;

  try {
    const parsed = JSON.parse(decoded) as { exp?: number };
    return typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

/**
 * Verify a request is authorized to read a specific hitl_request.
 * Accepts either a Bearer API key or an x-review-token that matches the request's hash.
 */
export async function authorizeRequestAccess(
  requestId: string,
  bearerToken: string | null,
  reviewToken: string | null,
): Promise<boolean> {
  // Bearer API key — validates the key is active (doesn't check ownership of the specific request)
  if (bearerToken) {
    const auth = await validateApiKey(bearerToken);
    if (auth.valid) return true;
  }

  // Review token — must match the specific request's review_token_hash
  if (reviewToken) {
    const { createServiceClient } = await import('./supabase');
    const supabase = await createServiceClient();
    const { data } = await supabase
      .from('hitl_requests')
      .select('review_token_hash')
      .eq('id', requestId)
      .single();

    if (data) {
      return reviewTokenMatches(reviewToken, data.review_token_hash);
    }
  }

  return false;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  keyId: string | null;
  keyName: string | null;
}

/**
 * Validate a Bearer token by looking it up in the hitl_api_keys table (SHA-256 hash match).
 * Falls back to the HITL_API_KEY env var for backwards compatibility.
 * In mock mode, also accepts the hardcoded dev key.
 */
export async function validateApiKey(bearerToken: string): Promise<ApiKeyValidationResult> {
  const invalid: ApiKeyValidationResult = { valid: false, keyId: null, keyName: null };

  // Mock dev key — synchronous check before any DB call
  if (process.env.NODE_ENV !== 'production' && process.env.USE_MOCK === 'true') {
    if (await timingSafeCompare(bearerToken, 'hitl_mock-dev-key-for-local-testing')) {
      return { valid: true, keyId: null, keyName: 'Local Dev Key' };
    }
  }

  // DB lookup by hash
  try {
    const { createServiceClient } = await import('./supabase');
    const supabase = await createServiceClient();
    const keyHash = await hashApiKey(bearerToken);

    const { data } = await supabase
      .from('hitl_api_keys')
      .select('id, name, is_active')
      .eq('key_hash', keyHash)
      .single();

    if (data && data.is_active) {
      await supabase
        .from('hitl_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

      return { valid: true, keyId: data.id, keyName: data.name };
    }
  } catch {
    // DB lookup failed — fall through to env var check
  }

  // Env var fallback (backwards compatibility)
  const envKey = process.env.HITL_API_KEY;
  if (envKey && await timingSafeCompare(bearerToken, envKey)) {
    return { valid: true, keyId: null, keyName: null };
  }

  return invalid;
}
