export const runtime = 'edge';

import { NextResponse } from 'next/server';

// Temporary debug endpoint — remove after verifying env vars
export async function GET() {
  const check = (key: string) => !!process.env[key];
  return NextResponse.json({
    HITL_API_KEY: check('HITL_API_KEY'),
    ADMIN_SECRET: check('ADMIN_SECRET'),
    HITL_WEBHOOK_SECRET: check('HITL_WEBHOOK_SECRET'),
    SUPABASE_SERVICE_ROLE_KEY: check('SUPABASE_SERVICE_ROLE_KEY'),
    RESEND_API_KEY: check('RESEND_API_KEY'),
    NOTIFICATION_EMAIL: check('NOTIFICATION_EMAIL'),
    NOTIFICATION_FROM: check('NOTIFICATION_FROM'),
    NEXT_PUBLIC_APP_URL: check('NEXT_PUBLIC_APP_URL'),
    NEXT_PUBLIC_SUPABASE_URL: check('NEXT_PUBLIC_SUPABASE_URL'),
    NODE_ENV: process.env.NODE_ENV || 'unset',
  });
}
