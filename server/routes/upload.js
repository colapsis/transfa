const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { nanoid } = require('nanoid');
const mimeTypes = require('mime-types');
const db = require('../db');
const { getPlanLimits } = require('./auth');

// Custom MIME types for formats not yet in mime-db
// These are common in ML/data-science/DevOps workflows
const EXTRA_MIME = {
  safetensors: 'application/octet-stream',
  parquet:     'application/vnd.apache.parquet',
  arrow:       'application/vnd.apache.arrow.file',
  feather:     'application/vnd.apache.arrow.file',
  onnx:        'application/vnd.onnx',
  pt:          'application/octet-stream',   // PyTorch checkpoint
  pth:         'application/octet-stream',
  pkl:         'application/octet-stream',
  pickle:      'application/octet-stream',
  ckpt:        'application/octet-stream',   // TF/Lightning checkpoint
  bin:         'application/octet-stream',
  npz:         'application/octet-stream',   // NumPy compressed
  npy:         'application/octet-stream',
  h5:          'application/x-hdf5',
  hdf5:        'application/x-hdf5',
  tflite:      'application/octet-stream',
  mlmodel:     'application/octet-stream',   // Core ML
  torchscript: 'application/octet-stream',
  lora:        'application/octet-stream',
  gguf:        'application/octet-stream',   // llama.cpp model format
  ggml:        'application/octet-stream',
  q4_0:        'application/octet-stream',
  q8_0:        'application/octet-stream',
  msgpack:     'application/msgpack',
  capnp:       'application/octet-stream',
  flatbuffers: 'application/octet-stream',
  lance:       'application/octet-stream',   // Lance columnar format
  duckdb:      'application/octet-stream',
  sqlite:      'application/vnd.sqlite3',
  db:          'application/vnd.sqlite3',
  wasm:        'application/wasm',
  avif:        'image/avif',
  webp:        'image/webp',
  heic:        'image/heic',
  heif:        'image/heif',
  jxl:         'image/jxl',
  opus:        'audio/ogg',
  flac:        'audio/flac',
  aac:         'audio/aac',
  m4a:         'audio/mp4',
  webm:        'video/webm',
  av1:         'video/av1',
  ts:          'video/mp2t',
  m3u8:        'application/vnd.apple.mpegurl',
  stl:         'model/stl',
  obj:         'model/obj',
  glb:         'model/gltf-binary',
  gltf:        'model/gltf+json',
  usdz:        'model/vnd.usdz+zip',
  blend:       'application/octet-stream',   // Blender file
  fig:         'application/octet-stream',   // Figma
  sketch:      'application/octet-stream',
  xcf:         'image/x-xcf',
  psd:         'image/vnd.adobe.photoshop',
  ai:          'application/postscript',
  eps:         'application/postscript',
  dxf:         'image/vnd.dxf',
  dwg:         'image/vnd.dwg',
  toml:        'application/toml',
  // Source code files missing from mime-db or incorrectly mapped
  py:          'text/x-python',
  pyx:         'text/x-python',
  ipynb:       'application/x-ipynb+json',
  rs:          'text/x-rustsrc',
  go:          'text/x-go',
  rb:          'text/x-ruby',
  kt:          'text/x-kotlin',
  kts:         'text/x-kotlin',
  swift:       'text/x-swift',
  scala:       'text/x-scala',
  r:           'text/x-r',
  rmd:         'text/x-r',
  lua:         'text/x-lua',
  zig:         'text/x-zig',
  ex:          'text/x-elixir',
  exs:         'text/x-elixir',
  erl:         'text/x-erlang',
  hrl:         'text/x-erlang',
  clj:         'text/x-clojure',
  cljs:        'text/x-clojure',
  elm:         'text/x-elm',
  ml:          'text/x-ocaml',
  mli:         'text/x-ocaml',
  fs:          'text/x-fsharp',
  fsx:         'text/x-fsharp',
  cs:          'text/x-csharp',
  cpp:         'text/x-c++src',
  cc:          'text/x-c++src',
  cxx:         'text/x-c++src',
  hpp:         'text/x-c++hdr',
  cu:          'text/x-cuda',
  cuh:         'text/x-cuda',
  sol:         'text/x-solidity',
  vy:          'text/x-vyper',
  nix:         'text/plain',
  tf:          'text/plain',
  tfvars:      'text/plain',
  hcl:         'text/plain',
  ron:         'text/plain',
  dhall:       'text/plain',
  lock:        'text/plain',
  env:         'text/plain',
  diff:        'text/x-diff',
  patch:       'text/x-diff',
  pem:         'application/x-pem-file',
  crt:         'application/x-x509-ca-cert',
  p12:         'application/x-pkcs12',
  pfx:         'application/x-pkcs12',
};

