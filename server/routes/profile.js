const express = require('express');
const router = express.Router();
const db = require('../db');

function getBaseUrl(req) {
  return process.env.BASE_URL || `http://${req.headers.host}`;
}

// GET /api/u/:username — public profile: active uploads for a user
router.get('/:username', (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const user = db.prepare('SELECT id, username, plan FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'not found' });

  const uploads = db.prepare(`
    SELECT u.id, u.original_filename, u.size, u.mime_type, u.download_count,
           u.expires_at, u.created_at
    FROM uploads u
    JOIN api_keys ak ON ak.id = u.api_key_id
    WHERE ak.user_id = ? AND u.deleted_at IS NULL AND u.expires_at > ?
      AND u.password_hash IS NULL
    ORDER BY u.created_at DESC
    LIMIT 50
  `).all(user.id, now);

  const base = getBaseUrl(req);

  res.json({
    username: user.username,
    plan: user.plan,
    uploads: uploads.map(u => ({
      id: u.id,
      filename: u.original_filename,
      size: u.size,
      mime_type: u.mime_type,
      download_count: u.download_count,
      expires_at: new Date(u.expires_at * 1000).toISOString(),
      created_at: new Date(u.created_at * 1000).toISOString(),
      url: `${base}/f/${u.id}`,
    })),
  });
});

module.exports = router;
