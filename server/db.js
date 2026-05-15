const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../transfa.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');    // safe with WAL; ~2x faster than FULL
db.pragma('cache_size = -65536');     // 64 MB page cache per connection
db.pragma('temp_store = MEMORY');     // temp tables/indices in RAM
db.pragma('mmap_size = 268435456');   // 256 MB memory-mapped I/O for reads
db.pragma('busy_timeout = 5000');     // wait up to 5 s on SQLITE_BUSY instead of erroring
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    username TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    subscription_status TEXT DEFAULT 'inactive',
    subscription_period_end INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    name TEXT NOT NULL DEFAULT 'default',
    scope TEXT NOT NULL DEFAULT 'read,write',
    uploads_today INTEGER NOT NULL DEFAULT 0,
    uploads_reset_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_used_at INTEGER,
    revoked INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    api_key_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    size INTEGER NOT NULL,
    sha256 TEXT,
    mime_type TEXT,
    storage_path TEXT NOT NULL,
    download_count INTEGER NOT NULL DEFAULT 0,
    max_downloads INTEGER,
    password_hash TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER,
    uploader_name TEXT,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
  );

  CREATE TABLE IF NOT EXISTS download_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upload_id TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    downloaded_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (upload_id) REFERENCES uploads(id)
  );

  CREATE INDEX IF NOT EXISTS idx_uploads_api_key ON uploads(api_key_id);
  CREATE INDEX IF NOT EXISTS idx_uploads_expires ON uploads(expires_at);
  CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
  CREATE INDEX IF NOT EXISTS idx_uploads_sha256 ON uploads(api_key_id, sha256);
  CREATE INDEX IF NOT EXISTS idx_upload_log_upload ON download_log(upload_id);
  CREATE INDEX IF NOT EXISTS idx_uploads_active ON uploads(api_key_id, deleted_at, expires_at);
`);

// Manifest columns — added after initial schema so existing DBs migrate cleanly
for (const col of ['run_id TEXT', 'step TEXT', 'consumer TEXT', 'intent TEXT']) {
  try { db.exec(`ALTER TABLE uploads ADD COLUMN ${col}`); } catch { /* already exists */ }
}

// Grace period — seconds the file stays downloadable after expires_at
try { db.exec('ALTER TABLE uploads ADD COLUMN grace_seconds INTEGER NOT NULL DEFAULT 0'); } catch { /* already exists */ }

// Acquisition source — utm_source or parsed referrer from web uploads
try { db.exec('ALTER TABLE uploads ADD COLUMN source TEXT'); } catch { /* already exists */ }
try { db.exec('CREATE INDEX IF NOT EXISTS idx_uploads_run ON uploads(run_id)'); } catch { /* already exists */ }

// Webhook endpoints table
db.exec(`
  CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    events TEXT NOT NULL DEFAULT 'upload.downloaded',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_fired_at INTEGER,
    last_status INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhook_endpoints(user_id);
`);

module.exports = db;
