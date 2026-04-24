export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { generateApiKey, hashApiKey } from '@/lib/auth';

export async function GET() {
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('hitl_api_keys')
    .select('id, name, key_prefix, owner_email, is_active, created_at, last_used_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  let body: { name?: string; owner_email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'name is required' },
      { status: 400 }
    );
  }

  if (body.name.length > 100) {
    return NextResponse.json(
      { success: false, error: 'name max 100 characters' },
      { status: 400 }
    );
  }

  const apiKey = generateApiKey();
  const keyHash = await hashApiKey(apiKey);
  const keyPrefix = apiKey.slice(0, 12);

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('hitl_api_keys')
    .insert({
      name: body.name.trim(),
      key_hash: keyHash,
      key_prefix: keyPrefix,
      owner_email: body.owner_email?.trim() || null,
      is_active: true,
    })
    .select('id, name, key_prefix')
    .single();

  if (error) {
    console.error('API key creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create API key' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: data.id,
      name: data.name,
      key_prefix: data.key_prefix,
      api_key: apiKey,
    },
  }, { status: 201 });
}
