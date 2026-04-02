import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { validateApiKey } from '@/lib/auth';
import { checkCapacity, getEffortTier } from '@/lib/capacity';
import { checkPayment } from '@/lib/payments';
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
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('hitl_requests')
    .insert({
      api_key_id: apiKeyId || null,
      agent_name: body.agent_name,
      agent_context: body.agent_context,
      request_type: body.request_type,
      title: body.title,
      description: body.description,
      payload: body.payload || {},
      options: body.options || [],
      priority: body.priority || 'normal',
      tags: body.tags || [],
      category: body.category,
      callback_method: body.callback_method || 'poll',
      callback_url: body.callback_url,
      timeout_seconds: body.timeout_seconds || 3600,
      effort_tier: payment.effort_tier,
      price_usdc: payment.price_usdc,
      payment_method: payment.method,
      payment_tx_hash: payment.tx_hash || null,
      payment_verified: payment.verified,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create request' }, { status: 500 });
  }

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
