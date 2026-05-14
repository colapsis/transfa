<p align="center">
  <img src="https://transfa.sh/brand/logo-wordmark.png" height="52" alt="transfa" />
</p>

<p align="center">
  <strong>Dead-simple file sharing for developers and AI agents.</strong><br/>
  Upload with one command. Share with a link. No account required.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/transfa"><img src="https://img.shields.io/npm/v/transfa?color=0ea5e9&label=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/transfa"><img src="https://img.shields.io/npm/dm/transfa?color=8b5cf6&label=downloads" alt="npm downloads" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="node version" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
  <a href="https://transfa.sh"><img src="https://img.shields.io/badge/hosted-transfa.sh-ff6b6b" alt="Hosted service" /></a>
</p>

---

```
$ tf upload model.gguf
✓ Uploaded  model.gguf  (4.2 GB)  →  https://transfa.sh/f/xK9mRp
  SHA-256    a3f8c2...d91b
  Expires    in 7 days
```

---

## Why transfa?

Most file-sharing tools are built for humans clicking through UIs. **transfa is built for the terminal** — designed to be called from shell scripts, CI pipelines, and AI agents (Claude, GPT, Cursor, etc.) that need to move files without friction.

- **No signup required** — just install and upload
- **Any format, any size** — up to 100 GB; ML models, archives, binaries, code, media
- **Built for agents** — JSON API, SHA-256 checksums, idempotent uploads
- **Password protection, download limits, TTL** — full control over every link
- **100+ formats detected** — MIME type auto-detection including `.gguf`, `.safetensors`, `.parquet`, `.ipynb`, and more

---

## Install

```bash
npm install -g transfa
```

Or run without installing:

```bash
npx transfa upload report.pdf
```

Or use the raw install script:

```bash
curl -fsSL https://transfa.sh/install | sh
```

---

## Quick start

```bash
# Upload a file (no account needed)
tf upload photo.jpg

# Upload with custom TTL and password
tf upload secret.zip --ttl 24h --password hunter2

# Upload and pipe the URL to clipboard
tf upload bundle.tar.gz | grep url | awk '{print $2}' | pbcopy

# Download a file
tf download https://transfa.sh/f/xK9mRp

# List your uploads
tf list

# Delete an upload
tf delete xK9mRp
```

---

## API

transfa is fully REST. Every operation the CLI does, you can do with `curl` or any HTTP client.

### Upload

```bash
curl -X POST https://transfa.sh/api/upload \
  -H "Authorization: Bearer $TF_KEY" \
  -F "file=@model.gguf" \
  -F "ttl=7d"
```

```json
{
  "id": "xK9mRp",
  "url": "https://transfa.sh/f/xK9mRp",
  "download_url": "https://transfa.sh/api/download/xK9mRp",
  "filename": "model.gguf",
  "bytes": 4512345678,
  "sha256": "a3f8c2...d91b",
  "expires_at": "2026-05-21T12:00:00.000Z"
}
```

**Upload options** (form fields or headers):

| Field | Header | Description |
|---|---|---|
| `ttl` | `X-Transfa-TTL` | Expiry: `1h`, `24h`, `7d`, `30d` |
| `password` | — | Password-protect the download link |
| `max_downloads` | — | Burn after N downloads |
| `filename` | `X-Transfa-Filename` | Override the stored filename |

### Download

```bash
# Direct download (no auth required)
curl -L https://transfa.sh/api/download/xK9mRp -o model.gguf

# Password-protected
curl -L "https://transfa.sh/api/download/xK9mRp?password=hunter2" -o secret.zip
```

### File info

```bash
curl https://transfa.sh/api/download/info/xK9mRp
```

```json
{
  "id": "xK9mRp",
  "filename": "model.gguf",
  "bytes": 4512345678,
  "sha256": "a3f8c2...d91b",
  "mime_type": "application/octet-stream",
  "download_count": 3,
  "has_password": false,
  "expires_at": "2026-05-21T12:00:00.000Z",
  "active": true
}
```

### List uploads

```bash
curl https://transfa.sh/api/upload \
  -H "Authorization: Bearer $TF_KEY"
```

### Delete

```bash
curl -X DELETE https://transfa.sh/api/upload/xK9mRp \
  -H "Authorization: Bearer $TF_KEY"
```

---

## Supported formats

Over 100 file types with correct MIME detection — including types not in standard MIME databases:

| Category | Formats |
|---|---|
| **ML models** | `.gguf` `.ggml` `.safetensors` `.onnx` `.pt` `.pth` `.pkl` `.ckpt` `.tflite` `.mlmodel` `.lora` |
| **Data science** | `.parquet` `.arrow` `.feather` `.h5` `.hdf5` `.npz` `.npy` `.lance` `.duckdb` `.ipynb` |
| **Code** | `.py` `.rs` `.go` `.ts` `.kt` `.swift` `.scala` `.cu` `.sol` `.vy` `.elm` `.zig` |
| **Archives** | `.zip` `.tar` `.gz` `.bz2` `.xz` `.7z` `.zst` |
| **3D / Design** | `.glb` `.gltf` `.obj` `.stl` `.usdz` `.blend` `.fig` `.sketch` `.psd` |
| **Media** | `.avif` `.webp` `.heic` `.jxl` `.opus` `.flac` `.webm` `.av1` |
| **Config** | `.toml` `.hcl` `.tf` `.tfvars` `.nix` `.dhall` `.lock` `.env` |
| **Everything else** | `.wasm` `.sqlite` `.db` `.pem` `.crt` `.p12` + all standard types |

Any other format is accepted as `application/octet-stream` — nothing is blocked.

---

## Plans

| | Guest | Free | Pro | Team |
|---|---|---|---|---|
| **Max file size** | 10 MB | 500 MB | 50 GB | 100 GB |
| **Uploads / day** | 5 | 20 | 500 | 5,000 |
| **Max TTL** | 24h | 48h | 30 days | 180 days |
| **Storage** | — | — | Unlimited | Unlimited |
| **Price** | Free | Free | $12/mo | $48/mo |
| **Trial** | — | — | 3-day free trial | 3-day free trial |

[→ See full pricing](https://transfa.sh/pricing)

---

## Use with AI agents

transfa is designed to be called from AI coding assistants and autonomous agents:

```python
import subprocess, json

result = subprocess.run(
    ["tf", "upload", "output.csv"],
    capture_output=True, text=True
)
data = json.loads(result.stdout)
print(data["url"])  # https://transfa.sh/f/xK9mRp
```

Or use the REST API directly — no SDKs, no auth flows, just HTTP.

---

## Self-hosting

```bash
git clone https://github.com/colapsis/transfa.git
cd transfa
cp .env.example .env          # fill in your keys
npm install --prefix server
npm install --prefix cli
npm run build --prefix frontend
pm2 start ecosystem.config.cjs
```

**Requirements:** Node.js 18+, nginx (for SSL/proxy)

See [`nginx/transfa.conf`](nginx/transfa.conf) for a production-ready nginx config.

### Environment variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: `3001`) |
| `BASE_URL` | Public URL e.g. `https://transfa.sh` |
| `STRIPE_SECRET_KEY` | Stripe secret key for billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | Stripe price ID for Pro plan |
| `STRIPE_TEAM_PRICE_ID` | Stripe price ID for Team plan |

---

## Security

Found a vulnerability? Please email **transfa.sh@gmail.com** or see [SECURITY.md](SECURITY.md).

Do **not** open a public issue for security reports.

---

## License

[MIT](LICENSE) — © 2026 transfa contributors
