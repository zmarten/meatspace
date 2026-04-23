export const runtime = 'edge';

import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFICATION_EMAIL;
  const from = process.env.NOTIFICATION_FROM || 'onboarding@resend.dev';

  if (!apiKey || !to) {
    return NextResponse.json({ error: 'Missing env', apiKey: !!apiKey, to: !!to });
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: '[MeatSpace] Test email',
        html: '<p>If you see this, email notifications work.</p>',
      }),
    });

    const body = await res.json();
    return NextResponse.json({ status: res.status, body, from, to });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
