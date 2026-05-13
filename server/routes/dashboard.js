const express = require('express');
const router = express.Router();
const db = require('../db');
const { getPlanLimits } = require('./auth');

function requireKey(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const key = authHeader.replace('Bearer ', '').trim() || req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'authentication required' });

  const row = db.prepare(
    `SELECT k.*, u.username, u.plan, u.email
     FROM api_keys k LEFT JOIN users u ON k.user_id = u.id
     WHERE k.key = ? AND k.revoked = 0`
  ).get(key);

  if (!row) return res.status(401).json({ error: 'invalid api key' });
  req.apiKey = row;
  next();
}

// GET /api/dashboard — summary stats + recent uploads
router.get('/', requireKey, (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const keyRow = req.apiKey;
  const plan = keyRow.plan || 'free';
  const limits = getPlanLimits(plan);

  const monthStart = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);

  const stats = db.prepare(
    `SELECT
       COUNT(*) as total_uploads,
       SUM(CASE WHEN expires_at > ? AND deleted_at IS NULL THEN 1 ELSE 0 END) as active_links,
       SUM(CASE WHEN expires_at > ? AND expires_at <= ? AND deleted_at IS NULL THEN 1 ELSE 0 END) as expiring_soon,
       SUM(CASE WHEN created_at >= ? AND deleted_at IS NULL THEN 1 ELSE 0 END) as uploads_this_month,
       SUM(CASE WHEN deleted_at IS NULL THEN size ELSE 0 END) as total_bytes
     FROM uploads WHERE api_key_id = ?`
  ).get(now, now, now + 86400, monthStart, keyRow.id);

  const uploads = db.prepare(
    `SELECT id, original_filename, size, sha256, download_count, expires_at, created_at, mime_type
     FROM uploads
     WHERE api_key_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 20`
  ).all(keyRow.id);

  const keys = db.prepare(
    'SELECT id, name, key, scope, uploads_today, created_at, last_used_at, revoked FROM api_keys WHERE user_id = ?'
  ).all(keyRow.user_id || -1);

  res.json({
    user: {
      username: keyRow.username || 'anonymous',
      plan,
      email: keyRow.email,
    },
    stats: {
      total_uploads: stats.total_uploads || 0,
      active_links: stats.active_links || 0,
      expiring_soon: stats.expiring_soon || 0,
      uploads_this_month: stats.uploads_this_month || 0,
      total_bytes: stats.total_bytes || 0,
      uploads_limit: limits.uploads_per_day,
    },
    uploads: uploads.map(u => ({
      id: u.id,
      filename: u.original_filename,
      size: u.size,
      sha256: u.sha256,
      download_count: u.download_count,
      expires_at: new Date(u.expires_at * 1000).toISOString(),
      created_at: new Date(u.created_at * 1000).toISOString(),
      expired: u.expires_at <= now,
      mime_type: u.mime_type,
    })),
    api_keys: keys.map(k => ({
      id: k.id,
      name: k.name,
      token_preview: k.key.slice(0, 12) + '•'.repeat(16) + k.key.slice(-4),
      scope: k.scope,
      uploads_today: k.uploads_today,
      created_at: new Date(k.created_at * 1000).toISOString(),
      last_used_at: k.last_used_at ? new Date(k.last_used_at * 1000).toISOString() : null,
      revoked: Boolean(k.revoked),
    })),
  });
});

// POST /api/dashboard/keys/revoke
router.post('/keys/revoke', requireKey, (req, res) => {
  const { key_id } = req.body;
  if (!key_id) return res.status(400).json({ error: 'key_id required' });

  const key = db.prepare(
    'SELECT * FROM api_keys WHERE id = ? AND user_id = ?'
  ).get(key_id, req.apiKey.user_id);

  if (!key) return res.status(404).json({ error: 'not found' });

  db.prepare('UPDATE api_keys SET revoked = 1 WHERE id = ?').run(key_id);
  res.json({ revoked: true });
});

// POST /api/dashboard/keys — create new key
router.post('/keys', requireKey, (req, res) => {
  const { generateKey } = require('./auth');
  const name = req.body.name || 'new key';
  const newKey = generateKey();

  db.prepare(
    'INSERT INTO api_keys (key, user_id, name, scope) VALUES (?, ?, ?, ?)'
  ).run(newKey, req.apiKey.user_id, name, 'read,write');

  res.status(201).json({ key: newKey, name, scope: 'read,write' });
});

module.exports = router;
