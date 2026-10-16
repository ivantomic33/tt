/**
 * Slanje transakcionih email-ova (reset lozinke).
 *
 * Podržava Resend HTTP API ako je postavljen RESEND_API_KEY.
 * Ako provajder nije konfigurisan, link se ispisuje u log (razvojni fallback),
 * tako da funkcionalnost ostaje testabilna bez spoljne usluge.
 *
 * NAPOMENA: nikada ne logujemo link u produkciji.
 */

function buildResetUrl(token: string): string {
  const base = (
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<{ sent: boolean }> {
  const resetUrl = buildResetUrl(token);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || 'Nexus GG <no-reply@nexusgaming.gg>';
  const isProduction = process.env.NODE_ENV === 'production';

  if (!apiKey) {
    if (isProduction) {
      console.error(
        '[mailer] RESEND_API_KEY is not set; password reset email was NOT sent. Configure an email provider.'
      );
    } else {
      console.warn('[mailer] RESEND_API_KEY is not set. Dev reset link:', resetUrl);
    }
    return { sent: false };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Resetovanje lozinke — Nexus Gaming Portal',
        html:
          `<p>Zatražen je reset lozinke za vaš Nexus nalog.</p>` +
          `<p>Kliknite na link (važi 15 minuta): <a href="${resetUrl}">${resetUrl}</a></p>` +
          `<p>Ako niste vi zatražili reset, ignorišite ovaj mejl.</p>`,
      }),
    });

    if (!response.ok) {
      console.error('[mailer] Provider rejected the email:', response.status);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Failed to send password reset email:', err);
    return { sent: false };
  }
}
