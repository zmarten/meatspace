import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import { createServiceClient } from './supabase';

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'hitl_';
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
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
