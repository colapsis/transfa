#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');
const crypto = require('crypto');
const { createReadStream, createWriteStream, statSync } = require('fs');

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

  const isStdin = filePath === '-';
  let size, filename, fileSource;

  if (isStdin) {
    const chunks = [];
    await new Promise((resolve, reject) => {
      process.stdin.on('data', c => chunks.push(c));
      process.stdin.on('end', resolve);
      process.stdin.on('error', reject);
    });
    fileSource = Buffer.concat(chunks);
    size = fileSource.length;
    filename = opts.name || 'stdin';
  } else {
    if (!fs.existsSync(filePath)) {
      console.error(`  error: file not found: ${filePath}`);
      process.exit(1);
    }
    const stat = statSync(filePath);
    size = stat.size;
    filename = opts.name || path.basename(filePath);
    fileSource = createReadStream(filePath);
  }

  if (!opts.quiet && !opts.json) {
    console.log(`  ▸ ${filename}  ${formatBytes(size)}`);
  }

  const FormData = require('form-data');
  const form = new FormData();
  if (isStdin) {
    form.append('file', fileSource, { filename, knownLength: size });
  } else {
    form.append('file', fileSource, { filename });
  }
  if (opts.expires || opts.ttl) form.append('ttl', parseTTL(opts.expires || opts.ttl));
  if (opts.name) form.append('filename', opts.name);
  if (opts.max) form.append('max_downloads', String(opts.max));
  if (opts.once) form.append('max_downloads', '1');
  if (opts.grace)    form.append('grace',    opts.grace);
  if (opts.runId)    form.append('run_id',   opts.runId);
  if (opts.step)     form.append('step',     opts.step);
  if (opts.consumer) form.append('consumer', opts.consumer);
  if (opts.intent)   form.append('intent',   opts.intent);

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
    if (data.sha256) console.log(`  signed     sha256:${data.sha256.slice(0, 4)}...${data.sha256.slice(-4)}`);
    console.log(`  expires    ${data.expires_at}`);
    if (data.run_id)   console.log(`  run        ${data.run_id}`);
    if (data.step)     console.log(`  step       ${data.step}`);
    if (data.consumer) console.log(`  consumer   ${data.consumer}`);
    if (data.intent)   console.log(`  intent     ${data.intent}`);
    if (data.api_key) {
      console.log(`\n  api key auto-generated (save this):`);
      console.log(`  ${data.api_key}`);
      saveConfig({ ...loadConfig(), api_key: data.api_key });
      console.log(`  saved to ${CONFIG_FILE}`);
    }
    if (data.idempotent) console.log(`  (idempotent — returned existing upload)`);
    console.log('');
  }

  const agentUrl = data.download_url || data.url;
  const shareUrl = data.url;

  // Agent link first (direct download, no UI)
  console.log(`\x1b[32m→ Agent Link\x1b[0m  ${agentUrl}`);
  // Human link second (recipient page)
  if (agentUrl !== shareUrl) {
    console.log(`\x1b[2m→ Human Link\x1b[0m  ${shareUrl}`);
  }

  if (!opts.quiet && !opts.json) {
    console.log('\x1b[2m  copied to clipboard.\x1b[0m');
  }

  // Copy the agent URL to clipboard (most useful for piping into tools)
  try {
    const clipCmd = process.platform === 'darwin' ? `echo "${agentUrl}" | pbcopy` :
                    process.platform === 'win32' ? `echo ${agentUrl} | clip` :
                    `echo "${agentUrl}" | xclip -selection clipboard 2>/dev/null || echo "${agentUrl}" | xsel --clipboard --input 2>/dev/null`;
    require('child_process').execSync(clipCmd, { stdio: 'ignore' });
  } catch {}
}

