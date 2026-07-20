const { addBooking } = require('../config/bookingStore');
const { sendEmail } = require('../services/emailService');
const { notifyTelegram } = require('../services/telegramService');

const BRAND = { name: 'Foster / Boatek Labs', email: process.env.CONTACT_TO_EMAIL || '' };

function isEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

async function createBooking(req, res) {
  // honeypot: real users never fill this hidden field
  if (req.body.website) return res.status(200).json({ message: 'Request received.' });

  const { name, email, date, time, notes } = req.body || {};
  const errors = {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) errors.name = 'Please provide your name.';
  if (!email || !isEmail(String(email).trim())) errors.email = 'Please provide a valid email address.';
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = 'Please pick a valid date.';
  if (!time || typeof time !== 'string') errors.time = 'Please pick a time.';

  if (Object.keys(errors).length) return res.status(422).json({ message: 'Validation failed.', errors });

  const entry = await addBooking({
    name: name.trim().slice(0, 200),
    email: email.trim().slice(0, 200),
    date,
    time,
    notes: (notes || '').trim().slice(0, 1000)
  });

  const toEmail = process.env.CONTACT_TO_EMAIL;
  if (toEmail) {
    sendEmail({
      fromName: name,
      to: toEmail,
      replyTo: email,
      subject: `New call request — ${name} (${date} ${time})`,
      html: `<p><strong>${name}</strong> (${email}) requested a call on <strong>${date} at ${time}</strong>.</p><p>${(notes || '').replace(/</g, '&lt;')}</p>`
    }).catch((err) => console.error('[booking] Admin email failed:', err.message));

    sendEmail({
      fromName: BRAND.name,
      to: email,
      replyTo: BRAND.email,
      subject: "Your call request — I'll confirm shortly",
      html: `<p>Hi ${name},</p><p>Got your request for <strong>${date} at ${time}</strong>. I'll confirm by email once it's locked in — usually within a day.</p><p>— Foster</p>`
    }).catch((err) => console.error('[booking] Applicant email failed:', err.message));
  }

  notifyTelegram(`📅 New call request\n${name} (${email})\n${date} at ${time}\n${notes || ''}`);

  res.status(200).json({ message: 'Request received — I will confirm by email shortly.', booking: entry });
}

module.exports = { createBooking };
