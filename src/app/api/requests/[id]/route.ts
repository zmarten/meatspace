export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { isAllowedCallbackUrl } from '@/lib/auth';
import { deliverWebhook } from '@/lib/webhooks';
import { getSelectedLabel, toPollResponse } from '@/lib/request-contract';

// GET /api/requests/[id] — Poll request status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('hitl_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
  }

  // Check if expired
  if (data.expires_at && new Date(data.expires_at) < new Date() && data.status === 'pending') {
    await supabase.from('hitl_requests').update({ status: 'expired' }).eq('id', id);
    data.status = 'expired';
  }

  return NextResponse.json({
    success: true,
    data: toPollResponse(data),
  });
}

// PATCH /api/requests/[id] — Submit human response (called from review page, no auth)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServiceClient();

  // Fetch the request
  const { data: request, error: fetchError } = await supabase
    .from('hitl_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !request) {
    return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
  }

  // Clock check: treat pending requests whose expiry has passed as expired
  if (request.expires_at && new Date(request.expires_at) < new Date() && request.status === 'pending') {
    await supabase.from('hitl_requests').update({ status: 'expired' }).eq('id', id);
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

  // Validate selected_option matches a choice
  if (!body.selected_option || typeof body.selected_option !== 'string') {
    return NextResponse.json(
      { success: false, error: 'selected_option is required', code: 'selected_option_required' },
      { status: 400 }
    );
  }

  const validChoiceIds = (request.choices || []).map((c: { id: string }) => c.id);
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
    (request.choices || []).find((choice: { id: string; label: string }) => choice.id === body.selected_option)
      ?.label ?? null;

  if (!selectedLabel) {
    return NextResponse.json(
      { success: false, error: 'selected_option did not resolve to a known choice', code: 'invalid_selected_option' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('hitl_requests')
    .update({
      status: 'completed',
      selected: body.selected_option,
      responded_at: now,
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json(
      { success: false, error: 'Failed to submit response', code: 'request_update_failed' },
      { status: 500 }
    );
  }

  // Fire webhook if configured
  if (request.callback_url && isAllowedCallbackUrl(request.callback_url)) {
    void deliverWebhook({
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