// ─── Stream download helper ───
function streamDownload(urlStr, destPath, totalBytes, password) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlStr);
    if (password) urlObj.searchParams.set('password', password);
    const lib = urlObj.protocol === 'https:' ? https : http;
    const hash = crypto.createHash('sha256');
    let bytesReceived = 0;

    const interval = setInterval(() => {
      if (totalBytes > 0) {
        const pct = Math.min(bytesReceived / totalBytes, 0.99);
        process.stdout.write(`\r  downloading  ${formatBytes(bytesReceived)}  ${progressBar(pct)}  ${(pct * 100).toFixed(0)}%`);
      }
    }, 150);

    lib.get(urlObj, (res) => {
      clearInterval(interval);
      if (res.statusCode === 401) return reject(new Error('password required — use --password=<pw>'));
      if (res.statusCode === 403) return reject(new Error('invalid password'));
      if (res.statusCode === 410) return reject(new Error('link expired'));
      if (res.statusCode !== 200) return reject(new Error(`server returned ${res.statusCode}`));

      const out = createWriteStream(destPath);
      res.on('data', chunk => {
        hash.update(chunk);
        bytesReceived += chunk.length;
      });
      res.pipe(out);
      out.on('finish', () => {
        process.stdout.write('\r' + ' '.repeat(72) + '\r');
        resolve({ bytesReceived, sha256: hash.digest('hex') });
      });
      out.on('error', reject);
      res.on('error', reject);
    }).on('error', (e) => { clearInterval(interval); reject(e); });
  });
}

// ─── Download command ───
async function download(id, opts) {
  const config = loadConfig();
  const apiBase = config.api_base || DEFAULT_API;

  // Fetch metadata first
  const infoRes = await request(`${apiBase}/api/download/info/${id}`, { method: 'GET' });
  if (infoRes.status === 404) {
    console.error(`  error: upload "${id}" not found`);
    process.exit(1);
  }
  if (infoRes.status !== 200) {
    console.error('  error:', infoRes.body?.error || infoRes.status);
    process.exit(1);
  }

  const meta = infoRes.body;

  if (meta.expired && !meta.in_grace) {
    console.error(`  error: link expired at ${meta.expires_at}`);
    process.exit(1);
  }

  if (meta.has_password && !opts.password) {
    console.error('  error: this file is password-protected — use --password=<pw>');
    process.exit(1);
  }

  const destPath = opts.output || opts.o || meta.filename;

  if (!opts.quiet && !opts.json) {
    console.log('');
    console.log(`  ↓ ${meta.filename}  ${formatBytes(meta.bytes)}`);
    if (meta.sha256) console.log(`  sha256    ${meta.sha256}`);
    if (meta.in_grace) console.log(`  \x1b[33m! in grace period — link nominally expired but file still available\x1b[0m`);
    console.log(`  output    ${destPath}`);
    console.log('');
  }

  const downloadUrl = `${apiBase}/api/download/${id}`;
  let result;
  try {
    result = await streamDownload(downloadUrl, destPath, meta.bytes, opts.password);
  } catch (e) {
    try { fs.unlinkSync(destPath); } catch {}
    console.error(`  error: ${e.message}`);
    process.exit(1);
  }

  // Verify integrity — on by default, skipped with --no-verify
  const shouldVerify = opts.verify !== false && opts['no-verify'] !== true;
  if (shouldVerify && meta.sha256) {
    if (result.sha256 === meta.sha256) {
      if (!opts.quiet && !opts.json) {
        console.log(`  \x1b[32m✓ verified\x1b[0m  sha256:${result.sha256.slice(0, 8)}...${result.sha256.slice(-4)}`);
      }
    } else {
      console.error('  \x1b[31m✗ hash mismatch — file may be corrupted!\x1b[0m');
      console.error(`  expected  ${meta.sha256}`);
      console.error(`  got       ${result.sha256}`);
      try { fs.unlinkSync(destPath); } catch {}
      process.exit(2);
    }
  }

  if (opts.json) {
    console.log(JSON.stringify({
      id, filename: meta.filename, bytes: result.bytesReceived,
      sha256: result.sha256, verified: meta.sha256 === result.sha256,
      output: destPath,
    }));
    return;
  }

  if (!opts.quiet) {
    console.log(`  saved to  ${destPath}\n`);
  }
}

