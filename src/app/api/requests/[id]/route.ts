export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { reviewTokenMatches, authorizeRequestAccess } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import { isAllowedCallbackUrl } from '@/lib/auth';

function extractBearer(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (!header) return null;
  const match = header.match(/^bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
import { deliverWebhook } from '@/lib/webhooks';
import { toPollResponse } from '@/lib/request-contract';

async function getAuthorizedReviewRequest(req: NextRequest, id: string) {
  const reviewToken = req.headers.get('x-review-token');
  if (!reviewToken) {
    return { request: null, notFound: true as const };
  }

  const supabase = await createServiceClient();
  const { data: request, error } = await supabase
    .from('hitl_requests')
    .select('id, agent_name, title, content, content_type, choices, callback_url, metadata, status, selected, responded_at, expires_at, review_token_hash')
    .eq('id', id)
    .single();

  if (error || !request) {
    return { request: null, notFound: true as const };
  }

  const isAuthorized = await reviewTokenMatches(reviewToken, request.review_token_hash);
  if (!isAuthorized) {
    return { request: null, notFound: true as const };
  }

  return { request, notFound: false as const };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const bearerToken = extractBearer(req);
  const reviewToken = req.headers.get('x-review-token');
  if (!bearerToken && !reviewToken) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Bearer token or x-review-token required' },
      { status: 401 }
    );
  }

  const authorized = await authorizeRequestAccess(id, bearerToken, reviewToken);
  if (!authorized) {
    return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
  }

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('hitl_requests')
    .select('id, status, selected, responded_at, expires_at, choices')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
  }

  if (data.expires_at && new Date(data.expires_at) < new Date() && data.status === 'pending') {
    await supabase.from('hitl_requests').update({ status: 'expired' }).eq('id', id);
    data.status = 'expired';
  }

  return NextResponse.json({
    success: true,
    data: toPollResponse(data),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authorized = await getAuthorizedReviewRequest(req, id);
  if (authorized.notFound || !authorized.request) {
    return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
  }

  const request = authorized.request;
  const supabase = await createServiceClient();

  if (request.expires_at && new Date(request.expires_at) < new Date() && request.status === 'pending') {
    await supabase
      .from('hitl_requests')
      .update({ status: 'expired' })
      .eq('id', id)
      .eq('status', 'pending');
    return NextResponse.json(
      { success: false, error: 'Request has expired', code: 'request_expired' },
      { status: 410 }
    );
  }

  if (request.status === 'completed') {
    return NextResponse.json(
      { success: false, error: 'Request already completed', code: 'request_already_completed' },
      { status: 409 }
    );
  }

  if (request.status === 'expired') {
    return NextResponse.json(
      { success: false, error: 'Request has expired', code: 'request_expired' },
      { status: 410 }
    );
  }

  let body: { selected_option: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body', code: 'invalid_request_body' },
      { status: 400 }
    );
  }

  if (!body.selected_option || typeof body.selected_option !== 'string') {
    return NextResponse.json(
      { success: false, error: 'selected_option is required', code: 'selected_option_required' },
      { status: 400 }
    );
  }

  const validChoiceIds = (request.choices || []).map((choice: { id: string }) => choice.id);
  if (!validChoiceIds.includes(body.selected_option)) {
    return NextResponse.json(
      {
        success: false,
        error: `selected_option must be one of: ${validChoiceIds.join(', ')}`,
        code: 'invalid_selected_option',
      },
      { status: 400 }
    );
  }

  const selectedLabel =
    (request.choices || []).find(
      (choice: { id: string; label: string }) => choice.id === body.selected_option
    )?.label ?? null;

  if (!selectedLabel) {
    return NextResponse.json(
      {
        success: false,
        error: 'selected_option did not resolve to a known choice',
        code: 'invalid_selected_option',
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { data: updatedRows, error: updateError } = await supabase
    .from('hitl_requests')
    .update({
      status: 'completed',
      selected: body.selected_option,
      responded_at: now,
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id');

  if (updateError) {
    return NextResponse.json(
      { success: false, error: 'Failed to submit response', code: 'request_update_failed' },
      { status: 500 }
    );
  }

  if (!updatedRows || updatedRows.length === 0) {
    const { data: latest } = await supabase
      .from('hitl_requests')
      .select('status, expires_at')
      .eq('id', id)
      .single();

    if (!latest) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    if (
      latest.status === 'expired' ||
      (latest.expires_at && new Date(latest.expires_at) < new Date())
    ) {
      return NextResponse.json(
        { success: false, error: 'Request has expired', code: 'request_expired' },
        { status: 410 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Request already completed', code: 'request_already_completed' },
      { status: 409 }
    );
  }

  if (request.callback_url && isAllowedCallbackUrl(request.callback_url)) {
    await deliverWebhook({
      url: request.callback_url,
      payload: {
        event: 'request.completed',
        request_id: id,
        selected: body.selected_option,
        selected_label: selectedLabel,
        responded_at: now,
        expires_at: request.expires_at,
        metadata: request.metadata || {},
      },
      secret: process.env.HITL_WEBHOOK_SECRET,
    }).catch((err) => console.error('Webhook delivery failed:', err));
  }

  return NextResponse.json({
    success: true,
    data: {
      id,
      status: 'completed',
      selected: body.selected_option,
      selected_label: selectedLabel,
      responded_at: now,
      expires_at: request.expires_at,
    },
  });
}