function detectMime(filename) {
  const ext = path.extname(filename).replace('.', '').toLowerCase();
  if (ext && EXTRA_MIME[ext]) return EXTRA_MIME[ext];
  return mimeTypes.lookup(filename) || 'application/octet-stream';
}

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Stream SHA-256 without buffering the entire file in memory
function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(filePath, { highWaterMark: 65536 })
      .on('data', chunk => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

function getApiKey(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.replace('Bearer ', '').trim() || req.headers['x-api-key'] || req.query.key;
}

function resolveKey(key) {
  if (!key) return null;
  return db.prepare(
    `SELECT k.*, u.username, u.plan
     FROM api_keys k LEFT JOIN users u ON k.user_id = u.id
     WHERE k.key = ? AND k.revoked = 0`
  ).get(key);
}

function parseTTL(ttl) {
  if (!ttl) return 7 * 24 * 3600;
  const match = String(ttl).match(/^(\d+)(s|m|h|d)?$/i);
  if (!match) return 7 * 24 * 3600;
  const n = parseInt(match[1]);
  const unit = (match[2] || 'd').toLowerCase();
  const mult = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * (mult[unit] || 86400);
}

// Multer — stream to temp location, then move after validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, nanoid(24) + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 * 1024 }, // 100 GB hard ceiling
});

