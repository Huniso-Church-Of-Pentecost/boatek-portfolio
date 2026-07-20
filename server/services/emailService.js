/* ==========================================================================
   services/emailService.js — unified email sender
   ==========================================================================
   Why this exists:
   Raw SMTP (port 587/465) is frequently blocked by mobile carriers and
   Termux/Android network setups, producing errors like "Greeting never
   received" — the client never even got the server's opening 220 response.
   That's a network/transport problem, not a credentials problem, so no
   amount of retrying the same SMTP connection fixes it.

   The fix: prefer Resend's HTTPS API (https://api.resend.com/emails), which
   travels over port 443 like any normal web request and is essentially
   never blocked. Nodemailer/SMTP is kept as an automatic fallback for
   environments that don't set RESEND_API_KEY, or on the rare Resend outage.
   ========================================================================== */

const { getTransporter } = require('../config/mailer');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM; // e.g. "Boatek Labs <onboarding@resend.dev>"
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function sendViaResend({ fromName, to, subject, html, replyTo }) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');

  const from = RESEND_FROM || `${fromName} <onboarding@resend.dev>`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let res;
  try {
    res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        reply_to: replyTo
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API responded ${res.status}: ${body.slice(0, 300)}`);
  }

  return res.json();
}

async function sendViaSmtp({ fromName, to, subject, html, replyTo }) {
  if (!isSmtpConfigured()) throw new Error('SMTP not configured');

  const transporter = getTransporter();
  return transporter.sendMail({
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    replyTo
  });
}

/**
 * Sends a single email. Tries Resend's HTTPS API first (if RESEND_API_KEY is
 * set), then falls back to direct SMTP. Throws only if every configured
 * provider fails, with details on each attempt.
 *
 * @param {object} options
 * @param {string} options.fromName - Display name for the From header
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject
 * @param {string} options.html
 * @param {string} [options.replyTo]
 * @returns {Promise<{provider: 'resend' | 'smtp'}>}
 */
async function sendEmail(options) {
  const attempts = [];

  if (RESEND_API_KEY) {
    try {
      await sendViaResend(options);
      return { provider: 'resend' };
    } catch (err) {
      attempts.push(`resend: ${err.message}`);
      console.warn('[emailService] Resend send failed, falling back to SMTP if configured:', err.message);
    }
  }

  if (isSmtpConfigured()) {
    try {
      await sendViaSmtp(options);
      return { provider: 'smtp' };
    } catch (err) {
      attempts.push(`smtp: ${err.message}`);
    }
  }

  throw new Error(
    attempts.length
      ? `All email providers failed — ${attempts.join(' | ')}`
      : 'No email provider configured. Set RESEND_API_KEY (recommended) or SMTP_* in server/.env — see .env.example.'
  );
}

module.exports = { sendEmail };
