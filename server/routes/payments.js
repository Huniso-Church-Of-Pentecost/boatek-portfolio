const express = require('express');
const rateLimit = require('express-rate-limit');
const { verifyPayment } = require('../controllers/paymentsController');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

router.post('/verify', limiter, asyncHandler(verifyPayment));

module.exports = router;
