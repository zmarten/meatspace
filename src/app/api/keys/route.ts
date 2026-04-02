import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { generateApiKey, hashApiKey } from '@/lib/auth';

// POST /api/keys - Create a new API key
export async function POST(req: NextRequest) {
  // TODO: Add dashboard auth check here
  const supabase = createServiceClient();

  try {
    const body = await req.json();
    const rawKey = generateApiKey();
    
    const { data, error } = await supabase
      .from('hitl_api_keys')
      .insert({
        name: body.name || 'Unnamed Key',
        key_hash: hashApiKey(rawKey),
        key_prefix: rawKey.slice(0, 12),
        agent_name: body.agent_name,
      })
      .select('id, name, key_prefix, agent_name, created_at')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to create key' }, { status: 500 });
    }

    // Return the raw key ONCE — it won't be shown again
    return NextResponse.json({
      success: true,
      data: {
        ...data,
        key: rawKey, // only time this is returned
      },
    }, { status: 201 });

  } catch (err) {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}

// GET /api/keys - List API keys (no raw keys shown)
export async function GET() {
  const supabase = createServiceClient();
  
  const { data, error } = await supabase
    .from('hitl_api_keys')
    .select('id, name, key_prefix, agent_name, is_active, created_at, last_used_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch keys' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
