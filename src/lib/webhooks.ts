import { createHmac } from 'crypto';

/**
 * Delivers a webhook with HMAC-SHA256 signature for authenticity verification.
 *
 * Verification algorithm for SDK authors:
 *   1. Read the X-HITL-Timestamp and X-HITL-Signature headers
 *   2. Reconstruct the signing payload: `${timestamp}.${JSON.stringify(body)}`
 *   3. Compute HMAC-SHA256 of the payload using your shared MeatSpace webhook secret
 *   4. Compare the computed hex digest to the signature (use constant-time comparison)
 *   5. Optionally reject if timestamp is older than 5 minutes to prevent replay
 */
export async function deliverWebhook(params: {
  url: string;
  payload: object;
  secret?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { url, payload, secret } = params;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify(payload);

  // Only sign the payload when a real secret is configured; omit the
  // signature headers entirely if no secret is set to avoid producing a
  // valid-looking but forgeable HMAC signed with a garbage key.
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) {
    const signingPayload = `${timestamp}.${body}`;
    const signature = createHmac('sha256', secret).update(signingPayload).digest('hex');
    headers['X-HITL-Timestamp'] = timestamp;
    headers['X-HITL-Signature'] = signature;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      return { success: false, error: `Webhook returned ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.name === 'AbortError' ? 'Webhook timed out (10s)' : err.message };
  } finally {
    clearTimeout(timeout);
  }
}
