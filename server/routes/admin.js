const express = require('express');
const crypto = require('crypto');
const { execSync } = require('child_process');
const db = require('../db');

const router = express.Router();

const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// Brute-force tracking per worker (acceptable — each worker still limits to 5 attempts)
const loginAttempts = new Map();

function getSecret() {
  // Use ADMIN_PASSWORD as HMAC secret so tokens are invalidated if password changes
  return process.env.ADMIN_PASSWORD || 'fallback-insecure';
}

function createToken() {
  const expiresAt = Date.now() + SESSION_TTL;
  const payload = Buffer.from(String(expiresAt)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch { return false; }
  const expiresAt = parseInt(Buffer.from(payload, 'base64url').toString());
  return !isNaN(expiresAt) && Date.now() < expiresAt;
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();

  const attempt = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  if (attempt.lockedUntil > now) {
    const secs = Math.ceil((attempt.lockedUntil - now) / 1000);
    return res.status(429).json({ error: `too many attempts — try again in ${secs}s` });
  }

  const { username, password } = req.body || {};
  const ADMIN_USER = process.env.ADMIN_USERNAME || '';
  const ADMIN_PASS = process.env.ADMIN_PASSWORD || '';

  const valid = username && password &&
    timingSafeEqual(username, ADMIN_USER) &&
    timingSafeEqual(password, ADMIN_PASS);

  if (!valid) {
    attempt.count = (attempt.count || 0) + 1;
    if (attempt.count >= MAX_ATTEMPTS) {
      attempt.lockedUntil = now + LOCKOUT_MS;
      attempt.count = 0;
    }
    loginAttempts.set(ip, attempt);
    return res.status(401).json({ error: 'invalid credentials' });
  }

  loginAttempts.delete(ip);
  res.json({ token: createToken() });
});

// POST /api/admin/logout — client just discards token; nothing to revoke server-side
router.post('/logout', (req, res) => {
  res.json({ ok: true });
});

// GET /api/admin/stats
router.get('/stats', requireAdmin, (req, res) => {
  const usersByPlan = db.prepare(`
    SELECT plan, COUNT(*) as count FROM users GROUP BY plan
  `).all();

  const totals = db.prepare(`
    SELECT
      COUNT(*) as total_uploads,
      SUM(size) as total_bytes,
      SUM(download_count) as total_downloads,
      COUNT(CASE WHEN deleted_at IS NULL AND expires_at > unixepoch() THEN 1 END) as active_uploads
    FROM uploads
  `).get();

  const recentUsers = db.prepare(`
    SELECT id, username, email, plan, created_at
    FROM users ORDER BY created_at DESC LIMIT 20
  `).all();

  const uploadsToday = db.prepare(`
    SELECT COUNT(*) as count FROM uploads
    WHERE created_at >= unixepoch() - 86400
  `).get();

  const downloadsToday = db.prepare(`
    SELECT COUNT(*) as count FROM download_log
    WHERE downloaded_at >= unixepoch() - 86400
  `).get();

  const topUploaders = db.prepare(`
    SELECT u.username, u.plan, COUNT(up.id) as upload_count, SUM(up.size) as total_bytes
    FROM users u
    JOIN api_keys ak ON ak.user_id = u.id
    JOIN uploads up ON up.api_key_id = ak.id
    WHERE up.deleted_at IS NULL
    GROUP BY u.id ORDER BY upload_count DESC LIMIT 10
  `).all();

  res.json({
    usersByPlan,
    totals,
    recentUsers,
    uploadsToday: uploadsToday.count,
    downloadsToday: downloadsToday.count,
    topUploaders,
  });
});

// GET /api/admin/system
router.get('/system', requireAdmin, (req, res) => {
  function safe(cmd) {
    try { return execSync(cmd, { timeout: 5000 }).toString().trim(); }
    catch { return null; }
  }

  const dfRaw = safe('df -h /');
  const freeRaw = safe('free -m');
  const uptimeRaw = safe('uptime -p');
  const loadRaw = safe('cat /proc/loadavg');
  const pmRaw = safe('pm2 jlist');

  let disk = null;
  if (dfRaw) {
    const lines = dfRaw.split('\n');
    if (lines[1]) {
      const parts = lines[1].trim().split(/\s+/);
      disk = { total: parts[1], used: parts[2], available: parts[3], pct: parts[4] };
    }
  }

  let memory = null;
  if (freeRaw) {
    const lines = freeRaw.split('\n');
    const memLine = lines.find(l => l.startsWith('Mem:'));
    if (memLine) {
      const parts = memLine.trim().split(/\s+/);
      memory = { total: parseInt(parts[1]), used: parseInt(parts[2]), free: parseInt(parts[3]), available: parseInt(parts[6]) };
    }
  }

  let load = null;
  if (loadRaw) {
    const parts = loadRaw.split(' ');
    load = { '1m': parts[0], '5m': parts[1], '15m': parts[2] };
  }

  let processes = [];
  if (pmRaw) {
    try {
      const list = JSON.parse(pmRaw);
      processes = list.map(p => ({
        name: p.name,
        status: p.pm2_env?.status,
        pid: p.pid,
        uptime: p.pm2_env?.pm_uptime,
        restarts: p.pm2_env?.restart_time,
        memory: p.monit?.memory,
        cpu: p.monit?.cpu,
      }));
    } catch { /* ignore */ }
  }

  res.json({ disk, memory, uptime: uptimeRaw, load, processes, timestamp: Date.now() });
});

module.exports = router;
