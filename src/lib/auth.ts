import { createHash, randomBytes } from 'crypto';
import { NextRequest } from 'next/server';
import { createServiceClient } from './supabase';

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): string {
  return 'hitl_' + randomBytes(30).toString('base64url');
}

export function isAllowedCallbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
    if (host.startsWith('10.')) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    if (host.startsWith('192.168.')) return false;
    if (host.startsWith('169.254.')) return false;
    if (host === '0.0.0.0') return false;
    return true;
  } catch {
    return false;
  }
}

export async function validateApiKey(req: NextRequest): Promise<{ valid: boolean; keyId?: string; error?: string }> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header. Use: Bearer hitl_...' };
  }

  const apiKey = authHeader.slice(7);
  const keyHash = hashApiKey(apiKey);
  
  const supabase = createServiceClient();
  
  const { data, error } = await supabase
    .from('hitl_api_keys')
    .select('id, is_active')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Invalid API key' };
  }

  if (!data.is_active) {
    return { valid: false, error: 'API key is deactivated' };
  }

  // Update last_used_at
  await supabase
    .from('hitl_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return { valid: true, keyId: data.id };
}
