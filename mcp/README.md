# transfa-mcp

MCP server for [transfa](https://transfa.sh) — upload any file and get a shareable, expiring link in one tool call.

## Install

```bash
npx -y transfa-mcp
```

## Claude Desktop config

```json
{
  "mcpServers": {
    "transfa": {
      "command": "npx",
      "args": ["-y", "transfa-mcp"],
      "env": {
        "TRANSFA_API_KEY": "your-api-key"
      }
    }
  }
}
```

Get a free API key: `npx transfa auth` — or leave it out for guest mode (10 MB / 24h limit).

## Tools

### `upload`

Upload a file from the local filesystem. Returns an `agent_link` (direct download URL), a `human_link` (browser share page), and `sha256` for integrity verification.

```json
{
  "path": "/tmp/report.pdf",
  "expires": "24h",
  "password": "optional",
  "once": false,
  "max_downloads": 10,
  "grace": "2h"
}
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `path` | string | yes | Path to the file to upload |
| `expires` | string | no | TTL: `1h`, `24h`, `7d`, `30d` (default: `7d`) |
| `name` | string | no | Override filename shown to recipient |
| `password` | string | no | Password-protect the link |
| `once` | boolean | no | Delete after first download |
| `max_downloads` | number | no | Max download count |
| `grace` | string | no | Keep file downloadable this long after TTL ends (e.g. `2h`) |

### `file_info`

Get metadata about an upload without downloading it. Returns filename, size, SHA-256, expiry, download count, and active status.

```json
{ "id": "xK9mRp" }
```

### `list_uploads`

List recent uploads. Requires `TRANSFA_API_KEY`.

```json
{ "limit": 10 }
```

### `delete_upload`

Delete an upload immediately.

```json
{ "id": "xK9mRp" }
```

## Environment variables

| Variable | Description |
|---|---|
| `TRANSFA_API_KEY` | API key for authenticated uploads. Free at [transfa.sh](https://transfa.sh). Optional — guest mode works without one. |
| `TRANSFA_BASE_URL` | Custom instance URL for self-hosted deployments. Default: `https://transfa.sh` |

## Self-hosting

transfa is fully self-hostable. Point `TRANSFA_BASE_URL` at your instance:

```json
{
  "mcpServers": {
    "transfa": {
      "command": "npx",
      "args": ["-y", "transfa-mcp"],
      "env": {
        "TRANSFA_BASE_URL": "https://files.yourcompany.com",
        "TRANSFA_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Links

- Homepage: [transfa.sh](https://transfa.sh)
- CLI: [npm install -g transfa](https://www.npmjs.com/package/transfa)
- Source: [github.com/colapsis/transfa](https://github.com/colapsis/transfa)
- License: MIT
