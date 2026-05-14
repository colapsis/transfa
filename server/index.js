require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cron = require('node-cron');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust nginx proxy so req.ip is the real client IP (needed for rate limiting)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // handled separately for SPA
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow file downloads from other origins
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors({ origin: true }));

// Rate limiting — global baseline (per-plan enforcement is in upload.js)
// validate.xForwardedForHeader: false — we trust our nginx proxy, suppress the warning
const globalLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many requests — slow down' },
  skip: (req) => req.path.startsWith('/api/billing/webhook'),
  validate: { xForwardedForHeader: false },
});
app.use(globalLimit);

const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'too many auth attempts' },
  validate: { xForwardedForHeader: false },
});
app.use('/api/auth', authLimit);

// Stripe webhook must receive raw body — mount BEFORE express.json()
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), require('./routes/billing').webhook);

app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/run', require('./routes/upload'));   // /api/run/:run_id shares the upload router
app.use('/api/download', require('./routes/download'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/webhooks', require('./routes/webhooks').router);
app.use('/api/u', require('./routes/profile'));
app.use('/api/billing', require('./routes/billing').router);
app.use('/api/admin', require('./routes/admin'));

// OpenAPI spec
app.use('/openapi.yaml', express.static(path.join(__dirname, '../public/openapi.yaml')));

// Serve frontend (built)
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');
app.use(express.static(FRONTEND_DIST));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

// In cluster mode, only worker 0 runs cron to avoid duplicate jobs
const isWorkerZero = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';

if (isWorkerZero) {
  const fs = require('fs');

  cron.schedule('0 2 * * *', () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = db.prepare(
      'SELECT id, storage_path FROM uploads WHERE expires_at <= ? AND deleted_at IS NULL'
    ).all(now);
    let purged = 0;
    for (const row of expired) {
      try {
        if (fs.existsSync(row.storage_path)) fs.unlinkSync(row.storage_path);
        db.prepare('UPDATE uploads SET deleted_at = ? WHERE id = ?').run(now, row.id);
        purged++;
      } catch (e) {
        console.error('[cron] purge error', row.id, e.message);
      }
    }
    console.log(`[cron] purged ${purged} expired uploads`);
  });

  cron.schedule('0 0 * * *', () => {
    db.prepare('UPDATE api_keys SET uploads_today = 0, uploads_reset_at = unixepoch()').run();
    console.log('[cron] reset daily upload counters');
  });
}

const server = app.listen(PORT, () => {
  console.log(`transfa server running on port ${PORT} (${process.env.BASE_URL || 'http://localhost:' + PORT})`);
});

// Graceful shutdown — let in-flight requests finish before exiting
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received, draining…');
  server.close(() => {
    console.log('[server] all connections closed');
    process.exit(0);
  });
  // Force-exit after 30 s if connections won't drain (e.g. stuck upload)
  setTimeout(() => process.exit(1), 30000).unref();
});

process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err.message, err.stack);
  // Stay alive for non-fatal errors; PM2 will restart on fatal ones
});

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandledRejection:', reason);
});
