const express = require('express');
const router = express.Router();
const db = require('../db');
const { nanoid } = require('nanoid');

function generateKey() {
  return 'tf_live_' + nanoid(32);
}

// POST /api/auth/key — generate a free API key, auto-creates a user account
router.post('/key', (req, res) => {
  const name = req.body.name || 'default';
  const key = generateKey();

  // Auto-generate a unique username from the key suffix
  const suffix = key.slice(-8).toLowerCase().replace(/[^a-z0-9]/g, '');
  const username = req.body.username
    ? req.body.username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 32)
    : 'user_' + suffix;

  // Create a real (email-less) user so dashboard shows a proper identity
  let userId = null;
  try {
    const user = db.prepare(
      'INSERT INTO users (username, plan) VALUES (?, ?)'
    ).run(username, 'free');
    userId = user.lastInsertRowid;
  } catch {
    // username collision — append random suffix
    const u2 = username + '_' + Math.random().toString(36).slice(2, 6);
    const user = db.prepare('INSERT INTO users (username, plan) VALUES (?, ?)').run(u2, 'free');
    userId = user.lastInsertRowid;
  }

  db.prepare(
    'INSERT INTO api_keys (key, user_id, name, scope) VALUES (?, ?, ?, ?)'
  ).run(key, userId, name, 'read,write');

  res.json({
    key,
    name,
    username,
    scope: 'read,write',
    plan: 'free',
    created_at: new Date().toISOString(),
  });
});

// POST /api/auth/register — create a user account (paid)
router.post('/register', (req, res) => {
  const { email, username, plan = 'free' } = req.body;
  if (!email || !username) {
    return res.status(400).json({ error: 'email and username required' });
  }

  try {
    const user = db.prepare(
      'INSERT INTO users (email, username, plan) VALUES (?, ?, ?)'
    ).run(email, username, plan);

    const key = generateKey();
    db.prepare(
      'INSERT INTO api_keys (key, user_id, name, scope) VALUES (?, ?, ?, ?)'
    ).run(key, user.lastInsertRowid, 'default', 'read,write');

    res.status(201).json({ user_id: user.lastInsertRowid, key, plan });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'email or username already taken' });
    }
    throw err;
  }
});

// GET /api/auth/validate — validate a key and return its info
router.get('/validate', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const key = authHeader.replace('Bearer ', '').trim() || req.query.key;

  if (!key) return res.status(401).json({ error: 'missing api key' });

  const row = db.prepare(
    `SELECT k.*, u.username, u.plan, u.email
     FROM api_keys k LEFT JOIN users u ON k.user_id = u.id
     WHERE k.key = ? AND k.revoked = 0`
  ).get(key);

  if (!row) return res.status(401).json({ error: 'invalid api key' });

  const plan = row.plan || 'free';
  const limits = getPlanLimits(plan);

  res.json({
    valid: true,
    key_id: row.id,
    name: row.name,
    scope: row.scope,
    plan,
    username: row.username,
    uploads_today: row.uploads_today,
    uploads_limit: limits.uploads_per_day,
    max_file_size: limits.max_file_size,
  });
});

function getPlanLimits(plan) {
  const limits = {
    free: { uploads_per_day: 20, max_file_size: 500 * 1024 * 1024, max_ttl_seconds: 48 * 3600 },
    pro:  { uploads_per_day: 500, max_file_size: 5 * 1024 * 1024 * 1024, max_ttl_seconds: 30 * 24 * 3600 },
    team: { uploads_per_day: 5000, max_file_size: 100 * 1024 * 1024 * 1024, max_ttl_seconds: 180 * 24 * 3600 },
  };
  return limits[plan] || limits.free;
}

module.exports = router;
module.exports.getPlanLimits = getPlanLimits;
module.exports.generateKey = generateKey;