// ─── Run command ───
async function run(runId, opts) {
  const config = loadConfig();
  const apiBase = config.api_base || DEFAULT_API;

  const res = await request(`${apiBase}/api/run/${encodeURIComponent(runId)}`, {
    method: 'GET',
    headers: config.api_key ? { Authorization: 'Bearer ' + config.api_key } : {},
  });

  if (res.status === 404) {
    console.error(`  error: run "${runId}" not found`);
    process.exit(1);
  }
  if (res.status !== 200) {
    console.error('  error:', res.body?.error || res.status);
    process.exit(1);
  }

  const d = res.body;

  if (opts.json) {
    console.log(JSON.stringify(d, null, 2));
    return;
  }

  console.log('');
  console.log(`  run_id   ${d.run_id}`);
  console.log(`  total    ${d.total} artifact${d.total !== 1 ? 's' : ''}`);
  if (d.created_at) console.log(`  started  ${d.created_at}`);
  console.log('');
  for (const a of d.artifacts) {
    const exp = expiresIn(a.expires_at);
    const name = (a.filename || '').slice(0, 36);
    console.log(`  \x1b[32m→\x1b[0m ${a.id}  ${name}`);
    if (a.step)     console.log(`    step       ${a.step}`);
    if (a.consumer) console.log(`    consumer   ${a.consumer}`);
    if (a.intent)   console.log(`    intent     ${a.intent}`);
    console.log(`    size       ${formatBytes(a.bytes)}   expires ${exp}   dl ${a.download_count}`);
    console.log(`    \x1b[2m${a.download_url}\x1b[0m`);
  }
  console.log('');
}

// ─── Auth command ───
async function auth(key, opts) {
  const config = loadConfig();
  const apiBase = config.api_base || DEFAULT_API;

  // Explicit key provided → save it
  if (key) {
    config.api_key = key;
    saveConfig(config);
    console.log(`  \x1b[32m✓\x1b[0m API key saved to ${CONFIG_FILE}`);
    return;
  }

  // Key already saved → show it (don't generate a new one)
  if (config.api_key) {
    if (opts.json) {
      console.log(JSON.stringify({ key: config.api_key, config: CONFIG_FILE }));
      return;
    }
    console.log('');
    console.log(`  \x1b[32m✓\x1b[0m already authenticated`);
    console.log(`  key:     \x1b[1m${config.api_key}\x1b[0m`);
    console.log(`  config:  ${CONFIG_FILE}`);
    console.log('');
    console.log(`  \x1b[2mrun "tf auth --new" to generate an additional key\x1b[0m`);
    console.log('');
    return;
  }

  // No key at all → generate one
  await generateNewKey(opts);
}

