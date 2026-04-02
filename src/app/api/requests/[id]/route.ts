import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { SubmitResponseBody } from '@/types';

// GET /api/requests/[id] - Poll request status (agent calls this)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const { id } = params;

  const { data, error } = await supabase
    .from('hitl_requests')
    .select('id, status, response, responded_at, expires_at')
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
    data: {
      id: data.id,
      status: data.status,
      response: data.response,
      responded_at: data.responded_at,
    },
  });
}

// PATCH /api/requests/[id] - Submit human response (dashboard calls this)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const { id } = params;

  // Get current request
  const { data: request, error: fetchError } = await supabase
    .from('hitl_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !request) {
    return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
  }

  if (request.status === 'completed') {
    return NextResponse.json({ success: false, error: 'Request already completed' }, { status: 409 });
  }

  if (request.status === 'expired') {
    return NextResponse.json({ success: false, error: 'Request has expired' }, { status: 410 });
  }

  try {
    const body: SubmitResponseBody = await req.json();
    const now = new Date();
    const responseTimeMs = now.getTime() - new Date(request.created_at).getTime();

    const { data, error } = await supabase
      .from('hitl_requests')
      .update({
        status: 'completed',
        response: body,
        responded_at: now.toISOString(),
        response_time_ms: responseTimeMs,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to submit response' }, { status: 500 });
    }

    // Fire webhook if configured
    if (request.callback_method === 'webhook' && request.callback_url) {
      try {
        await fetch(request.callback_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'request.completed',
            request_id: id,
            response: body,
            responded_at: now.toISOString(),
          }),
        });
      } catch (webhookErr) {
        console.error('Webhook delivery failed:', webhookErr);
        // Don't fail the response — webhook is best-effort
      }
    }

    return NextResponse.json({ success: true, data });

  } catch (err) {
    return NextResponse.json({ success: false, error: 'Invalid response body' }, { status: 400 });
  }
}