// POST /api/upload — multipart or raw body upload
router.post('/', upload.single('file'), async (req, res) => {
  const rawKey = getApiKey(req);

  // Auto-generate a guest key if none provided (guest plan = 10 MB / 5 per day / 24h TTL)
  let keyRow;
  let autoGenerated = false;
  if (!rawKey) {
    const { generateKey } = require('./auth');
    const newKey = generateKey();
    // Create a real user so the key works with /api/dashboard
    const suffix = newKey.slice(-8).toLowerCase().replace(/[^a-z0-9]/g, '');
    let userId;
    try {
      const u = db.prepare("INSERT INTO users (username, plan) VALUES (?, 'guest')").run('user_' + suffix);
      userId = u.lastInsertRowid;
    } catch {
      const u2 = db.prepare("INSERT INTO users (username, plan) VALUES (?, 'guest')").run('user_' + suffix + '_' + Math.random().toString(36).slice(2, 5));
      userId = u2.lastInsertRowid;
    }
    db.prepare('INSERT INTO api_keys (key, user_id, name, scope) VALUES (?, ?, ?, ?)').run(newKey, userId, 'guest', 'read,write');
    keyRow = db.prepare("SELECT k.*, u.username, 'guest' as plan FROM api_keys k LEFT JOIN users u ON k.user_id = u.id WHERE k.key = ?").get(newKey);
    autoGenerated = true;
    keyRow._generatedKey = newKey;
  } else {
    keyRow = resolveKey(rawKey);
    if (!keyRow) return res.status(401).json({ error: 'invalid api key' });
  }

  const plan = keyRow.plan || 'free';
  const limits = getPlanLimits(plan);

  // Reset daily counter if needed
  const now = Math.floor(Date.now() / 1000);
  if (now - keyRow.uploads_reset_at > 86400) {
    db.prepare('UPDATE api_keys SET uploads_today = 0, uploads_reset_at = ? WHERE id = ?').run(now, keyRow.id);
    keyRow.uploads_today = 0;
  }

  // Rate limit check
  if (keyRow.uploads_today >= limits.uploads_per_day) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(429).json({
      error: 'daily upload limit reached',
      limit: limits.uploads_per_day,
      plan,
      upgrade_url: 'https://transfa.sh/pricing',
    });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'no file provided — use multipart/form-data with field "file"' });
  }

  // File size check
  if (req.file.size > limits.max_file_size) {
    fs.unlinkSync(req.file.path);
    return res.status(413).json({
      error: 'file too large for your plan',
      max_bytes: limits.max_file_size,
      plan,
    });
  }

  // Manifest fields — form fields take priority, headers as fallback
  const runId    = req.body.run_id    || req.headers['x-transfa-run-id']   || null;
  const step     = req.body.step      || req.headers['x-transfa-step']     || null;
  const consumer = req.body.consumer  || req.headers['x-transfa-consumer'] || null;
  const intent   = req.body.intent    || req.headers['x-transfa-intent']   || null;

  // TTL + grace period
  const ttlSeconds = Math.min(
    parseTTL(req.body.ttl || req.headers['x-transfa-ttl'] || '7d'),
    limits.max_ttl_seconds
  );
  const expiresAt = now + ttlSeconds;
  const graceInput = req.body.grace || req.headers['x-transfa-grace'];
  const graceSeconds = graceInput ? parseTTL(graceInput) : 0;

  // SHA-256 — streamed so the event loop stays free during hashing
  let sha256;
  try {
    sha256 = await hashFile(req.file.path);
  } catch (e) {
    fs.unlink(req.file.path, () => {});
    return res.status(500).json({ error: 'failed to process upload' });
  }

  // Compute password hash before idempotency check so we only match uploads with the same password intent
  const passwordHash = req.body.password
    ? crypto.createHash('sha256').update(String(req.body.password)).digest('hex')
    : null;

  // Idempotency: same key + same sha256 + same password → return existing upload
  const existing = db.prepare(
    `SELECT * FROM uploads
     WHERE api_key_id = ? AND sha256 = ? AND deleted_at IS NULL AND expires_at > ?
     AND password_hash IS ?`
  ).get(keyRow.id, sha256, now, passwordHash);

  if (existing) {
    fs.unlinkSync(req.file.path);
    db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(now, keyRow.id);
    const base = getBaseUrl(req);
    const response = {
      id: existing.id,
      download_url: `${base}/api/download/${existing.id}`,
      url: `${base}/f/${existing.id}`,
      filename: existing.original_filename,
      bytes: existing.size,
      sha256: existing.sha256,
      created_at: new Date(existing.created_at * 1000).toISOString(),
      expires_at: new Date(existing.expires_at * 1000).toISOString(),
      download_count: existing.download_count,
      idempotent: true,
    };
    if (autoGenerated) response.api_key = keyRow._generatedKey;
    return res.json(response);
  }

  const uploadId = nanoid(6);
  const originalFilename = req.body.filename || req.headers['x-transfa-filename'] || req.file.originalname;

  const mimeType = detectMime(originalFilename);

  db.prepare(
    `INSERT INTO uploads (id, api_key_id, filename, original_filename, size, sha256, mime_type, storage_path, expires_at, uploader_name, max_downloads, password_hash, run_id, step, consumer, intent, grace_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uploadId, keyRow.id, req.file.filename, originalFilename,
    req.file.size, sha256, mimeType,
    req.file.path, expiresAt,
    keyRow.username || null,
    req.body.max_downloads ? parseInt(req.body.max_downloads) : null,
    passwordHash,
    runId, step, consumer, intent, graceSeconds
  );

  db.prepare('UPDATE api_keys SET uploads_today = uploads_today + 1, last_used_at = ? WHERE id = ?').run(now, keyRow.id);

  const base = getBaseUrl(req);
  const response = {
    id: uploadId,
    download_url: `${base}/api/download/${uploadId}`,
    url: `${base}/f/${uploadId}`,
    filename: originalFilename,
    bytes: req.file.size,
    sha256,
    created_at: new Date(now * 1000).toISOString(),
    expires_at: new Date(expiresAt * 1000).toISOString(),
    download_count: 0,
  };
  if (runId)        response.run_id       = runId;
  if (step)         response.step         = step;
  if (consumer)     response.consumer     = consumer;
  if (intent)       response.intent       = intent;
  if (graceSeconds) response.grace_seconds = graceSeconds;
  if (autoGenerated) response.api_key = keyRow._generatedKey;

  res.status(201).json(response);
});

// GET /api/upload — list uploads for authenticated key
router.get('/', (req, res) => {
  const rawKey = getApiKey(req);
  const keyRow = resolveKey(rawKey);
  if (!keyRow) return res.status(401).json({ error: 'invalid api key' });

  const now = Math.floor(Date.now() / 1000);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  const uploads = db.prepare(
    `SELECT id, original_filename, size, sha256, download_count, expires_at, created_at, uploader_name
     FROM uploads
     WHERE api_key_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(keyRow.id, limit, offset);

  const total = db.prepare(
    'SELECT COUNT(*) as n FROM uploads WHERE api_key_id = ? AND deleted_at IS NULL'
  ).get(keyRow.id).n;

  res.json({
    uploads: uploads.map(u => ({
      id: u.id,
      filename: u.original_filename,
      size: u.size,
      sha256: u.sha256,
      download_count: u.download_count,
      url: `${getBaseUrl(req)}/f/${u.id}`,
      created_at: new Date(u.created_at * 1000).toISOString(),
      expires_at: new Date(u.expires_at * 1000).toISOString(),
      expired: u.expires_at <= now,
    })),
    total,
    limit,
    offset,
  });
});

