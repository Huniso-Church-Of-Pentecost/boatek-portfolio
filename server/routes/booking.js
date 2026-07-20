const express = require('express');
const rateLimit = require('express-rate-limit');
const { createBooking } = require('../controllers/bookingController');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' }
});

router.post('/', limiter, asyncHandler(createBooking));

module.exports = router;
