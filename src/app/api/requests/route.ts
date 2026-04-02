import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { validateApiKey, isAllowedCallbackUrl } from '@/lib/auth';
import { checkCapacity, getEffortTier } from '@/lib/capacity';
import { checkPayment } from '@/lib/payments';
import { createHitlRequest } from '@/lib/requests';
import { CreateRequestBody } from '@/types';

export async function POST(req: NextRequest) {
  let body: CreateRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.agent_name || !body.request_type || !body.title) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: agent_name, request_type, title' },
      { status: 400 }
    );
  }

  // Input length validation
  if (body.title.length > 200) {
    return NextResponse.json({ success: false, error: 'title exceeds 200 char limit' }, { status: 400 });
  }
  if (body.agent_name.length > 100) {
    return NextResponse.json({ success: false, error: 'agent_name exceeds 100 char limit' }, { status: 400 });
  }
  if (body.agent_context && body.agent_context.length > 2000) {
    return NextResponse.json({ success: false, error: 'agent_context exceeds 2000 char limit' }, { status: 400 });
  }
  if (body.category && body.category.length > 100) {
    return NextResponse.json({ success: false, error: 'category exceeds 100 char limit' }, { status: 400 });
  }
  if (body.callback_url && body.callback_url.length > 2048) {
    return NextResponse.json({ success: false, error: 'callback_url exceeds 2048 char limit' }, { status: 400 });
  }
  if (body.tags) {
    if (body.tags.length > 10) {
      return NextResponse.json({ success: false, error: 'Maximum 10 tags allowed' }, { status: 400 });
    }
    if (body.tags.some((t: string) => t.length > 50)) {
      return NextResponse.json({ success: false, error: 'Each tag must be 50 chars or less' }, { status: 400 });
    }
  }
  if (body.payload && JSON.stringify(body.payload).length > 10240) {
    return NextResponse.json({ success: false, error: 'payload exceeds 10KB limit' }, { status: 400 });
  }
  if (body.callback_method === 'webhook' && body.callback_url && !isAllowedCallbackUrl(body.callback_url)) {
    return NextResponse.json({ success: false, error: 'callback_url must be a valid HTTPS URL on a public host' }, { status: 400 });
  }

  const validTypes = ['approve_reject', 'choose_option', 'free_text', 'rate', 'rank'];
  if (!validTypes.includes(body.request_type)) {
    return NextResponse.json(
      { success: false, error: `Invalid request_type. Must be one of: ${validTypes.join(', ')}` },
      { status: 400 }
    );
  }

  if (['choose_option', 'rank'].includes(body.request_type)) {
    if (!body.options || body.options.length < 2) {
      return NextResponse.json(
        { success: false, error: `request_type '${body.request_type}' requires at least 2 options` },
        { status: 400 }
      );
    }
    if (body.options.length > 6) {
      return NextResponse.json({ success: false, error: 'Maximum 6 options allowed' }, { status: 400 });
    }
  }

  const effortTier = getEffortTier(body.request_type);

  // Check operating hours + queue capacity
  const capacity = await checkCapacity(effortTier);
  if (!capacity.is_open) {
    return NextResponse.json(
      {
        success: false,
        error: 'service_unavailable',
        message: capacity.reason,
        opens_at: capacity.opens_at,
        queue_available: capacity.queue_available,
        daily_remaining: capacity.daily_remaining,
      },
      { status: 503 }
    );
  }

  // Authenticate (API key OR x402)
  let apiKeyId: string | undefined;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const auth = await validateApiKey(req);
    if (auth.valid) apiKeyId = auth.keyId;
  }

  // Check payment
  const payment = await checkPayment(req, body.request_type, apiKeyId);
  if (!payment.verified) {
    if (payment.response_402) return payment.response_402;
    return NextResponse.json(
      { success: false, error: payment.error || 'Payment verification failed' },
      { status: 402 }
    );
  }

  // Enforce char limits
  if (payment.max_description_chars && body.description) {
    if (body.description.length > payment.max_description_chars) {
      return NextResponse.json(
        { success: false, error: `Description exceeds ${payment.max_description_chars} char limit for ${payment.effort_tier} tier` },
        { status: 400 }
      );
    }
  }

  // Create the request
  const result = await createHitlRequest({
    body,
    apiKeyId,
    paymentMethod: payment.method,
    effortTier: effortTier as any,
    priceUsdc: payment.price_usdc,
    paymentTxHash: payment.tx_hash,
    paymentVerified: payment.verified,
  });

  if ('error' in result) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  const data = result.data;

  return NextResponse.json({
    success: true,
    data: {
      id: data.id,
      status: data.status,
      effort_tier: data.effort_tier,
      price_usdc: data.price_usdc,
      payment_method: payment.method,
      expires_at: data.expires_at,
      estimated_response_seconds: capacity.estimated_response_seconds[effortTier as keyof typeof capacity.estimated_response_seconds],
      poll_url: `/api/requests/${data.id}`,
      constraints: { max_response_chars: payment.max_response_chars },
    },
  }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending';
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('hitl_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1);

  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ success: false, error: 'Failed to fetch requests' }, { status: 500 });
  return NextResponse.json({ success: true, data });
}