// GET /api/run/:run_id — manifest: all artifacts for a pipeline run
// Mounted at /api/run, so this handler path is just /:run_id
router.get('/:run_id', (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const base = getBaseUrl(req);

  const artifacts = db.prepare(
    `SELECT id, original_filename, size, sha256, mime_type, download_count,
            max_downloads, expires_at, created_at, uploader_name,
            run_id, step, consumer, intent
     FROM uploads
     WHERE run_id = ? AND deleted_at IS NULL
     ORDER BY created_at ASC`
  ).all(req.params.run_id);

  if (artifacts.length === 0) {
    return res.status(404).json({ error: 'run not found', run_id: req.params.run_id });
  }

  res.json({
    run_id: req.params.run_id,
    total: artifacts.length,
    created_at: new Date(artifacts[0].created_at * 1000).toISOString(),
    artifacts: artifacts.map(u => ({
      id: u.id,
      url: `${base}/f/${u.id}`,
      download_url: `${base}/api/download/${u.id}`,
      filename: u.original_filename,
      bytes: u.size,
      sha256: u.sha256,
      mime_type: u.mime_type,
      step: u.step || null,
      consumer: u.consumer || null,
      intent: u.intent || null,
      download_count: u.download_count,
      max_downloads: u.max_downloads || null,
      expires_at: new Date(u.expires_at * 1000).toISOString(),
      created_at: new Date(u.created_at * 1000).toISOString(),
      active: u.expires_at > now,
    })),
  });
});

// PATCH /api/upload/:id/extend — bump expiry without re-uploading
router.patch('/:id/extend', (req, res) => {
  const rawKey = getApiKey(req);
  const keyRow = resolveKey(rawKey);
  if (!keyRow) return res.status(401).json({ error: 'invalid api key' });

  const upload = db.prepare(
    'SELECT * FROM uploads WHERE id = ? AND api_key_id = ? AND deleted_at IS NULL'
  ).get(req.params.id, keyRow.id);

  if (!upload) return res.status(404).json({ error: 'not found' });

  const ttl = req.body.ttl || '7d';
  const now = Math.floor(Date.now() / 1000);
  const addSeconds = parseTTL(ttl);
  // Extend from current expiry if not yet expired, otherwise from now
  const base = upload.expires_at > now ? upload.expires_at : now;
  const newExpiry = base + addSeconds;

  db.prepare('UPDATE uploads SET expires_at = ? WHERE id = ?').run(newExpiry, upload.id);
  res.json({ id: upload.id, expires_at: new Date(newExpiry * 1000).toISOString() });
});

