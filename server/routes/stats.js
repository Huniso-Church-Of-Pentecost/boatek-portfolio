/* ==========================================================================
   routes/stats.js — lightweight, no-PII visitor counter
   ========================================================================== */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { incrementVisit, getVisitCount } = require('../config/statsStore');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// one increment per IP per minute so a page refresh spam can't inflate the count
const visitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  handler: asyncHandler(async (req, res) => {
    res.json({ totalVisits: await getVisitCount() });
  })
});

router.post('/visit', visitLimiter, asyncHandler(async (req, res) => {
  res.json({ totalVisits: await incrementVisit() });
}));

router.get('/visit', asyncHandler(async (req, res) => {
  res.json({ totalVisits: await getVisitCount() });
}));

module.exports = router;
