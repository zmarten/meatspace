export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSessionValue, timingSafeCompare } from '@/lib/auth';

const LOGIN_RATE_LIMIT = 5; // max attempts per IP per window
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= LOGIN_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

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
  const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkLoginRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: 'Too many login attempts. Try again later.' },
      { status: 429 }
    );
  }

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
  if (!provided || !(await timingSafeCompare(provided, expected))) {
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
