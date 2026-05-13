const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/download', require('./routes/download'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Serve frontend (built)
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');
app.use(express.static(FRONTEND_DIST));

// File recipient page — /f/:id goes to frontend SPA
app.get('/f/:id', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

// All other routes → frontend SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

// Daily cron: purge expired uploads
cron.schedule('0 2 * * *', () => {
  const now = Math.floor(Date.now() / 1000);
  const expired = db.prepare(
    'SELECT id, storage_path FROM uploads WHERE expires_at <= ? AND deleted_at IS NULL'
  ).all(now);

  const fs = require('fs');
  let purged = 0;
  for (const row of expired) {
    try {
      if (fs.existsSync(row.storage_path)) fs.unlinkSync(row.storage_path);
      db.prepare('UPDATE uploads SET deleted_at = ? WHERE id = ?').run(now, row.id);
      purged++;
    } catch (e) {
      console.error('purge error', row.id, e.message);
    }
  }
  console.log(`[cron] purged ${purged} expired uploads`);
});

// Reset daily upload counters
cron.schedule('0 0 * * *', () => {
  db.prepare('UPDATE api_keys SET uploads_today = 0, uploads_reset_at = unixepoch()').run();
  console.log('[cron] reset daily upload counters');
});

app.listen(PORT, () => {
  console.log(`transfa server running on port ${PORT}`);
});
