/* ==========================================================================
   routes/contact.js
   ========================================================================== */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { validateContact } = require('../middleware/validateContact');
const { sendContactMessage } = require('../controllers/contactController');
const { getPendingCount } = require('../config/queueStore');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// limit contact submissions to prevent spam/abuse
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'Too many submissions. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/', contactLimiter, validateContact, asyncHandler(sendContactMessage));

// lightweight, no-PII endpoint so the frontend can show "X ahead of you" on load
router.get('/queue/status', asyncHandler(async (req, res) => {
  res.json({ pending: await getPendingCount() });
}));

module.exports = router;