// ─── Presigned upload helpers ────────────────────────────────────────────────

const PRESIGN_SECRET = () => process.env.ADMIN_PASSWORD || 'insecure-dev';

function signPresignedToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', PRESIGN_SECRET())
    .update(body)
    .digest('base64url');
  return body + '.' + sig;
}

function verifyPresignedToken(token) {
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', PRESIGN_SECRET())
    .update(body)
    .digest('base64url');
  // Constant-time comparison
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// POST /api/upload/presigned — generate a short-lived signed upload token (requires Bearer auth)
router.post('/presigned', (req, res) => {
  const rawKey = getApiKey(req);
  const keyRow = resolveKey(rawKey);
  if (!keyRow) return res.status(401).json({ error: 'invalid api key' });

  const expiresIn = parseInt(req.body.expires_in) || 3600;
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    kid: keyRow.id,
    exp: now + expiresIn,
  };
  if (req.body.ttl         !== undefined) payload.ttl           = req.body.ttl;
  if (req.body.max_downloads !== undefined) payload.max_downloads = req.body.max_downloads;
  if (req.body.filename    !== undefined) payload.filename      = req.body.filename;

  const token = signPresignedToken(payload);
  const base = getBaseUrl(req);

  res.json({
    token,
    upload_url: `${base}/api/upload/presigned/${token}`,
    expires_in: expiresIn,
    expires_at: new Date((now + expiresIn) * 1000).toISOString(),
  });
});

