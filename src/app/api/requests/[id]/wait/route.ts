export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { authorizeRequestAccess } from '@/lib/auth';
import { toPollResponse } from '@/lib/request-contract';
import { withCors, corsOptionsResponse } from '@/lib/cors';

function extractBearer(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const match = header.match(/^bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

// GET /api/requests/[id]/wait — Long-poll for response (agent blocks here)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const bearerToken = extractBearer(req);
  const reviewToken = req.headers.get('x-review-token');
  if (!bearerToken && !reviewToken) {
    return withCors(NextResponse.json(
      { success: false, error: 'Unauthorized: Bearer token or x-review-token required' },
      { status: 401 }
    ));
  }

  const authorized = await authorizeRequestAccess(id, bearerToken, reviewToken);
  if (!authorized) {
    return withCors(NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 }));
  }

  const supabase = await createServiceClient();
  const { searchParams } = new URL(req.url);
  // Cloudflare Workers wall-clock limit is 30s; cap at 25s to leave a safe margin
  const timeoutMs = Math.min(parseInt(searchParams.get('timeout') || '25000', 10) || 25000, 25000);

  const startTime = Date.now();
  let lastKnownExpiresAt: string | null = null;

  while (Date.now() - startTime < timeoutMs) {
    const { data, error } = await supabase
      .from('hitl_requests')
      .select('id, status, selected, responded_at, expires_at, choices')
      .eq('id', id)
      .single();

    if (error || !data) {
      return withCors(NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 }));
    }

    lastKnownExpiresAt = data.expires_at;

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date() && data.status === 'pending') {
      await supabase.from('hitl_requests').update({ status: 'expired' }).eq('id', id);
      return withCors(NextResponse.json({
        success: true,
        data: toPollResponse({ ...data, status: 'expired', selected: null, responded_at: null }),
      }));
    }

    // Return if terminal state
    if (data.status === 'completed' || data.status === 'expired') {
      return withCors(NextResponse.json({
        success: true,
        data: toPollResponse(data),
      }));
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Timeout — tell agent to retry
  return withCors(NextResponse.json({
    success: true,
    data: toPollResponse({
      id,
      agent_name: '',
      title: '',
      content: null,
      content_type: null,
      choices: [],
      metadata: {},
      status: 'pending',
      selected: null,
      responded_at: null,
      expires_at: lastKnownExpiresAt,
    }),
  }, { status: 202 }));
}

export async function OPTIONS(
  _req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  return corsOptionsResponse('GET, OPTIONS', 'Content-Type, Authorization, x-review-token');
}
