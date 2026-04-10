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
      from: process.env.NOTIFICATION_FROM || 'MeatSpace <noreply@meatspace.app>',
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

export async function sendNotification(request: NotifiableRequest): Promise<void> {
  const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/review/${request.id}`;

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
