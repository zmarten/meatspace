import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { isAllowedCallbackUrl } from '@/lib/auth';
import { deliverWebhook } from '@/lib/webhooks';
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

    // Runtime validation: response must match request type
    const rt = request.request_type;
    if (rt === 'approve_reject') {
      if (!body.decision || !['approved', 'rejected'].includes(body.decision)) {
        return NextResponse.json({ success: false, error: 'decision must be "approved" or "rejected"' }, { status: 400 });
      }
    } else if (rt === 'rate') {
      if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
        return NextResponse.json({ success: false, error: 'rating must be a number between 1 and 5' }, { status: 400 });
      }
    } else if (rt === 'choose_option') {
      if (!body.selected_option || typeof body.selected_option !== 'string') {
        return NextResponse.json({ success: false, error: 'selected_option is required as a string' }, { status: 400 });
      }
    } else if (rt === 'free_text') {
      if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
        return NextResponse.json({ success: false, error: 'text is required as a non-empty string' }, { status: 400 });
      }
    } else if (rt === 'rank') {
      if (!Array.isArray(body.ranking)) {
        return NextResponse.json({ success: false, error: 'ranking must be an array' }, { status: 400 });
      }
    }

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

    // Fire webhook if configured (with SSRF protection)
    if (request.callback_method === 'webhook' && request.callback_url) {
      if (!isAllowedCallbackUrl(request.callback_url)) {
        console.warn(`Blocked webhook to disallowed URL: ${request.callback_url}`);
      } else {
        let keyHash = 'unsigned';
        if (request.api_key_id) {
          const { data: keyData } = await supabase
            .from('hitl_api_keys')
            .select('key_hash')
            .eq('id', request.api_key_id)
            .single();
          if (keyData) keyHash = keyData.key_hash;
        }
        const result = await deliverWebhook({
          url: request.callback_url,
          payload: {
            event: 'request.completed',
            request_id: id,
            response: body,
            responded_at: now.toISOString(),
          },
          apiKeyHash: keyHash,
        });
        if (!result.success) {
          console.error('Webhook delivery failed:', result.error);
        }
      }
    }

    return NextResponse.json({ success: true, data });

  } catch (err) {
    return NextResponse.json({ success: false, error: 'Invalid response body' }, { status: 400 });
  }
}
