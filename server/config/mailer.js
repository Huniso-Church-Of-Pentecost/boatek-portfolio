/* ==========================================================================
   config/mailer.js — Nodemailer transport, built once and reused
   ========================================================================== */

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      '[mailer] SMTP credentials are not fully configured. ' +
      'SMTP sending will fail until server/.env is set up (see .env.example). ' +
      'Tip: set RESEND_API_KEY instead — it sends over HTTPS (port 443) and ' +
      'works reliably on mobile/Termux networks that often block SMTP ports.'
    );
  }

  const port = Number(SMTP_PORT) || 587;

  // Port 465 requires implicit TLS (secure:true). Ports 587/25 use STARTTLS
  // (secure:false, with requireTLS:true). Getting this combination wrong is
  // the #1 cause of "Greeting never received" / connection-hang errors, so
  // it's auto-corrected here even if SMTP_SECURE was set incorrectly.
  const secure = SMTP_SECURE === 'true' || port === 465;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    },
    requireTLS: !secure,
    // Fail fast instead of hanging for the platform default (often 2+ min),
    // which matters a lot on flaky mobile connections.
    connectionTimeout: 10000, // time to establish the TCP connection
    greetingTimeout: 10000,   // time to receive the SMTP greeting (220) after connecting
    socketTimeout: 15000      // time to wait on an idle socket during the transaction
  });

  return transporter;
}

module.exports = { getTransporter };
