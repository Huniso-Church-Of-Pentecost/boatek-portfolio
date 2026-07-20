const express = require('express');
const rateLimit = require('express-rate-limit');
const { submitTestimonial, listApprovedTestimonials } = require('../controllers/testimonialsController');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many submissions. Please try again later.' }
});

router.post('/', limiter, asyncHandler(submitTestimonial));
router.get('/', asyncHandler(listApprovedTestimonials));

module.exports = router;
