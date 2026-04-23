export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createHitlRequest } from '@/lib/requests';
import { CreateRequestBody } from '@/types';

export async function POST(req: NextRequest) {
  let body: CreateRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body', code: 'invalid_request_body' },
      { status: 400 }
    );
  }

  const result = await createHitlRequest({ body });

  if ('error' in result) {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true, data: result.data }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const supabase = await createServiceClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10) || 0;

  let query = supabase
    .from('hitl_requests')
    .select('*')
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
