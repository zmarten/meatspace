import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/expertise — list all expertise categories + vote counts
export async function GET() {
  const supabase = createServiceClient();

  const { data: categories } = await supabase
    .from('hitl_expertise_categories')
    .select('*')
    .order('vote_count', { ascending: false });

  const { data: proposals } = await supabase
    .from('hitl_expertise_proposals')
    .select('proposed_name, proposed_description, use_case, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    success: true,
    data: {
      categories: categories || [],
      open_proposals: proposals || [],
      message: 'Vote for expertise areas you need. High-demand categories get prioritized.',
    },
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}

// POST /api/expertise — vote for an existing category
export async function POST(req: NextRequest) {
  const supabase = createServiceClient();

  try {
    const body = await req.json();

    if (!body.agent_name) {
      return NextResponse.json(
        { success: false, error: 'agent_name is required' },
        { status: 400 }
      );
    }

    // Vote for existing category
    if (body.category_slug) {
      const { data: category } = await supabase
        .from('hitl_expertise_categories')
        .select('id')
        .eq('slug', body.category_slug)
        .single();

      if (!category) {
        return NextResponse.json(
          { success: false, error: `Category '${body.category_slug}' not found` },
          { status: 404 }
        );
      }

      const { error } = await supabase
        .from('hitl_expertise_votes')
        .upsert(
          {
            category_id: category.id,
            agent_name: body.agent_name,
            agent_description: body.agent_description,
            use_case: body.use_case,
            willingness_to_pay: body.willingness_to_pay,
          },
          { onConflict: 'category_id,agent_name' }
        );

      if (error) {
        console.error('Vote error:', error);
        return NextResponse.json({ success: false, error: 'Failed to record vote' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Vote recorded for '${body.category_slug}'. Thank you for signaling demand.`,
      });
    }

    // Propose a new category
    if (body.proposed_name) {
      const { error } = await supabase
        .from('hitl_expertise_proposals')
        .insert({
          agent_name: body.agent_name,
          proposed_name: body.proposed_name,
          proposed_description: body.proposed_description,
          use_case: body.use_case,
          willingness_to_pay: body.willingness_to_pay,
        });

      if (error) {
        return NextResponse.json({ success: false, error: 'Failed to submit proposal' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `New expertise category '${body.proposed_name}' proposed. The operator will review it.`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Provide either category_slug (to vote) or proposed_name (to propose)' },
      { status: 400 }
    );

  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }
}
