const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../db');

// GET /api/download/:id — actual file download
router.get('/:id', (req, res) => {
  const now = Math.floor(Date.now() / 1000);

  const upload = db.prepare(
    'SELECT * FROM uploads WHERE id = ? AND deleted_at IS NULL'
  ).get(req.params.id);

  if (!upload) {
    return res.status(404).json({ error: 'not found' });
  }

  if (upload.expires_at <= now) {
    return res.status(410).json({ error: 'link expired', expired_at: new Date(upload.expires_at * 1000).toISOString() });
  }

  if (upload.max_downloads !== null && upload.download_count >= upload.max_downloads) {
    return res.status(410).json({ error: 'download limit reached' });
  }

  if (!fs.existsSync(upload.storage_path)) {
    return res.status(404).json({ error: 'file not found on storage' });
  }

  // Log the download
  db.prepare(
    'INSERT INTO download_log (upload_id, ip, user_agent) VALUES (?, ?, ?)'
  ).run(upload.id, req.ip, req.headers['user-agent'] || null);

  db.prepare('UPDATE uploads SET download_count = download_count + 1 WHERE id = ?').run(upload.id);

  const filename = upload.original_filename;
  const mimeType = upload.mime_type || 'application/octet-stream';

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', upload.size);
  res.setHeader('X-Transfa-SHA256', upload.sha256 || '');
  res.setHeader('X-Transfa-Expires', new Date(upload.expires_at * 1000).toISOString());

  const stream = fs.createReadStream(upload.storage_path);
  stream.pipe(res);
});

// GET /api/info/:id — file metadata (no download, no auth needed)
router.get('/info/:id', (req, res) => {
  const now = Math.floor(Date.now() / 1000);

  const upload = db.prepare(
    `SELECT u.id, u.original_filename, u.size, u.sha256, u.mime_type,
            u.download_count, u.max_downloads, u.expires_at, u.created_at,
            u.uploader_name, u.deleted_at
     FROM uploads u WHERE u.id = ?`
  ).get(req.params.id);

  if (!upload) return res.status(404).json({ error: 'not found', code: 'NOT_FOUND' });
  if (upload.deleted_at) return res.status(410).json({ error: 'deleted', code: 'DELETED' });

  const expired = upload.expires_at <= now;

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
    expires_at: new Date(upload.expires_at * 1000).toISOString(),
    created_at: new Date(upload.created_at * 1000).toISOString(),
    uploader_name: upload.uploader_name,
    expired,
    active: !expired && !upload.deleted_at,
    last_download_at: lastDl ? new Date(lastDl.downloaded_at * 1000).toISOString() : null,
  });
});

module.exports = router;