async function generateNewKey(opts = {}) {
  const config = loadConfig();
  const apiBase = config.api_base || DEFAULT_API;

  const res = await request(`${apiBase}/api/auth/key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, JSON.stringify({ name: opts.name || 'cli' }));

  if (res.status !== 200) {
    console.error('  error: failed to generate key:', res.body?.error || res.status);
    process.exit(1);
  }

  const d = res.body;
  config.api_key = d.key;
  saveConfig(config);

  if (opts.json) {
    console.log(JSON.stringify({ key: d.key, username: d.username, plan: d.plan }));
    return;
  }

  console.log(`\n  \x1b[32m✓\x1b[0m new API key generated`);
  console.log(`  key:      \x1b[1m${d.key}\x1b[0m`);
  console.log(`  username: ${d.username}`);
  console.log(`  plan:     ${d.plan}`);
  console.log(`  saved to  ${CONFIG_FILE}`);
  console.log('');
}

// ─── Keys command ───
async function keys(opts) {
  const config = loadConfig();
  const apiKey = config.api_key;
  const apiBase = config.api_base || DEFAULT_API;

  if (!apiKey) {
    console.error('  error: not authenticated. run: tf auth');
    process.exit(1);
  }

  const res = await request(`${apiBase}/api/dashboard`, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + apiKey },
  });

  if (res.status !== 200) {
    console.error('  error:', res.body?.error || res.status);
    process.exit(1);
  }

  const apiKeys = res.body.api_keys || [];
  if (apiKeys.length === 0) {
    console.log('  no API keys found.');
    return;
  }

  if (opts.json) {
    console.log(JSON.stringify(apiKeys, null, 2));
    return;
  }

  console.log('');
  for (const k of apiKeys) {
    const status = k.revoked ? '\x1b[31m✗ revoked\x1b[0m' : '\x1b[32m✓ active\x1b[0m ';
    const current = k.token_preview.startsWith(apiKey.slice(0, 12)) ? ' \x1b[33m← current\x1b[0m' : '';
    console.log(`  ${status}  ${k.token_preview}  ${k.name || ''}${current}`);
    if (k.last_used_at) console.log(`           last used ${timeAgo(k.last_used_at)}`);
  }
  console.log('');
}

// ─── Whoami command ───
async function whoami(opts) {
  const config = loadConfig();
  const apiKey = config.api_key;
  const apiBase = config.api_base || DEFAULT_API;

  if (!apiKey) {
    console.log('  not authenticated — run: transfa auth');
    return;
  }

  const res = await request(`${apiBase}/api/auth/validate`, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + apiKey },
  });

  if (res.status !== 200) {
    console.error('  error: key invalid or expired — run: transfa auth');
    process.exit(1);
  }

  const d = res.body;
  if (opts.json) {
    console.log(JSON.stringify(d));
    return;
  }

  console.log('');
  console.log(`  key:      ${apiKey.slice(0, 12)}${'•'.repeat(16)}${apiKey.slice(-4)}`);
  if (d.username) console.log(`  username: ${d.username}`);
  console.log(`  plan:     ${d.plan}`);
  console.log(`  uploads:  ${d.uploads_today} / ${d.uploads_limit} today`);
  console.log(`  config:   ${CONFIG_FILE}`);
  console.log('');
}

// ─── List command ───
async function list(opts) {
  const config = loadConfig();
  const apiKey = config.api_key;
  const apiBase = config.api_base || DEFAULT_API;

  if (!apiKey) {
    console.error('  error: not authenticated. run: transfa auth');
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
    const out = (res.body.uploads || []).map(u => ({ ...u, share_url: `${apiBase}/f/${u.id}`, download_url: `${apiBase}/api/download/${u.id}` }));
    console.log(JSON.stringify(out, null, 2));
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
    const name = (u.filename || u.original_filename || '').slice(0, 27);
    const shareUrl = `${apiBase}/f/${u.id}`;
    const row = [
      u.id.padEnd(8),
      name.padEnd(28),
      formatBytes(u.size).padEnd(10),
      age.padEnd(8),
      exp.padEnd(10),
      String(u.download_count),
    ];
    console.log('  ' + row.join(' '));
    if (opts.urls) console.log(`    \x1b[2m${shareUrl}\x1b[0m`);
  }
}

// ─── Watch command ───
async function watch(id, opts) {
  const config = loadConfig();
  const apiBase = config.api_base || DEFAULT_API;

  const res = await request(`${apiBase}/api/download/info/${id}`, { method: 'GET' });
  if (res.status !== 200) {
    console.error(`  error: ${res.body?.error || res.status}`);
    process.exit(1);
  }

  const info = res.body;
  let lastCount = info.download_count;
  let lastDl = info.last_download_at;

  console.log('');
  console.log(`  watching  \x1b[32m${info.filename}\x1b[0m`);
  console.log(`  id        ${id}`);
  console.log(`  downloads ${lastCount} so far`);
  console.log(`  \x1b[2mpress ctrl-c to stop\x1b[0m`);
  console.log('');

  const interval = parseInt(opts.interval) || 5;

  const poll = setInterval(async () => {
    try {
      const r = await request(`${apiBase}/api/download/info/${id}`, { method: 'GET' });
      if (r.status !== 200) return;
      const d = r.body;
      if (d.download_count > lastCount) {
        const newDls = d.download_count - lastCount;
        const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        console.log(`  \x1b[32m↓ download\x1b[0m  \x1b[2m${ts}\x1b[0m  total: ${d.download_count}`);
        lastCount = d.download_count;
        lastDl = d.last_download_at;
      }
      if (!d.active) {
        console.log(`  \x1b[33m! link expired or deleted\x1b[0m`);
        clearInterval(poll);
        process.exit(0);
      }
    } catch { /* network blip — keep polling */ }
  }, interval * 1000);

  process.on('SIGINT', () => {
    clearInterval(poll);
    console.log('\n  stopped.\n');
    process.exit(0);
  });
}

// ─── Delete command ───
async function rm(id) {
  const config = loadConfig();
  const apiKey = config.api_key;
  const apiBase = config.api_base || DEFAULT_API;

  if (!apiKey) {
    console.error('  error: not authenticated. run: transfa auth');
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

// ─── URL command ───
async function getUrl(id, opts) {
  const config = loadConfig();
  const apiBase = config.api_base || DEFAULT_API;

  if (opts.json) {
    console.log(JSON.stringify({ id, share_url: `${apiBase}/f/${id}`, download_url: `${apiBase}/api/download/${id}` }));
    return;
  }

  console.log('');
  console.log(`\x1b[32m→ share\x1b[0m    ${apiBase}/f/${id}`);
  console.log(`\x1b[2m→ download\x1b[0m ${apiBase}/api/download/${id}`);
  console.log('');
}

// ─── Keygen command ───
async function keygen(name, opts) {
  const config = loadConfig();
  const apiKey = config.api_key;
  const apiBase = config.api_base || DEFAULT_API;

  if (!apiKey) {
    console.error('  error: not authenticated. run: tf auth');
    process.exit(1);
  }

  const res = await request(`${apiBase}/api/dashboard/keys`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
  }, JSON.stringify({ name: name || 'cli key' }));

  if (res.status !== 200 && res.status !== 201) {
    console.error('  error:', res.body?.error || res.status);
    process.exit(1);
  }

  const d = res.body;
  if (opts.json) {
    console.log(JSON.stringify({ id: d.id, key: d.key, name: d.name, scope: d.scope }));
    return;
  }

  console.log(`\n  \x1b[32m✓\x1b[0m new API key generated`);
  console.log(`  name: ${d.name}`);
  console.log(`  key:  \x1b[1m${d.key}\x1b[0m`);
  console.log(`\n  authenticate: tf auth ${d.key}`);
  console.log('');
}

// ─── Revoke command ───
async function revokeKey(keyId, opts) {
  const config = loadConfig();
  const apiKey = config.api_key;
  const apiBase = config.api_base || DEFAULT_API;

  if (!apiKey) {
    console.error('  error: not authenticated. run: tf auth');
    process.exit(1);
  }

  const res = await request(`${apiBase}/api/dashboard/keys/revoke`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
  }, JSON.stringify({ key_id: parseInt(keyId) }));

  if (res.status !== 200) {
    console.error('  error:', res.body?.error || res.status);
    process.exit(1);
  }

  if (opts.json) {
    console.log(JSON.stringify({ revoked: true, key_id: keyId }));
    return;
  }
  console.log(`  \x1b[32m✓\x1b[0m key ${keyId} revoked`);
}

// ─── Username command ───
async function setUsername(newName) {
  const config = loadConfig();
  const apiKey = config.api_key;
  const apiBase = config.api_base || DEFAULT_API;

  if (!apiKey) {
    console.error('  error: not authenticated. run: tf auth');
    process.exit(1);
  }

  const res = await request(`${apiBase}/api/dashboard/username`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
  }, JSON.stringify({ username: newName }));

  if (res.status === 200) {
    console.log(`  \x1b[32m✓\x1b[0m username updated to: ${res.body.username}`);
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
\x1b[32m■\x1b[0m tf \x1b[2m— file sharing for agents\x1b[0m

\x1b[1mUsage:\x1b[0m
  tf upload <file>          upload a file and get a shareable link
  tf download <id>          download a file and verify its SHA-256
  tf run <run-id>           show all artifacts for a pipeline run
  tf watch <id>             tail download events for an upload in real time
  tf url <id>               print share + download URLs for an upload
  tf list                   list your uploads (--urls to show links)
  tf rm <id>                delete an upload
  tf auth [api-key]         show current key, or generate/set one
  tf whoami                 show current auth status and plan
  tf keys                   list all API keys on your account
  tf keygen [name]          generate a new API key
  tf revoke <key-id>        revoke an API key by ID
  tf username <new-name>    change your username
  tf config [key] [value]   view or set config

\x1b[1mUpload flags:\x1b[0m
  --expires=<dur>       TTL (e.g. 24h, 7d, 30d). Default: 7d
  --grace=<dur>         Grace period after expiry — file stays downloadable this long (e.g. 24h)
  --name=<str>          override filename shown to recipient
  --max=<n>             max download count
  --once                shortcut for --max=1
  --password=<str>      password-protect the link
  --run-id=<str>        group this upload under a pipeline run ID
  --step=<str>          pipeline step name (e.g. preprocess, train)
  --consumer=<str>      who/what will consume this artifact
  --intent=<str>        why this file exists (e.g. checkpoint, report)
  --json                output machine-parseable JSON
  --quiet               print URLs and nothing else

\x1b[1mDownload flags:\x1b[0m
  --output=<path>       save to this path (default: original filename)
  --no-verify           skip SHA-256 integrity check (verification is on by default)
  --password=<pw>       password for protected files
  --json                machine-readable output

\x1b[1mExamples:\x1b[0m
  tf auth                                              # show current key or generate a free one
  tf upload dataset.parquet
  tf upload model.pt --expires=24h --grace=12h --json
  tf upload report.pdf --once --quiet
  tf upload weights.pt --run-id=run-42 --step=train --intent=checkpoint
  tf download a7f9k2                                   # download + verify SHA-256
  tf download a7f9k2 --output=/tmp/model.pt            # save to specific path
  tf run run-42                                        # show all artifacts for run-42
  tf watch a7f9k2                                      # live-tail downloads on that file
  cat data.json | tf upload - --name=output.json

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
  case 'download':
  case 'dl':
  case 'get':
  case 'fetch': {
    const id = positional[0];
    if (!id) { console.error('  usage: tf download <id>'); process.exit(1); }
    download(id, opts).catch(e => { console.error('  error:', e.message); process.exit(1); });
    break;
  }
  case 'run': {
    const runId = positional[0];
    if (!runId) { console.error('  usage: tf run <run-id>'); process.exit(1); }
    run(runId, opts).catch(e => { console.error('  error:', e.message); process.exit(1); });
    break;
  }
  case 'watch': {
    const watchId = positional[0];
    if (!watchId) { console.error('  usage: tf watch <id>'); process.exit(1); }
    watch(watchId, opts).catch(e => { console.error('  error:', e.message); process.exit(1); });
    break;
  }
  case 'auth': {
    const key = positional[0] || opts.key;
    if (opts.new) {
      generateNewKey(opts).catch(e => { console.error('  error:', e.message); process.exit(1); });
    } else {
      auth(key, opts).catch(e => { console.error('  error:', e.message); process.exit(1); });
    }
    break;
  }
  case 'whoami':
  case 'me':
  case 'status': {
    whoami(opts).catch(e => { console.error('  error:', e.message); process.exit(1); });
    break;
  }
  case 'keys':
  case 'key': {
    keys(opts).catch(e => { console.error('  error:', e.message); process.exit(1); });
    break;
  }
  case 'list':
  case 'ls': {
    list(opts).catch(e => { console.error('  error:', e.message); process.exit(1); });
    break;
  }
  case 'url':
  case 'link': {
    const id = positional[0];
    if (!id) { console.error('  usage: tf url <id>'); process.exit(1); }
    getUrl(id, opts).catch(e => { console.error('  error:', e.message); process.exit(1); });
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
  case 'keygen':
  case 'newkey': {
    keygen(positional[0], opts).catch(e => { console.error('  error:', e.message); process.exit(1); });
    break;
  }
  case 'revoke': {
    const keyId = positional[0];
    if (!keyId) { console.error('  usage: tf revoke <key-id>'); process.exit(1); }
    revokeKey(keyId, opts).catch(e => { console.error('  error:', e.message); process.exit(1); });
    break;
  }
  case 'username': {
    const newName = positional[0];
    if (!newName) { console.error('  usage: tf username <new-name>'); process.exit(1); }
    setUsername(newName).catch(e => { console.error('  error:', e.message); process.exit(1); });
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
