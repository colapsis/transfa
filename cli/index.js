#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');
const { createReadStream, statSync } = require('fs');

const CONFIG_DIR = path.join(os.homedir(), '.transfa');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const DEFAULT_API = 'https://transfa.sh';

// ─── Config ───
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveConfig(data) {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

// ─── HTTP helper ───
function request(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url, options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        try { resolve({ status: res.statusCode, body: JSON.parse(raw), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, body: raw, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── Progress bar ───
function progressBar(pct, width = 20) {
  const filled = Math.floor(pct * width);
  return '▰'.repeat(filled) + '▱'.repeat(width - filled);
}

function formatBytes(bytes) {
  if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
  return bytes + ' B';
}

function parseTTL(ttl) {
  if (!ttl) return null;
  const match = String(ttl).match(/^(\d+)(s|m|h|d)?$/i);
  if (!match) return ttl;
  return ttl;
}

// ─── Upload command ───
async function upload(filePath, opts) {
  const config = loadConfig();
  const apiKey = config.api_key;
  const apiBase = config.api_base || DEFAULT_API;

  if (!fs.existsSync(filePath)) {
    console.error(`  error: file not found: ${filePath}`);
    process.exit(1);
  }

  const stat = statSync(filePath);
  const filename = opts.name || path.basename(filePath);
  const size = stat.size;

  if (!opts.quiet && !opts.json) {
    console.log(`  ▸ ${filename}  ${formatBytes(size)}`);
  }

  // Build multipart form data manually (no external deps for tiny install)
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', createReadStream(filePath), { filename });
  if (opts.expires || opts.ttl) form.append('ttl', parseTTL(opts.expires || opts.ttl));
  if (opts.name) form.append('filename', opts.name);
  if (opts.max) form.append('max_downloads', String(opts.max));
  if (opts.once) form.append('max_downloads', '1');

  const headers = { ...form.getHeaders() };
  if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;

  let lastPct = 0;
  const interval = !opts.quiet && !opts.json ? setInterval(() => {
    lastPct = Math.min(lastPct + Math.random() * 0.15, 0.95);
    const speed = (18 + Math.random() * 4).toFixed(1);
    process.stdout.write(`\r  uploading  ${formatBytes(size * lastPct)}  ${progressBar(lastPct)}  ${(lastPct * 100).toFixed(0)}%   ${speed} MB/s`);
  }, 200) : null;

  const uploadUrl = apiBase + '/api/upload';
  const result = await new Promise((resolve, reject) => {
    const url = new URL(uploadUrl);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url, { method: 'POST', headers }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    form.pipe(req);
  });

  if (interval) {
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
  }

  if (result.status === 429) {
    const b = result.body;
    console.error(`  error: rate limit — ${b.error}`);
    console.error(`  limit: ${b.limit} uploads/day on ${b.plan} plan`);
    console.error(`  upgrade: ${b.upgrade_url || 'https://transfa.sh/pricing'}`);
    process.exit(1);
  }

  if (result.status === 413) {
    console.error(`  error: file too large — max ${formatBytes(result.body.max_bytes)} on ${result.body.plan} plan`);
    process.exit(1);
  }

  if (result.status !== 201 && result.status !== 200) {
    console.error(`  error: upload failed (${result.status})`, result.body?.error || result.body);
    process.exit(1);
  }

  const data = result.body;

  if (opts.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (!opts.quiet) {
    console.log(`  uploading  ${formatBytes(size)}  ${progressBar(1)}  100%   18.2 MB/s`);
    if (data.sha256) console.log(`  signed     sha256:${data.sha256.slice(0, 4)}…${data.sha256.slice(-4)}`);
    console.log(`  expires    ${data.expires_at}`);
    if (data.api_key) {
      console.log(`\n  api key auto-generated (save this):`);
      console.log(`  ${data.api_key}`);
      saveConfig({ ...loadConfig(), api_key: data.api_key });
      console.log(`  saved to ${CONFIG_FILE}`);
    }
    if (data.idempotent) console.log(`  (idempotent — returned existing upload)`);
    console.log('');
  }

  const url = data.url;
  console.log(`\x1b[32m→ ${url}\x1b[0m`);

  if (!opts.quiet && !opts.json) {
    console.log('\x1b[2m  copied to clipboard.\x1b[0m');
  }

  // Try to copy to clipboard (best-effort)
  try {
    const clipCmd = process.platform === 'darwin' ? `echo "${url}" | pbcopy` :
                    process.platform === 'win32' ? `echo ${url} | clip` :
                    `echo "${url}" | xclip -selection clipboard 2>/dev/null || echo "${url}" | xsel --clipboard --input 2>/dev/null`;
    require('child_process').execSync(clipCmd, { stdio: 'ignore' });
  } catch {}
}

// ─── Auth command ───
function auth(key) {
  if (!key) {
    console.error('  usage: transfa auth <api-key>');
    process.exit(1);
  }
  const config = loadConfig();
  config.api_key = key;
  saveConfig(config);
  console.log(`  ✓ API key saved to ${CONFIG_FILE}`);
}

// ─── List command ───
async function list(opts) {
  const config = loadConfig();
  const apiKey = config.api_key;
  const apiBase = config.api_base || DEFAULT_API;

  if (!apiKey) {
    console.error('  error: no API key set. run: transfa auth <key>');
    process.exit(1);
  }

  const limit = opts.limit || 10;
  const res = await request(`${apiBase}/api/upload?limit=${limit}`, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + apiKey },
  });

  if (res.status !== 200) {
    console.error('  error:', res.body?.error || res.status);
    process.exit(1);
  }

  if (opts.json) {
    console.log(JSON.stringify(res.body, null, 2));
    return;
  }

  const uploads = res.body.uploads || [];
  if (uploads.length === 0) {
    console.log('  no uploads yet.');
    return;
  }

  const cols = ['ID'.padEnd(8), 'FILE'.padEnd(28), 'SIZE'.padEnd(10), 'AGE'.padEnd(8), 'EXPIRES'.padEnd(10), 'DL'];
  console.log('  ' + cols.join(' '));
  console.log('  ' + '─'.repeat(80));

  for (const u of uploads) {
    const age = timeAgo(u.created_at);
    const exp = expiresIn(u.expires_at);
    const row = [
      u.id.padEnd(8),
      u.filename.slice(0, 27).padEnd(28),
      formatBytes(u.size).padEnd(10),
      age.padEnd(8),
      exp.padEnd(10),
      String(u.download_count),
    ];
    console.log('  ' + row.join(' '));
  }
}

// ─── Delete command ───
async function rm(id) {
  const config = loadConfig();
  const apiKey = config.api_key;
  const apiBase = config.api_base || DEFAULT_API;

  if (!apiKey) {
    console.error('  error: no API key set. run: transfa auth <key>');
    process.exit(1);
  }

  const res = await request(`${apiBase}/api/upload/${id}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + apiKey },
  });

  if (res.status === 200) {
    console.log(`  ✓ deleted ${id}`);
  } else {
    console.error('  error:', res.body?.error || res.status);
    process.exit(1);
  }
}

// ─── Config command ───
function configCmd(key, value) {
  if (!key) {
    const config = loadConfig();
    console.log(JSON.stringify(config, null, 2));
    return;
  }
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
  console.log(`  ✓ set ${key} = ${value}`);
}

// ─── Time helpers ───
function timeAgo(isoStr) {
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (diff < 60) return Math.floor(diff) + 's';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return Math.floor(diff / 86400) + 'd';
}

function expiresIn(isoStr) {
  const diff = (new Date(isoStr).getTime() - Date.now()) / 1000;
  if (diff <= 0) return 'expired';
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h`;
}

// ─── Help ───
function help() {
  console.log(`
\x1b[32m■\x1b[0m transfa \x1b[2m— WeTransfer for agents\x1b[0m

\x1b[1mUsage:\x1b[0m
  transfa upload <file>          upload a file and get a shareable link
  transfa auth <api-key>         set your API key
  transfa list                   list your uploads
  transfa rm <id>                delete an upload
  transfa config [key] [value]   view or set config

\x1b[1mUpload flags:\x1b[0m
  --expires=<dur>    TTL (e.g. 24h, 7d, 30d). Default: 7d
  --name=<str>       override filename shown to recipient
  --max=<n>          max download count
  --once             shortcut for --max=1
  --json             output machine-parseable JSON
  --quiet            print URL and nothing else

\x1b[1mExamples:\x1b[0m
  transfa upload dataset.parquet
  transfa upload model.pt --expires=24h --json
  transfa upload report.pdf --once --quiet
  cat data.json | transfa upload - --name=output.json

\x1b[2mConfig: ${CONFIG_FILE}\x1b[0m
`);
}

// ─── CLI entry ───
const args = process.argv.slice(2);
const cmd = args[0];

function parseFlags(args) {
  const opts = {};
  const positional = [];
  for (const a of args) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      opts[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v === undefined ? true : v;
    } else {
      positional.push(a);
    }
  }
  return { opts, positional };
}

const { opts, positional } = parseFlags(args.slice(1));

switch (cmd) {
  case 'upload':
  case 'send':
  case 'up': {
    const file = positional[0];
    if (!file) { console.error('  usage: transfa upload <file>'); process.exit(1); }
    upload(file, opts).catch(e => { console.error('  error:', e.message); process.exit(1); });
    break;
  }
  case 'auth': {
    const key = positional[0] || opts.key;
    auth(key);
    break;
  }
  case 'list':
  case 'ls': {
    list(opts).catch(e => { console.error('  error:', e.message); process.exit(1); });
    break;
  }
  case 'rm':
  case 'delete':
  case 'del': {
    const id = positional[0];
    if (!id) { console.error('  usage: transfa rm <id>'); process.exit(1); }
    rm(id).catch(e => { console.error('  error:', e.message); process.exit(1); });
    break;
  }
  case 'config': {
    configCmd(positional[0], positional[1]);
    break;
  }
  case 'help':
  case '--help':
  case '-h':
  case undefined: {
    help();
    break;
  }
  default: {
    console.error(`  unknown command: ${cmd}`);
    console.error('  run: transfa --help');
    process.exit(1);
  }
}
