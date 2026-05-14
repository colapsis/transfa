const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');

function requireKey(req, res, next) {
  const key = (req.headers.authorization || '').replace('Bearer ', '').trim() || req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'authentication required' });
  const row = db.prepare(
    `SELECT k.*, u.username, u.plan FROM api_keys k LEFT JOIN users u ON k.user_id = u.id
     WHERE k.key = ? AND k.revoked = 0`
  ).get(key);
  if (!row) return res.status(401).json({ error: 'invalid api key' });
  req.apiKey = row;
  next();
}

// Fire a webhook — called internally after a download event
async function fireWebhooks(userId, event, payload) {
  if (!userId) return;
  const endpoints = db.prepare(
    `SELECT * FROM webhook_endpoints WHERE user_id = ? AND enabled = 1 AND (events = '*' OR events LIKE ?)`
  ).all(userId, `%${event}%`);

  for (const ep of endpoints) {
    const body = JSON.stringify({ event, ...payload, fired_at: new Date().toISOString() });
    const sig = ep.secret
      ? crypto.createHmac('sha256', ep.secret).update(body).digest('hex')
      : null;

    const headers = {
      'Content-Type': 'application/json',
      'X-Transfa-Event': event,
      'X-Transfa-Delivery': crypto.randomUUID(),
    };
    if (sig) headers['X-Transfa-Signature'] = `sha256=${sig}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(ep.url, { method: 'POST', headers, body, signal: controller.signal });
      clearTimeout(timeout);
      db.prepare('UPDATE webhook_endpoints SET last_fired_at = unixepoch(), last_status = ? WHERE id = ?')
        .run(res.status, ep.id);
    } catch (e) {
      db.prepare('UPDATE webhook_endpoints SET last_fired_at = unixepoch(), last_status = 0 WHERE id = ?')
        .run(ep.id);
    }
  }
}

// GET /api/webhooks
router.get('/', requireKey, (req, res) => {
  if (!req.apiKey.user_id) return res.json({ endpoints: [] });
  const endpoints = db.prepare(
    'SELECT id, url, events, enabled, created_at, last_fired_at, last_status FROM webhook_endpoints WHERE user_id = ?'
  ).all(req.apiKey.user_id);
  res.json({ endpoints });
});

// POST /api/webhooks
router.post('/', requireKey, (req, res) => {
  if (!req.apiKey.user_id) return res.status(400).json({ error: 'no user account on this key' });
  const { url, secret, events = 'upload.downloaded' } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try { new URL(url); } catch { return res.status(400).json({ error: 'invalid url' }); }

  const result = db.prepare(
    'INSERT INTO webhook_endpoints (user_id, url, secret, events) VALUES (?, ?, ?, ?)'
  ).run(req.apiKey.user_id, url, secret || null, events);

  res.status(201).json({ id: result.lastInsertRowid, url, events, enabled: true });
});

// PATCH /api/webhooks/:id
router.patch('/:id', requireKey, (req, res) => {
  const ep = db.prepare('SELECT * FROM webhook_endpoints WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.apiKey.user_id);
  if (!ep) return res.status(404).json({ error: 'not found' });

  const { url, secret, events, enabled } = req.body;
  db.prepare('UPDATE webhook_endpoints SET url = ?, secret = ?, events = ?, enabled = ? WHERE id = ?')
    .run(url ?? ep.url, secret !== undefined ? secret : ep.secret, events ?? ep.events, enabled !== undefined ? (enabled ? 1 : 0) : ep.enabled, ep.id);

  res.json({ ok: true });
});

// DELETE /api/webhooks/:id
router.delete('/:id', requireKey, (req, res) => {
  const ep = db.prepare('SELECT * FROM webhook_endpoints WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.apiKey.user_id);
  if (!ep) return res.status(404).json({ error: 'not found' });
  db.prepare('DELETE FROM webhook_endpoints WHERE id = ?').run(ep.id);
  res.json({ deleted: true });
});

// POST /api/webhooks/:id/test — send a test payload
router.post('/:id/test', requireKey, async (req, res) => {
  const ep = db.prepare('SELECT * FROM webhook_endpoints WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.apiKey.user_id);
  if (!ep) return res.status(404).json({ error: 'not found' });

  await fireWebhooks(req.apiKey.user_id, 'webhook.test', {
    message: 'This is a test delivery from transfa.sh',
    endpoint_id: ep.id,
  });
  res.json({ ok: true });
});

module.exports = { router, fireWebhooks };
