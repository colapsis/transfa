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

// Badge endpoint — /badge/:id returns SVG download count badge for README embedding
app.get('/badge/:id', (req, res) => {
  const upload = db.prepare('SELECT download_count FROM uploads WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!upload) return res.status(404).json({ error: 'not found' });

  const count = upload.download_count ?? 0;
  const label = 'downloads';
  const value = String(count);
  const labelW = label.length * 6.5 + 10;
  const valueW = value.length * 7 + 10;
  const totalW = Math.round(labelW + valueW);
  const lx = Math.round(labelW / 2);
  const vx = Math.round(labelW + valueW / 2);

  res.set('Content-Type', 'image/svg+xml');
  res.set('Cache-Control', 'no-cache, max-age=0');
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20">
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${totalW}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${Math.round(labelW)}" height="20" fill="#555"/>
    <rect x="${Math.round(labelW)}" width="${Math.round(valueW)}" height="20" fill="#4c9aff"/>
    <rect width="${totalW}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-size="11">
    <text x="${lx}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${lx}" y="14">${label}</text>
    <text x="${vx}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${vx}" y="14">${value}</text>
  </g>
</svg>`);
});

// Static well-known files
app.use('/openapi.yaml', express.static(path.join(__dirname, '../public/openapi.yaml')));
app.use('/llms.txt', express.static(path.join(__dirname, '../public/llms.txt')));

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
      'SELECT id, storage_path FROM uploads WHERE expires_at + COALESCE(grace_seconds, 0) <= ? AND deleted_at IS NULL'
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
