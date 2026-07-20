/* ==========================================================================
   server.js — Express entry point
   Serves the static portfolio site and exposes the /api/contact endpoint.
   ========================================================================== */

require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');

const contactRoutes = require('./routes/contact');
const statsRoutes = require('./routes/stats');
const bookingRoutes = require('./routes/booking');
const testimonialsRoutes = require('./routes/testimonials');
const blogRoutes = require('./routes/blog');
const paymentsRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_ROOT = path.join(__dirname, '..'); // the portfolio/ folder (index.html, css/, js/, images/)
const IS_VERCEL = process.env.VERCEL === '1';

/* ---------------------------------------------------------------- */
/* Core middleware                                                    */
/* ---------------------------------------------------------------- */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.github.com', 'https://ipwho.is', 'https://api.paystack.co'],
        frameSrc: ["'self'", 'https://js.paystack.co', 'https://checkout.paystack.com'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"]
      }
    }
  })
);
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  })
);

/* ---------------------------------------------------------------- */
/* Static site                                                        */
/* ---------------------------------------------------------------- */
// On Vercel, static files (index.html, css/, js/, images/) are served
// directly by Vercel's edge network and never reach this function —
// vercel.json only rewrites /api/* here. This middleware exists purely
// for local development and Termux/Android deployment.
if (!IS_VERCEL) {
  app.use(
    express.static(SITE_ROOT, {
      extensions: ['html'],
      setHeaders: (res, filePath) => {
        // service worker must never be cached long-term or updates won't propagate
        if (filePath.endsWith('sw.js')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
        // manifest and icons can be cached briefly
        if (filePath.endsWith('manifest.json')) {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      }
    })
  );
}

/* ---------------------------------------------------------------- */
/* API routes                                                         */
/* ---------------------------------------------------------------- */
app.use('/api/contact', contactRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/testimonials', testimonialsRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// safe-to-expose public config only — never put secret keys here
app.get('/api/config', (req, res) => {
  res.json({ paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '' });
});

/* ---------------------------------------------------------------- */
/* 404 + error handling                                               */
/* ---------------------------------------------------------------- */
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Not found.' });
  }
  res.status(404).sendFile(path.join(SITE_ROOT, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

/* ---------------------------------------------------------------- */
/* Start (local dev + Termux/Android only)                            */
/* ---------------------------------------------------------------- */
// On Vercel, this module is required by api/index.js and the exported
// `app` is invoked per-request by the serverless runtime — app.listen()
// must never run there (there's no long-running process, and the port
// is managed by the platform).
if (!IS_VERCEL && require.main === module) {
  app.listen(PORT, () => {
    console.log(`✓ Foster's portfolio server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
