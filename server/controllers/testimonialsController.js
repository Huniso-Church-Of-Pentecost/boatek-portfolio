const { addTestimonial, getApprovedTestimonials } = require('../config/testimonialStore');
const { notifyTelegram } = require('../services/telegramService');

async function submitTestimonial(req, res) {
  if (req.body.website) return res.status(200).json({ message: 'Thank you!' }); // honeypot

  const { name, role, company, rating, message } = req.body || {};
  const errors = {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) errors.name = 'Please provide your name.';
  if (!message || typeof message !== 'string' || message.trim().length < 10) errors.message = 'Please write at least a short sentence.';

  if (Object.keys(errors).length) return res.status(422).json({ message: 'Validation failed.', errors });

  const entry = await addTestimonial({
    name: name.trim().slice(0, 100),
    role: (role || '').trim().slice(0, 100),
    company: (company || '').trim().slice(0, 100),
    rating,
    message: message.trim().slice(0, 1000)
  });

  notifyTelegram(`⭐ New testimonial submitted (pending review)\n${entry.name} — ${entry.rating}/5\n"${entry.message.slice(0, 200)}"`);

  res.status(200).json({ message: "Thanks! It'll appear on the site once reviewed." });
}

async function listApprovedTestimonials(req, res) {
  res.json({ testimonials: await getApprovedTestimonials() });
}

module.exports = { submitTestimonial, listApprovedTestimonials };
