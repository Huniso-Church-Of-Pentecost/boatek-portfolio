/* ==========================================================================
   controllers/contactController.js
   Sends two emails per submission: an internal notification to the admin
   inbox, and a designed auto-reply/confirmation to the applicant. Also
   records the submission in the JSON queue store and returns the
   applicant's queue position.
   ========================================================================== */

const { sendEmail } = require('../services/emailService');
const { getProjectLabel, getBudgetLabel } = require('../config/projectBudgets');
const { addToQueue } = require('../config/queueStore');
const { notifyTelegram } = require('../services/telegramService');

const BRAND = {
  name: 'Boatek Labs',
  primary: '#3B6FE0',
  teal: '#2DD4BF',
  bg: '#070B14',
  whatsapp: 'https://chat.whatsapp.com/Lwqd1vUnb4IHvlBtaA9sjX',
  phone: '+233 53 704 5514',
  email: 'boateklabs@gmail.com'
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function emailShell(innerHtml) {
  return `
  <div style="background:${BRAND.bg}; padding:32px 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:560px; margin:0 auto; background:#0d1428; border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden;">
      <div style="padding:28px 32px; border-bottom:1px solid rgba(255,255,255,0.08); background:linear-gradient(135deg, rgba(59,111,224,0.15), rgba(45,212,191,0.08));">
        <span style="font-family:Georgia,serif; font-size:20px; font-weight:700; color:#f2f4f8;">&lt;Foster/&gt;</span>
        <span style="display:block; font-size:12px; color:#8b93a7; margin-top:4px; letter-spacing:0.04em;">BOATEK LABS</span>
      </div>
      <div style="padding:32px; color:#f2f4f8;">
        ${innerHtml}
      </div>
      <div style="padding:20px 32px; border-top:1px solid rgba(255,255,255,0.08); font-size:12.5px; color:#5b6478;">
        <p style="margin:0 0 6px;">${BRAND.name} &middot; ${escapeHtml(BRAND.phone)} &middot; ${escapeHtml(BRAND.email)}</p>
        <p style="margin:0;"><a href="${BRAND.whatsapp}" style="color:${BRAND.teal}; text-decoration:none;">Join the WhatsApp community &rarr;</a></p>
      </div>
    </div>
  </div>`;
}

async function sendContactMessage(req, res) {
  // honeypot: a hidden field real visitors never see or fill; bots that
  // auto-fill every input will trip it. Respond as if it succeeded so the
  // bot doesn't learn anything, but skip all real processing.
  if (req.body.website) {
    return res.status(200).json({ message: 'Message sent successfully.', queuePosition: 1 });
  }

  const { name, email, project, budget, message } = req.body;

  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromName = process.env.CONTACT_FROM_NAME || 'Portfolio Contact Form';

  const hasEmailProvider = Boolean(process.env.RESEND_API_KEY) || Boolean(process.env.SMTP_USER);
  if (!toEmail || !hasEmailProvider) {
    console.error('[contact] CONTACT_TO_EMAIL is not set, or no email provider (RESEND_API_KEY / SMTP_*) is configured in server/.env');
    return res.status(500).json({ message: 'Server email is not configured. Please try again later.' });
  }

  const projectLabel = getProjectLabel(project);
  const budgetLabel = getBudgetLabel(project, budget);

  // record in the queue before attempting email, so the position is never lost
  const { position } = await addToQueue({ name, email, project, budget, message });

  const adminHtml = emailShell(`
    <h2 style="margin:0 0 4px; color:${BRAND.primary}; font-size:19px;">New "Hire Me" inquiry</h2>
    <p style="margin:0 0 20px; color:#8b93a7; font-size:13.5px;">Queue position <strong style="color:${BRAND.teal};">#${position}</strong></p>
    <table style="width:100%; border-collapse:collapse; font-size:14px;">
      <tr><td style="padding:7px 0; color:#8b93a7; width:120px;">Name</td><td style="padding:7px 0;">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:7px 0; color:#8b93a7;">Email</td><td style="padding:7px 0;">${escapeHtml(email)}</td></tr>
      <tr><td style="padding:7px 0; color:#8b93a7;">Project</td><td style="padding:7px 0;">${escapeHtml(projectLabel)}</td></tr>
      <tr><td style="padding:7px 0; color:#8b93a7;">Budget</td><td style="padding:7px 0;">${escapeHtml(budgetLabel)}</td></tr>
    </table>
    <p style="margin:22px 0 6px; color:#8b93a7; font-size:13px;">Message</p>
    <p style="margin:0; white-space:pre-wrap; line-height:1.6; font-size:14.5px;">${escapeHtml(message)}</p>
  `);

  const applicantHtml = emailShell(`
    <h2 style="margin:0 0 12px; color:${BRAND.primary}; font-size:19px;">Thanks for reaching out, ${escapeHtml(name.split(' ')[0])} 👋</h2>
    <p style="margin:0 0 18px; line-height:1.6; color:#c3c8d4; font-size:14.5px;">
      Your project inquiry has been received. Here's a quick summary of what was submitted:
    </p>
    <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:20px;">
      <tr><td style="padding:7px 0; color:#8b93a7; width:120px;">Project Type</td><td style="padding:7px 0;">${escapeHtml(projectLabel)}</td></tr>
      <tr><td style="padding:7px 0; color:#8b93a7;">Budget Range</td><td style="padding:7px 0;">${escapeHtml(budgetLabel)}</td></tr>
    </table>
    <div style="background:rgba(45,212,191,0.08); border:1px solid rgba(45,212,191,0.25); border-radius:10px; padding:16px 18px; margin-bottom:22px;">
      <p style="margin:0; font-size:14px; color:${BRAND.teal};">
        You're <strong>#${position}</strong> in the current project queue. I respond to inquiries in order, typically within 24 hours.
      </p>
    </div>
    <p style="margin:0 0 18px; line-height:1.6; color:#c3c8d4; font-size:14.5px;">
      In the meantime, feel free to join the WhatsApp community below for updates, or reach out directly if anything changes about your project.
    </p>
    <a href="${BRAND.whatsapp}" style="display:inline-block; background:linear-gradient(135deg,${BRAND.primary},${BRAND.teal}); color:#04070d; text-decoration:none; font-weight:600; font-size:13.5px; padding:12px 22px; border-radius:100px;">
      Join WhatsApp Group
    </a>
  `);

  try {
    await sendEmail({
      fromName,
      to: toEmail,
      replyTo: email,
      subject: `New inquiry: ${projectLabel} — ${name} (Queue #${position})`,
      html: adminHtml
    });

    await sendEmail({
      fromName: BRAND.name,
      to: email,
      replyTo: BRAND.email,
      subject: `We've received your project inquiry — you're #${position} in queue`,
      html: applicantHtml
    });

    notifyTelegram(`📬 New "Hire Me" inquiry — Queue #${position}\n${name} (${email})\n${projectLabel} — ${budgetLabel}\n${message.slice(0, 300)}`);

    return res.status(200).json({
      message: 'Message sent successfully.',
      queuePosition: position
    });
  } catch (err) {
    console.error('[contact] Failed to send email:', err.message);
    notifyTelegram(`📬 New "Hire Me" inquiry — Queue #${position} (⚠️ confirmation email failed)\n${name} (${email})\n${projectLabel} — ${budgetLabel}`);
    // the submission is already safely recorded in the queue even if email delivery fails
    return res.status(502).json({
      message: 'Your inquiry was recorded, but the confirmation email failed to send. I\'ll still see it.',
      queuePosition: position
    });
  }
}

module.exports = { sendContactMessage };
