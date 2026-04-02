import { createServiceClient } from './supabase';
import { checkCapacity, getEffortTier } from './capacity';
import { CreateRequestBody, EffortTier } from '@/types';

/**
 * Shared request-creation logic used by both REST and MCP routes.
 * Handles validation, capacity check, and database insert.
 */
export async function createHitlRequest(params: {
  body: CreateRequestBody;
  apiKeyId?: string;
  paymentMethod: string;
  effortTier?: EffortTier;
  priceUsdc?: number;
  paymentTxHash?: string;
  paymentVerified?: boolean;
}): Promise<{ data: any } | { error: string; status: number }> {
  const { body, apiKeyId, paymentMethod } = params;

  // Validate required fields
  if (!body.agent_name || !body.request_type || !body.title) {
    return { error: 'Missing required fields: agent_name, request_type, title', status: 400 };
  }

  const validTypes = ['approve_reject', 'choose_option', 'free_text', 'rate', 'rank'];
  if (!validTypes.includes(body.request_type)) {
    return { error: `Invalid request_type. Must be one of: ${validTypes.join(', ')}`, status: 400 };
  }

  if (['choose_option', 'rank'].includes(body.request_type)) {
    if (!body.options || body.options.length < 2) {
      return { error: `request_type '${body.request_type}' requires at least 2 options`, status: 400 };
    }
    if (body.options.length > 6) {
      return { error: 'Maximum 6 options allowed', status: 400 };
    }
  }

  const effortTier = params.effortTier || getEffortTier(body.request_type);

  // Check capacity
  const capacity = await checkCapacity(effortTier);
  if (!capacity.is_open) {
    return {
      error: JSON.stringify({
        error: 'service_unavailable',
        message: capacity.reason,
        opens_at: capacity.opens_at,
        queue_available: capacity.queue_available,
        daily_remaining: capacity.daily_remaining,
      }),
      status: 503,
    };
  }

  // Insert
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
      effort_tier: effortTier,
      price_usdc: params.priceUsdc,
      payment_method: paymentMethod,
      payment_tx_hash: params.paymentTxHash || null,
      payment_verified: params.paymentVerified,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return { error: 'Failed to create request', status: 500 };
  }

  return { data };
}
