export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { toReviewResponse } from '@/lib/request-contract';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('hitl_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
  }

  if (data.expires_at && new Date(data.expires_at) < new Date() && data.status === 'pending') {
    await supabase.from('hitl_requests').update({ status: 'expired' }).eq('id', id);
    data.status = 'expired';
  }

  return NextResponse.json({
    success: true,
    data: toReviewResponse(data),
  });
}
