export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { validateAdminSession, validateApiKey } from '@/lib/auth';
import { createHitlRequest } from '@/lib/requests';
import { CreateRequestBody } from '@/types';
import { withCors, corsOptionsResponse } from '@/lib/cors';

export async function POST(req: NextRequest) {
  const bearerToken = req.headers.get('authorization')?.replace(/^bearer\s+/i, '');
  if (!bearerToken) {
    return withCors(NextResponse.json(
      { success: false, error: 'Unauthorized: valid Bearer token required' },
      { status: 401 }
    ));
  }

  const auth = await validateApiKey(bearerToken);
  if (!auth.valid) {
    return withCors(NextResponse.json(
      { success: false, error: 'Unauthorized: valid Bearer token required' },
      { status: 401 }
    ));
  }

  let body: CreateRequestBody;
  try {
    body = await req.json();
  } catch {
    return withCors(NextResponse.json(
      { success: false, error: 'Invalid request body', code: 'invalid_request_body' },
      { status: 400 }
    ));
  }

  const result = await createHitlRequest({ body, apiKeyId: auth.keyId });

  if ('error' in result) {
    return withCors(NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: result.status }
    ));
  }

  return withCors(NextResponse.json({ success: true, data: result.data }, { status: 201 }));
}

export async function OPTIONS() {
  return corsOptionsResponse('GET, POST, OPTIONS', 'Content-Type, Authorization');
}

export async function GET(req: NextRequest) {
  const sessionValue = req.cookies.get('hitl_admin_session')?.value;
  const isAdmin = await validateAdminSession(sessionValue);
  if (!isAdmin) {
    return withCors(NextResponse.json(
      { success: false, error: 'Unauthorized: admin session required' },
      { status: 401 }
    ));
  }

  const supabase = await createServiceClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10) || 0;

  let query = supabase
    .from('hitl_requests')
    .select(
      'id, agent_name, title, content, content_type, choices, callback_url, metadata, status, selected, responded_at, expires_at, created_at, updated_at, api_key_id'
    )
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1);

  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch requests' }, { status: 500 });
  }
  return NextResponse.json({ success: true, data });
}
