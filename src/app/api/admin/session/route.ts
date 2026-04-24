export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSessionValue, timingSafeCompare } from '@/lib/auth';

function sessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 12 * 60 * 60,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_SECRET || '';
  if (!expected) {
    return NextResponse.json(
      { success: false, error: 'Admin auth is not configured' },
      { status: 500 }
    );
  }

  let body: { secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const provided = body.secret || '';
  if (!provided || !timingSafeCompare(provided, expected)) {
    return NextResponse.json(
      { success: false, error: 'Invalid admin secret' },
      { status: 401 }
    );
  }

  const sessionValue = await createAdminSessionValue();
  if (!sessionValue) {
    return NextResponse.json(
      { success: false, error: 'Admin session signing is not configured' },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('hitl_admin_session', sessionValue, sessionCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('hitl_admin_session', '', {
    ...sessionCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}
