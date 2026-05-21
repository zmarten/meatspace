// crypto.randomUUID() is a Web Crypto global — no import needed in Edge runtime
import { createServiceClient } from './supabase';
import { generateReviewToken, hashReviewToken, isAllowedCallbackUrl } from './auth';
import { sendNotification } from './notifications';
import { CreateRequestBody, CreateRequestResponse, ContentType } from '@/types';

const VALID_CONTENT_TYPES: ContentType[] = ['html', 'image', 'text', 'markdown'];

type CreateRequestError = {
  error: string;
  code: string;
  status: number;
};

function fail(error: string, code: string, status: number): CreateRequestError {
  return { error, code, status };
}

export async function createHitlRequest(params: {
  body: CreateRequestBody;
  apiKeyId?: string | null;
}): Promise<{ data: CreateRequestResponse } | CreateRequestError> {
  const { body } = params;

  if (!body.agent_name || typeof body.agent_name !== 'string') {
    return fail('agent_name is required', 'agent_name_required', 400);
  }
  if (body.agent_name.length > 100) {
    return fail('agent_name max 100 characters', 'agent_name_too_long', 400);
  }

  if (!body.title || typeof body.title !== 'string') {
    return fail('title is required', 'title_required', 400);
  }
  if (body.title.length > 200) {
    return fail('title max 200 characters', 'title_too_long', 400);
  }

  if (!Array.isArray(body.choices) || body.choices.length < 2 || body.choices.length > 4) {
    return fail('choices must be an array of 2-4 items', 'invalid_choice_count', 400);
  }
  for (const choice of body.choices) {
    if (!choice.id || typeof choice.id !== 'string' || choice.id.length > 50) {
      return fail('Each choice must have an id (max 50 chars)', 'invalid_choice_id', 400);
    }
    if (!choice.label || typeof choice.label !== 'string' || choice.label.length > 100) {
      return fail('Each choice must have a label (max 100 chars)', 'invalid_choice_label', 400);
    }
  }

  if (body.content && typeof body.content === 'string' && body.content.length > 50000) {
    return fail('content max 50KB', 'content_too_large', 400);
  }

  const contentType = body.content_type || 'text';
  if (!VALID_CONTENT_TYPES.includes(contentType)) {
    return fail(
      `content_type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`,
      'invalid_content_type',
      400
    );
  }

  if (body.callback_url && !isAllowedCallbackUrl(body.callback_url)) {
    return fail(
      'callback_url must use https and match an allowlisted webhook host',
      'callback_url_not_allowed',
      400
    );
  }

  if (body.metadata) {
    const metaStr = JSON.stringify(body.metadata);
    if (metaStr.length > 10000) {
      return fail('metadata max 10KB', 'metadata_too_large', 400);
    }
  }

  if (body.decision_reason && body.decision_reason.length > 500) {
    return fail('decision_reason max 500 characters', 'decision_reason_too_long', 400);
  }

  if (body.confidence !== undefined) {
    if (typeof body.confidence !== 'number' || Number.isNaN(body.confidence)) {
      return fail('confidence must be a number between 0 and 1', 'invalid_confidence', 400);
    }
    if (body.confidence < 0 || body.confidence > 1) {
      return fail('confidence must be between 0 and 1', 'invalid_confidence', 400);
    }
  }

  if (body.consequence_of_wrong_choice && body.consequence_of_wrong_choice.length > 500) {
    return fail(
      'consequence_of_wrong_choice max 500 characters',
      'consequence_too_long',
      400
    );
  }

  if (body.recommended_option) {
    const validChoiceIds = new Set(body.choices.map(choice => choice.id));
    if (!validChoiceIds.has(body.recommended_option)) {
      return fail(
        'recommended_option must match one of the provided choice ids',
        'invalid_recommended_option',
        400
      );
    }
  }

  const timeoutSeconds = Math.min(body.timeout_seconds || 3600, 86400);
  const id = crypto.randomUUID();
  const reviewToken = generateReviewToken();
  const reviewTokenHash = await hashReviewToken(reviewToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + timeoutSeconds * 1000).toISOString();

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('hitl_requests')
    .insert({
      id,
      api_key_id: params.apiKeyId || null,
      agent_name: body.agent_name,
      title: body.title,
      content: body.content || null,
      content_type: contentType,
      choices: body.choices,
      callback_url: body.callback_url || null,
      review_token_hash: reviewTokenHash,
      metadata: {
        ...(body.metadata || {}),
        _agent: {
          ...(body.decision_reason ? { decision_reason: body.decision_reason } : {}),
          ...(body.confidence !== undefined ? { confidence: body.confidence } : {}),
          ...(body.consequence_of_wrong_choice
            ? { consequence_of_wrong_choice: body.consequence_of_wrong_choice }
            : {}),
          ...(body.recommended_option ? { recommended_option: body.recommended_option } : {}),
          ...(body.run_id ? { run_id: body.run_id } : {}),
          ...(body.trace_id ? { trace_id: body.trace_id } : {}),
        },
      },
      status: 'pending',
      selected: null,
      responded_at: null,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error('Insert error:', error);
    return fail('Failed to create request', 'request_create_failed', 500);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const reviewUrl = `${appUrl}/review/${data.id}?token=${reviewToken}`;

  await sendNotification({
    id: data.id,
    title: data.title,
    agent_name: data.agent_name,
    choices: data.choices,
  }, reviewUrl);

  return {
    data: {
      id: data.id,
      status: data.status,
      review_url: reviewUrl,
      poll_url: `/api/requests/${data.id}`,
      expires_at: data.expires_at,
    },
  };
}
