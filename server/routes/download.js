const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');
const { fireWebhooks } = require('./webhooks');

// GET /api/download/:id — actual file download
router.get('/:id', (req, res) => {
  const now = Math.floor(Date.now() / 1000);

  const upload = db.prepare(
    'SELECT * FROM uploads WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!upload) {
    return res.status(404).json({ error: 'not found' });
  }

  const graceSeconds = upload.grace_seconds || 0;
  const effectiveExpiry = upload.expires_at + graceSeconds;

  if (effectiveExpiry <= now) {
    return res.status(410).json({ error: 'link expired', expired_at: new Date(upload.expires_at * 1000).toISOString() });
  }

  if (upload.max_downloads !== null && upload.download_count >= upload.max_downloads) {
    return res.status(410).json({ error: 'download limit reached' });
  }

  if (upload.password_hash) {
    const provided = req.query.password || req.headers['x-transfa-password'];
    if (!provided) {
      return res.status(401).json({ error: 'password required', code: 'PASSWORD_REQUIRED' });
    }
    const hash = crypto.createHash('sha256').update(String(provided)).digest('hex');
    if (hash !== upload.password_hash) {
      return res.status(403).json({ error: 'invalid password', code: 'INVALID_PASSWORD' });
    }
  }

  if (!fs.existsSync(upload.storage_path)) {
    return res.status(404).json({ error: 'file not found on storage' });
  }

  const filename = upload.original_filename.replace(/[\r\n"\\]/g, '_');
  const mimeType = (upload.mime_type || 'application/octet-stream').replace(/[\r\n]/g, '');
  const inGrace = graceSeconds > 0 && upload.expires_at <= now;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', upload.size);
  res.setHeader('X-Transfa-SHA256', upload.sha256 || '');
  res.setHeader('X-Transfa-Expires', new Date(upload.expires_at * 1000).toISOString());
  if (inGrace) {
    res.setHeader('X-Transfa-In-Grace', 'true');
    res.setHeader('X-Transfa-Grace-Expires', new Date(effectiveExpiry * 1000).toISOString());
  }

  // Start streaming immediately, then log — avoids blocking stream start on DB writes
  const stream = fs.createReadStream(upload.storage_path);
  stream.pipe(res);

  setImmediate(async () => {
    try {
      db.prepare('INSERT INTO download_log (upload_id, ip, user_agent) VALUES (?, ?, ?)').run(upload.id, req.ip, req.headers['user-agent'] || null);
      db.prepare('UPDATE uploads SET download_count = download_count + 1 WHERE id = ?').run(upload.id);

      // Fire webhooks for the upload owner
      const keyRow = db.prepare('SELECT user_id FROM api_keys WHERE id = ?').get(upload.api_key_id);
      if (keyRow?.user_id) {
        fireWebhooks(keyRow.user_id, 'upload.downloaded', {
          upload_id: upload.id,
          filename: upload.original_filename,
          size: upload.size,
          ip: req.ip,
          download_count: upload.download_count + 1,
        }).catch(() => {});
      }
    } catch (e) {
      console.error('[download] log error:', e.message);
    }
  });
});

// GET /api/download/verify/:id?password=xxx — check password without downloading
router.get('/verify/:id', (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const upload = db.prepare('SELECT * FROM uploads WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!upload || upload.expires_at <= now) return res.status(404).json({ ok: false });
  if (!upload.password_hash) return res.json({ ok: true });
  const provided = req.query.password;
  if (!provided) return res.status(401).json({ ok: false, code: 'PASSWORD_REQUIRED' });
  const hash = crypto.createHash('sha256').update(String(provided)).digest('hex');
  res.json({ ok: hash === upload.password_hash });
});

// GET /api/info/:id — file metadata (no download, no auth needed)
router.get('/info/:id', (req, res) => {
  const now = Math.floor(Date.now() / 1000);

  const upload = db.prepare(
    `SELECT u.id, u.original_filename, u.size, u.sha256, u.mime_type,
            u.download_count, u.max_downloads, u.expires_at, u.created_at,
            u.uploader_name, u.deleted_at, u.password_hash,
            u.run_id, u.step, u.consumer, u.intent, u.grace_seconds,
            u.artifact, u.upstream_ids
     FROM uploads u WHERE u.id = ?`
  ).get(req.params.id);

  if (!upload) return res.status(404).json({ error: 'not found', code: 'NOT_FOUND' });
  if (upload.deleted_at) return res.status(410).json({ error: 'deleted', code: 'DELETED' });

  const infoGrace = upload.grace_seconds || 0;
  const infoEffectiveExpiry = upload.expires_at + infoGrace;
  const expired = infoEffectiveExpiry <= now;
  const inGracePeriod = infoGrace > 0 && upload.expires_at <= now && infoEffectiveExpiry > now;

  // last download time
  const lastDl = db.prepare(
    'SELECT downloaded_at FROM download_log WHERE upload_id = ? ORDER BY downloaded_at DESC LIMIT 1'
  ).get(upload.id);

  res.json({
    id: upload.id,
    filename: upload.original_filename,
    bytes: upload.size,
    sha256: upload.sha256,
    mime_type: upload.mime_type,
    download_count: upload.download_count,
    max_downloads: upload.max_downloads,
    has_password: !!upload.password_hash,
    expires_at: new Date(upload.expires_at * 1000).toISOString(),
    created_at: new Date(upload.created_at * 1000).toISOString(),
    uploader_name: upload.uploader_name,
    expired,
    in_grace: inGracePeriod,
    active: !expired && !upload.deleted_at,
    last_download_at: lastDl ? new Date(lastDl.downloaded_at * 1000).toISOString() : null,
    ...(infoGrace > 0  && { grace_seconds: infoGrace, grace_expires_at: new Date(infoEffectiveExpiry * 1000).toISOString() }),
    ...(upload.run_id      && { run_id:       upload.run_id }),
    ...(upload.step        && { step:         upload.step }),
    ...(upload.consumer    && { consumer:     upload.consumer }),
    ...(upload.intent      && { intent:       upload.intent }),
    ...(upload.artifact    && { artifact:     true }),
    ...(upload.upstream_ids && { upstream_ids: JSON.parse(upload.upstream_ids) }),
  });
});

module.exports = router;
