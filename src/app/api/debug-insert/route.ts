export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Temporary: test Supabase insert in isolation
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: 'Missing Supabase env vars', url: !!url, key: !!key });
    }

    const supabase = createClient(url, key);
    const id = crypto.randomUUID();

    const { data, error } = await supabase
      .from('hitl_requests')
      .insert({
        id,
        agent_name: 'debug-test',
        title: 'Debug insert test',
        content: null,
        content_type: 'text',
        choices: [{ id: 'a', label: 'Option A' }, { id: 'b', label: 'Option B' }],
        callback_url: null,
        metadata: {},
        status: 'pending',
        selected: null,
        responded_at: null,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, supabase_error: error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