// POST /api/upload/presigned/:token — upload a file using a presigned token (no API key required)
router.post('/presigned/:token', upload.single('file'), async (req, res) => {
  const payload = verifyPresignedToken(req.params.token);
  if (!payload) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(401).json({ error: 'invalid or expired presigned token' });
  }

  // Look up the api_key by kid, verify it is not revoked
  const keyRow = db.prepare(
    `SELECT k.*, u.username, u.plan
     FROM api_keys k LEFT JOIN users u ON k.user_id = u.id
     WHERE k.id = ? AND k.revoked = 0`
  ).get(payload.kid);

  if (!keyRow) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(401).json({ error: 'invalid or expired presigned token' });
  }

  const plan = keyRow.plan || 'free';
  const limits = getPlanLimits(plan);

  // Reset daily counter if needed
  const now = Math.floor(Date.now() / 1000);
  if (now - keyRow.uploads_reset_at > 86400) {
    db.prepare('UPDATE api_keys SET uploads_today = 0, uploads_reset_at = ? WHERE id = ?').run(now, keyRow.id);
    keyRow.uploads_today = 0;
  }

  // Rate limit check (same as normal upload)
  if (keyRow.uploads_today >= limits.uploads_per_day) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(429).json({
      error: 'daily upload limit reached',
      limit: limits.uploads_per_day,
      plan,
      upgrade_url: 'https://transfa.sh/pricing',
    });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'no file provided — use multipart/form-data with field "file"' });
  }

  // File size check
  if (req.file.size > limits.max_file_size) {
    fs.unlinkSync(req.file.path);
    return res.status(413).json({
      error: 'file too large for your plan',
      max_bytes: limits.max_file_size,
      plan,
    });
  }

  // TTL + grace — token payload takes priority, then body/header, then default
  const ttlSeconds = Math.min(
    parseTTL(payload.ttl || req.body.ttl || req.headers['x-transfa-ttl'] || '7d'),
    limits.max_ttl_seconds
  );
  const expiresAt = now + ttlSeconds;
  const graceInput = req.body.grace || req.headers['x-transfa-grace'];
  const graceSeconds = graceInput ? parseTTL(graceInput) : 0;

  // SHA-256
  let sha256;
  try {
    sha256 = await hashFile(req.file.path);
  } catch (e) {
    fs.unlink(req.file.path, () => {});
    return res.status(500).json({ error: 'failed to process upload' });
  }

  const passwordHash = req.body.password
    ? crypto.createHash('sha256').update(String(req.body.password)).digest('hex')
    : null;

  // Idempotency: same key + same sha256 + same password → return existing upload
  const existing = db.prepare(
    `SELECT * FROM uploads
     WHERE api_key_id = ? AND sha256 = ? AND deleted_at IS NULL AND expires_at > ?
     AND password_hash IS ?`
  ).get(keyRow.id, sha256, now, passwordHash);

  if (existing) {
    fs.unlinkSync(req.file.path);
    db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(now, keyRow.id);
    const base = getBaseUrl(req);
    return res.json({
      id: existing.id,
      download_url: `${base}/api/download/${existing.id}`,
      url: `${base}/f/${existing.id}`,
      filename: existing.original_filename,
      bytes: existing.size,
      sha256: existing.sha256,
      created_at: new Date(existing.created_at * 1000).toISOString(),
      expires_at: new Date(existing.expires_at * 1000).toISOString(),
      download_count: existing.download_count,
      idempotent: true,
    });
  }

  const uploadId = nanoid(6);
  // filename: token payload → form field → header → original name
  const originalFilename = payload.filename || req.body.filename || req.headers['x-transfa-filename'] || req.file.originalname;
  const mimeType = detectMime(originalFilename);

  // Manifest fields
  const runId    = req.body.run_id    || req.headers['x-transfa-run-id']   || null;
  const step     = req.body.step      || req.headers['x-transfa-step']     || null;
  const consumer = req.body.consumer  || req.headers['x-transfa-consumer'] || null;
  const intent   = req.body.intent    || req.headers['x-transfa-intent']   || null;

  const maxDownloads = payload.max_downloads !== undefined
    ? parseInt(payload.max_downloads) || null
    : (req.body.max_downloads ? parseInt(req.body.max_downloads) : null);

  db.prepare(
    `INSERT INTO uploads (id, api_key_id, filename, original_filename, size, sha256, mime_type, storage_path, expires_at, uploader_name, max_downloads, password_hash, run_id, step, consumer, intent, grace_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uploadId, keyRow.id, req.file.filename, originalFilename,
    req.file.size, sha256, mimeType,
    req.file.path, expiresAt,
    keyRow.username || null,
    maxDownloads,
    passwordHash,
    runId, step, consumer, intent, graceSeconds
  );

  db.prepare('UPDATE api_keys SET uploads_today = uploads_today + 1, last_used_at = ? WHERE id = ?').run(now, keyRow.id);

  const base = getBaseUrl(req);
  const response = {
    id: uploadId,
    download_url: `${base}/api/download/${uploadId}`,
    url: `${base}/f/${uploadId}`,
    filename: originalFilename,
    bytes: req.file.size,
    sha256,
    created_at: new Date(now * 1000).toISOString(),
    expires_at: new Date(expiresAt * 1000).toISOString(),
    download_count: 0,
  };
  if (runId)        response.run_id       = runId;
  if (step)         response.step         = step;
  if (consumer)     response.consumer     = consumer;
  if (intent)       response.intent       = intent;
  if (graceSeconds) response.grace_seconds = graceSeconds;

  res.status(201).json(response);
});

// ─────────────────────────────────────────────────────────────────────────────

// DELETE /api/upload/:id
router.delete('/:id', (req, res) => {
  const rawKey = getApiKey(req);
  const keyRow = resolveKey(rawKey);
  if (!keyRow) return res.status(401).json({ error: 'invalid api key' });

  const upload = db.prepare(
    'SELECT * FROM uploads WHERE id = ? AND api_key_id = ? AND deleted_at IS NULL'
  ).get(req.params.id, keyRow.id);

  if (!upload) return res.status(404).json({ error: 'not found' });

  try {
    if (fs.existsSync(upload.storage_path)) fs.unlinkSync(upload.storage_path);
  } catch (e) {}

  db.prepare('UPDATE uploads SET deleted_at = ? WHERE id = ?').run(Math.floor(Date.now() / 1000), upload.id);
  res.json({ deleted: true, id: upload.id });
});

function getBaseUrl(req) {
  return process.env.BASE_URL || `http://${req.headers.host}`;
}

module.exports = router;
