import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { validateApiKey } from '@/lib/auth';

// GET /api/requests/[id]/wait - Long-poll for response (agent blocks here)
// Returns when human responds or timeout hits
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { id } = params;
  const { searchParams } = new URL(req.url);
  const timeoutMs = parseInt(searchParams.get('timeout') || '30000'); // 30s default long-poll
  const maxTimeout = 55000; // Under Vercel's 60s limit
  const effectiveTimeout = Math.min(timeoutMs, maxTimeout);

  const startTime = Date.now();

  // Poll loop
  while (Date.now() - startTime < effectiveTimeout) {
    const { data, error } = await supabase
      .from('hitl_requests')
      .select('id, status, response, responded_at, expires_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }

    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date() && data.status === 'pending') {
      await supabase.from('hitl_requests').update({ status: 'expired' }).eq('id', id);
      return NextResponse.json({
        success: true,
        data: { id: data.id, status: 'expired', response: null },
      });
    }

    // Return if completed or terminal state
    if (['completed', 'expired', 'cancelled'].includes(data.status)) {
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

    // Wait 2 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Timeout — tell agent to retry
  return NextResponse.json({
    success: true,
    data: { id, status: 'pending', message: 'Still waiting. Call this endpoint again to continue waiting.' },
  }, { status: 202 });
}
