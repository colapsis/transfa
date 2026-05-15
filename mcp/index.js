#!/usr/bin/env node
'use strict';

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');
const crypto = require('crypto');

const BASE_URL = (process.env.TRANSFA_BASE_URL || 'https://transfa.sh').replace(/\/$/, '');
const CONFIG_FILE = path.join(os.homedir(), '.transfa', 'config.json');

function loadApiKey() {
  if (process.env.TRANSFA_API_KEY) return process.env.TRANSFA_API_KEY;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')).api_key || null;
  } catch {
    return null;
  }
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

function httpRequest(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(url, options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) });
        } catch {
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function uploadFile({ filePath, apiKey, expires, name, password, once, maxDownloads, grace, runId, step, consumer, intent, artifact, upstreamIds }) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) return reject(new Error(`file not found: ${filePath}`));

    const fileBuffer = fs.readFileSync(filePath);
    const filename = name || path.basename(filePath);
    const boundary = 'MCPTransfa' + crypto.randomBytes(12).toString('hex');

    const textFields = [];
    if (expires)      textFields.push(['ttl', expires]);
    if (name)         textFields.push(['filename', name]);
    if (password)     textFields.push(['password', password]);
    if (grace)        textFields.push(['grace', grace]);
    if (once)         textFields.push(['max_downloads', '1']);
    else if (maxDownloads) textFields.push(['max_downloads', String(maxDownloads)]);
    if (runId)        textFields.push(['run_id', runId]);
    if (step)         textFields.push(['step', step]);
    if (consumer)     textFields.push(['consumer', consumer]);
    if (intent)       textFields.push(['intent', intent]);
    if (artifact)     textFields.push(['artifact', 'true']);
    if (upstreamIds?.length) textFields.push(['upstream_ids', JSON.stringify(upstreamIds)]);

    // Build multipart body: file part first, then text fields
    const fileHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`
    );
    const textParts = Buffer.from(
      textFields.map(([k, v]) =>
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}`
      ).join('') + `\r\n--${boundary}--\r\n`
    );

    const body = Buffer.concat([fileHeader, fileBuffer, textParts]);

    const url = new URL(`${BASE_URL}/api/upload`);
    const lib = url.protocol === 'https:' ? https : http;
    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    };
    if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;

    const req = lib.request(url, { method: 'POST', headers }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString());
          if (res.statusCode === 200 || res.statusCode === 201) resolve(data);
          else reject(new Error(data.error || `upload failed (${res.statusCode})`));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'upload',
    description:
      'Upload a file from the local filesystem and get a shareable, expiring link. ' +
      'Returns agent_link (direct download URL), human_link (browser share page), and sha256 for integrity. ' +
      'Supports provenance fields (run_id, step, consumer, intent) for multi-agent handoff — ' +
      'these travel with the file and are returned by file_info, so the receiving agent knows who produced it and why. ' +
      'Works without an API key (guest mode, 10 MB limit). Set TRANSFA_API_KEY for larger files and longer TTLs.',
    inputSchema: {
      type: 'object',
      properties: {
        path:          { type: 'string',  description: 'Path to the file to upload' },
        expires:       { type: 'string',  description: 'TTL: "1h", "24h", "7d", "30d". Default: 7d' },
        name:          { type: 'string',  description: 'Override filename shown to recipient' },
        password:      { type: 'string',  description: 'Password-protect the link' },
        once:          { type: 'boolean', description: 'Delete after first download' },
        max_downloads: { type: 'number',  description: 'Max download count' },
        grace:         { type: 'string',  description: 'Grace period after expiry, e.g. "12h" — keeps file downloadable this long after TTL ends' },
        run_id:        { type: 'string',  description: 'Pipeline or agent session ID — groups related artifacts together (retrieve all with run_artifacts)' },
        step:          { type: 'string',  description: 'Step name within the run, e.g. "preprocess", "train", "evaluate"' },
        consumer:      { type: 'string',  description: 'Who or what will consume this file, e.g. an agent name or service' },
        intent:        { type: 'string',  description: 'Why this file exists, e.g. "checkpoint", "report", "dataset-slice"' },
        artifact:      { type: 'boolean', description: 'Mark as immutable artifact — blocks deletion without explicit force. Use for final outputs that must not be removed.' },
        upstream_ids:  { type: 'array', items: { type: 'string' }, description: 'Transfa IDs of files that were consumed to produce this one — records the data lineage' },
      },
      required: ['path'],
    },
  },
  {
    name: 'file_info',
    description:
      'Get metadata about an upload without downloading it. ' +
      'Returns filename, size, SHA-256, expiry, download count, active status, and whether the file is in a grace period.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Upload ID (the short code in the URL, e.g. "a7f9k2")' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_uploads',
    description:
      'List your recent uploads. Requires TRANSFA_API_KEY or a key saved by `tf auth`.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of results (1–100, default 10)' },
      },
    },
  },
  {
    name: 'delete_upload',
    description: 'Delete an upload immediately. Requires ownership (API key must match the uploader).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Upload ID to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'run_artifacts',
    description:
      'List all files uploaded under a run_id — the provenance manifest for a pipeline run or agent session. ' +
      'Returns every artifact with its id, filename, sha256, step, consumer, intent, and expiry.',
    inputSchema: {
      type: 'object',
      properties: {
        run_id: { type: 'string', description: 'The run_id used when uploading the artifacts' },
      },
      required: ['run_id'],
    },
  },
];

