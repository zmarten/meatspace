export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { generateApiKey, hashApiKey } from '@/lib/auth';
import { withCors, corsOptionsResponse } from '@/lib/cors';
import { checkIpRateLimit } from '@/lib/rate-limit';

const MAX_ACTIVE_KEYS_PER_EMAIL = 5;
const IP_RATE_LIMIT = 5;
const IP_RATE_WINDOW_SECONDS = 60 * 60;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!(await checkIpRateLimit(ip, 'keys', IP_RATE_LIMIT, IP_RATE_WINDOW_SECONDS))) {
    return withCors(NextResponse.json(
      { success: false, error: 'Too many key creation requests. Try again later.', code: 'ip_rate_limit' },
      { status: 429 }
    ));
  }

  let body: { name?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return withCors(NextResponse.json(
      { success: false, error: 'Invalid request body', code: 'invalid_request_body' },
      { status: 400 }
    ));
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return withCors(NextResponse.json(
      { success: false, error: 'name is required', code: 'name_required' },
      { status: 400 }
    ));
  }

  if (body.name.length > 100) {
    return withCors(NextResponse.json(
      { success: false, error: 'name max 100 characters', code: 'name_too_long' },
      { status: 400 }
    ));
  }

  if (!body.email || typeof body.email !== 'string') {
    return withCors(NextResponse.json(
      { success: false, error: 'email is required', code: 'email_required' },
      { status: 400 }
    ));
  }

  const email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return withCors(NextResponse.json(
      { success: false, error: 'Invalid email address', code: 'invalid_email' },
      { status: 400 }
    ));
  }

  const supabase = await createServiceClient();

  // Rate limit: max active keys per email
  const { count } = await supabase
    .from('hitl_api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('owner_email', email)
    .eq('is_active', true);

  if (count !== null && count >= MAX_ACTIVE_KEYS_PER_EMAIL) {
    return withCors(NextResponse.json(
      {
        success: false,
        error: `Maximum ${MAX_ACTIVE_KEYS_PER_EMAIL} active keys per email address`,
        code: 'rate_limit_exceeded',
      },
      { status: 429 }
    ));
  }

  const apiKey = generateApiKey();
  const keyHash = await hashApiKey(apiKey);
  const keyPrefix = apiKey.slice(0, 12);

  const { data, error } = await supabase
    .from('hitl_api_keys')
    .insert({
      name: body.name.trim(),
      key_hash: keyHash,
      key_prefix: keyPrefix,
      owner_email: email,
      is_active: true,
    })
    .select('id, name, key_prefix')
    .single();

  if (error) {
    console.error('API key creation error:', error);
    return withCors(NextResponse.json(
      { success: false, error: 'Failed to create API key', code: 'key_create_failed' },
      { status: 500 }
    ));
  }

  // Intentionally do NOT email the api_key — without verifying the address
  // belongs to the caller, the welcome email is an unauthenticated spam
  // vector. The key is returned in the HTTP response only.

  return withCors(NextResponse.json({
    success: true,
    data: {
      id: data.id,
      name: data.name,
      key_prefix: data.key_prefix,
      api_key: apiKey,
    },
  }, { status: 201 }));
}

export async function OPTIONS() {
  return corsOptionsResponse('POST, OPTIONS', 'Content-Type');
}
