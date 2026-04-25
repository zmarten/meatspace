/**
 * Notification service — sends email/SMS when a new request arrives.
 * Fire-and-forget: never throws, never blocks request creation.
 */

// Uses direct fetch — avoids Resend SDK's @react-email/render dep which is incompatible with Edge runtime

interface NotifiableRequest {
  id: string;
  title: string;
  agent_name: string;
  choices: { id: string; label: string }[];
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendEmail(request: NotifiableRequest, reviewUrl: string): Promise<void> {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_EMAIL) return;

  const choiceList = request.choices.map((c) => `<li>${escHtml(c.label)}</li>`).join('');
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#080b0f;color:#f0f2f5;border-radius:8px;">
      <p style="font-size:12px;color:#8892a4;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">DISPATCH FROM</p>
      <p style="font-size:14px;color:#f0f2f5;margin-bottom:16px;font-family:monospace;">${escHtml(request.agent_name)}</p>
      <h2 style="font-size:18px;color:#f0f2f5;margin-bottom:12px;">${escHtml(request.title)}</h2>
      <p style="font-size:12px;color:#8892a4;margin-bottom:8px;">CHOICES:</p>
      <ul style="list-style:none;padding:0;margin:0 0 24px;">${choiceList}</ul>
      <a href="${reviewUrl}" style="display:inline-block;padding:14px 28px;background:#e8a020;color:#080b0f;text-decoration:none;border-radius:2px;font-weight:600;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">REVIEW &amp; CHOOSE</a>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.NOTIFICATION_FROM || 'MeatSpace <noreply@meatspace.run>',
      to: [process.env.NOTIFICATION_EMAIL],
      subject: `[MeatSpace] ${request.title}`,
      html,
    }),
  });
}

async function sendSms(request: NotifiableRequest, reviewUrl: string): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.NOTIFICATION_PHONE) return;

  const body = `[MeatSpace] "${request.title}" from ${request.agent_name}. Review: ${reviewUrl}`;

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + btoa(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: process.env.NOTIFICATION_PHONE,
        From: process.env.TWILIO_FROM_PHONE || '',
        Body: body,
      }),
    }
  );
}

export async function sendKeyCreatedEmail(params: {
  email: string;
  name: string;
  apiKey: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const docsUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://meatspace.run'}/docs`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#080b0f;color:#f0f2f5;border-radius:8px;">
      <p style="font-size:12px;color:#8892a4;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">MEATSPACE</p>
      <h2 style="font-size:18px;color:#f0f2f5;margin-bottom:16px;">Your API key is ready</h2>
      <p style="font-size:13px;color:#b0b8c8;margin-bottom:12px;">Key name: <strong style="color:#f0f2f5;">${escHtml(params.name)}</strong></p>
      <div style="background:#0d1117;border:1px solid #1e2936;border-radius:4px;padding:12px;margin-bottom:16px;">
        <code style="font-size:13px;color:#e8a020;word-break:break-all;">${escHtml(params.apiKey)}</code>
      </div>
      <p style="font-size:12px;color:#8892a4;margin-bottom:16px;">Save this key now — it won't be shown again.</p>
      <p style="font-size:13px;color:#b0b8c8;margin-bottom:8px;">Quick start:</p>
      <div style="background:#0d1117;border:1px solid #1e2936;border-radius:4px;padding:12px;margin-bottom:20px;">
        <code style="font-size:11px;color:#b0b8c8;white-space:pre-wrap;">curl -X POST https://meatspace.run/api/requests \\
  -H "Authorization: Bearer ${escHtml(params.apiKey)}" \\
  -H "Content-Type: application/json" \\
  -d '{"agent_name":"my-agent","title":"Test","choices":[{"id":"a","label":"A"},{"id":"b","label":"B"}]}'</code>
      </div>
      <a href="${docsUrl}" style="display:inline-block;padding:12px 24px;background:#e8a020;color:#080b0f;text-decoration:none;border-radius:2px;font-weight:600;font-size:13px;letter-spacing:0.05em;text-transform:uppercase;">VIEW DOCS</a>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.NOTIFICATION_FROM || 'MeatSpace <noreply@meatspace.run>',
      to: [params.email],
      subject: '[MeatSpace] Your API key',
      html,
    }),
  });
}

export async function sendNotification(request: NotifiableRequest, reviewUrl: string): Promise<void> {
  const hasEmail = !!(process.env.RESEND_API_KEY && process.env.NOTIFICATION_EMAIL);
  const hasSms = !!(process.env.TWILIO_ACCOUNT_SID && process.env.NOTIFICATION_PHONE);

  if (!hasEmail && !hasSms) {
    console.warn('[MeatSpace] No notification channel configured. Set RESEND_API_KEY + NOTIFICATION_EMAIL or TWILIO_ACCOUNT_SID + NOTIFICATION_PHONE.');
    return;
  }

  try {
    if (hasEmail) await sendEmail(request, reviewUrl);
  } catch (err) {
    console.error('[MeatSpace] Email notification failed:', err);
  }

  try {
    if (hasSms) await sendSms(request, reviewUrl);
  } catch (err) {
    console.error('[MeatSpace] SMS notification failed:', err);
  }
}
