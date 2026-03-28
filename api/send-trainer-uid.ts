type VercelRequest = {
  method?: string;
  body?: {
    email?: string;
    uid?: string;
    name?: string;
  };
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const RESEND_API_URL = 'https://api.resend.com/emails';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed.' });
    return;
  }

  const email = req.body?.email?.trim();
  const uid = req.body?.uid?.trim();
  const name = req.body?.name?.trim() || '';

  if (!email || !uid) {
    res.status(400).json({ success: false, message: 'Email and UID are required.' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    res.status(500).json({
      success: false,
      message: 'Resend environment variables are missing.'
    });
    return;
  }

  const greeting = name ? `Hello ${name},` : 'Hello,';
  const text = [
    greeting,
    '',
    `Your SafeTech Trainer UID is: ${uid}`,
    '',
    'Use this UID to sign in to the SafeTech training dashboard.',
    '',
    'Regards,',
    'SafeTech Team'
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>${escapeHtml(greeting)}</p>
      <p>Your SafeTech Trainer UID is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 2px;">${escapeHtml(uid)}</p>
      <p>Use this UID to sign in to the SafeTech training dashboard.</p>
      <p>Regards,<br>SafeTech Team</p>
    </div>
  `;

  try {
    const resendResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: 'Your SafeTech Trainer UID',
        text,
        html
      })
    });

    const payload = await resendResponse.json();

    if (!resendResponse.ok) {
      res.status(resendResponse.status).json({
        success: false,
        message: payload?.message || 'Resend email request failed.'
      });
      return;
    }

    res.status(200).json({
      success: true,
      id: payload?.id ?? null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unable to send UID email.'
    });
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