// ─── Tool handlers ────────────────────────────────────────────────────────────

async function handleTool(name, args) {
  const apiKey = loadApiKey();

  if (name === 'upload') {
    const filePath = path.resolve(args.path);
    try {
      const data = await uploadFile({
        filePath,
        apiKey,
        expires:      args.expires,
        name:         args.name,
        password:     args.password,
        once:         args.once,
        maxDownloads: args.max_downloads,
        grace:        args.grace,
        runId:        args.run_id,
        step:         args.step,
        consumer:     args.consumer,
        intent:       args.intent,
        artifact:     args.artifact,
        upstreamIds:  args.upstream_ids,
      });
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            id:          data.id,
            agent_link:  data.download_url,
            human_link:  data.url,
            filename:    data.filename,
            bytes:       data.bytes,
            sha256:      data.sha256,
            expires_at:  data.expires_at,
            ...(data.run_id        && { run_id:        data.run_id }),
            ...(data.step          && { step:          data.step }),
            ...(data.consumer      && { consumer:      data.consumer }),
            ...(data.intent        && { intent:        data.intent }),
            ...(data.artifact      && { artifact:      true }),
            ...(data.upstream_ids?.length && { upstream_ids: data.upstream_ids }),
            ...(data.grace_seconds && { grace_seconds: data.grace_seconds }),
          }, null, 2),
        }],
      };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }

  if (name === 'file_info') {
    try {
      const res = await httpRequest(`${BASE_URL}/api/download/info/${args.id}`);
      if (res.status === 404) return { content: [{ type: 'text', text: 'Error: upload not found or expired' }], isError: true };
      return { content: [{ type: 'text', text: JSON.stringify(res.body, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }

  if (name === 'list_uploads') {
    if (!apiKey) return {
      content: [{ type: 'text', text: 'Error: API key required. Set TRANSFA_API_KEY env var or run `tf auth` to save a key.' }],
      isError: true,
    };
    try {
      const limit = Math.min(args.limit || 10, 100);
      const res = await httpRequest(`${BASE_URL}/api/upload?limit=${limit}`, {
        headers: { Authorization: 'Bearer ' + apiKey },
      });
      if (res.status !== 200) return { content: [{ type: 'text', text: `Error: ${res.body?.error || res.status}` }], isError: true };
      return { content: [{ type: 'text', text: JSON.stringify(res.body.uploads, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }

  if (name === 'delete_upload') {
    if (!apiKey) return { content: [{ type: 'text', text: 'Error: API key required.' }], isError: true };
    try {
      const res = await httpRequest(`${BASE_URL}/api/upload/${args.id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + apiKey },
      });
      if (res.status !== 200) return { content: [{ type: 'text', text: `Error: ${res.body?.error || res.status}` }], isError: true };
      return { content: [{ type: 'text', text: `Deleted ${args.id}` }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }

  if (name === 'run_artifacts') {
    try {
      const res = await httpRequest(`${BASE_URL}/api/run/${encodeURIComponent(args.run_id)}`);
      if (res.status === 404) return { content: [{ type: 'text', text: `No artifacts found for run_id: ${args.run_id}` }], isError: true };
      if (res.status !== 200) return { content: [{ type: 'text', text: `Error: ${res.body?.error || res.status}` }], isError: true };
      return { content: [{ type: 'text', text: JSON.stringify(res.body, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
  }

  return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
}

// ─── Server ───────────────────────────────────────────────────────────────────

async function main() {
  const server = new Server(
    { name: 'transfa', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (req) =>
    handleTool(req.params.name, req.params.arguments || {})
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
