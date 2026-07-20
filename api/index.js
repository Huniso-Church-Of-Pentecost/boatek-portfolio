/* ==========================================================================
   api/index.js — Vercel serverless function entry point.

   Vercel's Node.js runtime accepts a plain (req, res) handler, and an
   Express app IS one (Express apps are callable as `app(req, res)`), so we
   simply require and re-export the existing Express app unchanged. Every
   request to /api/* is rewritten here by vercel.json, and Express's own
   router handles the rest exactly as it does locally.
   ========================================================================== */

module.exports = require('../server/server.js');
