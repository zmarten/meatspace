export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { validateAdminSession } from '@/lib/auth';

async function requireAdminSession(req: NextRequest) {
  const sessionValue = req.cookies.get('hitl_admin_session')?.value;
  if (await validateAdminSession(sessionValue)) return null;
  return NextResponse.json(
    { success: false, error: 'Unauthorized: admin session required' },
    { status: 401 }
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdminSession(req);
  if (unauthorized) return unauthorized;

  const { id } = await params;

  let body: { is_active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  if (typeof body.is_active !== 'boolean') {
    return NextResponse.json(
      { success: false, error: 'is_active (boolean) is required' },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('hitl_api_keys')
    .update({ is_active: body.is_active })
    .eq('id', id)
    .select('id, name, is_active')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: 'Key not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data });
}
