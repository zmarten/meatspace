import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/config — fetch current operating config
export async function GET() {
  const supabase = createServiceClient();

  const { data: config } = await supabase
    .from('hitl_operating_config')
    .select('*')
    .limit(1)
    .single();

  const { data: pricing } = await supabase
    .from('hitl_pricing')
    .select('*')
    .order('price_usdc');

  return NextResponse.json({
    success: true,
    data: { config, pricing },
  });
}

// PATCH /api/config — update operating config
export async function PATCH(req: NextRequest) {
  // TODO: Add dashboard auth check here
  const supabase = createServiceClient();

  try {
    const body = await req.json();

    // Get current config ID
    const { data: current } = await supabase
      .from('hitl_operating_config')
      .select('id')
      .limit(1)
      .single();

    if (!current) {
      return NextResponse.json({ success: false, error: 'Config not found' }, { status: 404 });
    }

    // Allowed fields to update
    const allowed = [
      'timezone', 'weekly_schedule',
      'max_pending_binary', 'max_pending_choice', 'max_pending_text',
      'max_daily_requests',
      'force_open', 'force_closed', 'closed_message',
      'target_response_binary', 'target_response_choice', 'target_response_text',
    ];

    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    // Prevent both force_open and force_closed
    if (updates.force_open && updates.force_closed) {
      return NextResponse.json(
        { success: false, error: 'Cannot set both force_open and force_closed' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('hitl_operating_config')
      .update(updates)
      .eq('id', current.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to update config' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
