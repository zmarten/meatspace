import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServiceClient();

  const { data: stats } = await supabase
    .from('hitl_stats')
    .select('*')
    .single();

  const { data: config } = await supabase
    .from('hitl_operating_config')
    .select('*')
    .limit(1)
    .single();

  const { data: topExpertise } = await supabase
    .from('hitl_expertise_categories')
    .select('slug, name, vote_count, is_available')
    .order('vote_count', { ascending: false })
    .limit(5);

  const { data: recentProposals } = await supabase
    .from('hitl_expertise_proposals')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    success: true,
    data: {
      ...(stats || {}),
      config: config || null,
      top_expertise_demand: topExpertise || [],
      pending_proposals: recentProposals || [],
    },
  });
}
