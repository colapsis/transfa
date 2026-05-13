# ■ transfa

**WeTransfer for agents.** Dead-simple file sharing for AI agents and developers.

```bash
npm install -g transfa
transfa upload dataset.parquet
→ https://transfa.sh/a7f9k2
```

One command. Signed link. Auto-expiry. No accounts for recipients.

---

## Why

Most file sharing tools assume a human at a browser. Transfa assumes a process at a terminal — an agent, a CI job, a pipeline step — with an API budget and a deadline.

- **No UI required.** The CLI is the interface.
- **JSON output.** `--json` flag turns every command into structured output agents can parse.
- **Idempotent.** Re-uploading the same file hash returns the existing link. Safe to loop, safe to retry.
- **MCP-native.** Drop-in MCP server for Claude Desktop, Cursor, and any MCP host.

---

## Install

```bash
# npm (recommended)
npm install -g transfa

# or curl (coming soon)
curl -fsSL transfa.sh/install | sh
```

---

## Usage

```bash
# Set your API key (get one free at /dashboard)
transfa auth tf_live_••••••••••••••••••••••••••

# Upload a file (default: 7-day expiry)
transfa upload dataset.parquet

# Custom expiry
transfa upload model.pt --expires=24h

# Machine-readable JSON output
transfa upload report.pdf --json

# One-time link
transfa upload secret.zip --once

# List your uploads
transfa list

# Delete
transfa rm a7f9k2
```

### JSON output

```json
{
  "id": "a7f9k2",
  "url": "https://transfa.sh/a7f9k2",
  "filename": "dataset.parquet",
  "bytes": 2578498560,
  "sha256": "9f3a…c10e",
  "created_at": "2026-05-13T09:14:00Z",
  "expires_at": "2026-05-20T09:14:00Z",
  "download_count": 0
}
```

---

## API

All endpoints under `/api`. Authenticate with `Authorization: Bearer <key>`.

### Upload a file

```http
POST /api/upload
Authorization: Bearer tf_live_•••
Content-Type: multipart/form-data

file=@dataset.parquet
ttl=7d
```

**Response 201:**

```json
{
  "id": "a7f9k2",
  "url": "https://transfa.sh/a7f9k2",
  "filename": "dataset.parquet",
  "bytes": 2578498560,
  "sha256": "9f3a…c10e",
  "expires_at": "2026-05-20T09:14:00Z"
}
```

### List uploads

```http
GET /api/upload?limit=20
Authorization: Bearer tf_live_•••
```

### Delete

```http
DELETE /api/upload/:id
Authorization: Bearer tf_live_•••
```

### File info (no auth)

```http
GET /api/download/info/:id
```

---

## Rate limits

| | Free | Pro | Team |
|---|---|---|---|
| Uploads / day | 20 | 500 | 5,000 |
| Max file size | 500 MB | 5 GB | 100 GB |
| Max TTL | 48h | 30d | 180d |
| API requests / min | 30 | 600 | 3,000 |

Exceeding limits returns `429 Too Many Requests` with a clear message and `upgrade_url`.

---

## Self-host

```bash
# Clone
git clone https://github.com/colapsis/transfa
cd transfa

# Install server deps
cd server && npm install && cd ..

# Build frontend
cd frontend && npm install && npm run build && cd ..

# Start
cd server && node index.js
```

**Requirements:** Node.js 18+, ~50 MB disk for the server (SQLite + uploads stored locally).

**Environment variables:**

```bash
PORT=3001          # server port (default: 3001)
BASE_URL=https://transfa.sh   # used in generated links
```

### PM2 + nginx (production)

```bash
# Start with PM2
pm2 start server/index.js --name transfa

# nginx config: proxy port 80 → 3001
# see nginx/transfa.conf in this repo
```

---

## Project structure

```
transfa/
├── server/          Node.js / Express API
│   ├── index.js     entry point + cron jobs
│   ├── db.js        SQLite schema
│   └── routes/      auth · upload · download · dashboard
├── frontend/        React + Vite
│   └── src/
│       ├── pages/   Landing · Docs · Dashboard · Pricing · Recipient
│       └── components/
├── cli/             npm package (published as `transfa`)
│   └── index.js     upload · auth · list · rm · config
├── uploads/         file storage (swap for S3 in production)
└── transfa.db       SQLite database
```

---

## Contributing

Issues and PRs welcome. The codebase is intentionally small — no build step on the server, no ORM, no framework on the CLI.

---

## License

MIT — © 2026 Transfa Labs
