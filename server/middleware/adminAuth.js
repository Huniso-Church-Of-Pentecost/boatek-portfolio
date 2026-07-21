/* ==========================================================================
   middleware/adminAuth.js — HTTP Basic Auth for /api/admin/* routes.
   Credentials come from ADMIN_USER / ADMIN_PASS in server/.env.
   Not meant to replace a real auth system for a multi-user product — this
   is a single-owner dashboard, so Basic Auth over HTTPS is a reasonable,
   dependency-free fit.
   ========================================================================== */

function timingSafeEqual(a, b) {
  const crypto = require('crypto');
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function adminAuth(req, res, next) {
  const { ADMIN_USER, ADMIN_PASS } = process.env;

  if (!ADMIN_USER || !ADMIN_PASS) {
    return res.status(503).json({
      message: 'Admin dashboard is not configured. Set ADMIN_USER and ADMIN_PASS in server/.env.'
    });
  }

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme !== 'Basic' || !encoded) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  let user = '', pass = '';
  try {
    [user, pass] = Buffer.from(encoded, 'base64').toString('utf-8').split(':');
  } catch (e) {
    return res.status(401).json({ message: 'Malformed credentials.' });
  }

  if (timingSafeEqual(user, ADMIN_USER) && timingSafeEqual(pass, ADMIN_PASS)) {
    return next();
  }

  return res.status(401).json({ message: 'Invalid credentials.' });
}

module.exports = { adminAuth };
