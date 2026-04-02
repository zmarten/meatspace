import { createHmac } from 'crypto';

/**
 * Delivers a webhook with HMAC-SHA256 signature for authenticity verification.
 *
 * Verification algorithm for SDK authors:
 *   1. Read the X-HITL-Timestamp and X-HITL-Signature headers
 *   2. Reconstruct the signing payload: `${timestamp}.${JSON.stringify(body)}`
 *   3. Compute HMAC-SHA256 of the payload using the API key hash as the secret
 *   4. Compare the computed hex digest to the signature (use constant-time comparison)
 *   5. Optionally reject if timestamp is older than 5 minutes to prevent replay
 */
export async function deliverWebhook(params: {
  url: string;
  payload: object;
  apiKeyHash: string;
}): Promise<{ success: boolean; error?: string }> {
  const { url, payload, apiKeyHash } = params;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify(payload);
  const signingPayload = `${timestamp}.${body}`;
  const signature = createHmac('sha256', apiKeyHash).update(signingPayload).digest('hex');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HITL-Timestamp': timestamp,
        'X-HITL-Signature': signature,
      },
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
