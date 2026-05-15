# transfa

Python SDK for [transfa](https://transfa.sh) — ephemeral file transfer for AI agents and developers.

Upload a file, get a shareable link that expires. Works in sync and async contexts. SHA-256 verified. Full provenance support for multi-agent pipelines.

## Install

```bash
pip install transfa
```

## Quick start

```python
import transfa

# Upload — no account needed (guest mode)
result = transfa.upload("model.pt")
print(result.url)       # https://transfa.sh/f/xK9mRp  (share page)
print(result.agent_link) # https://transfa.sh/api/download/xK9mRp  (direct)
print(result.sha256)    # a3f8c2...d91b

# Download (SHA-256 verified by default)
path = transfa.download("xK9mRp")
path = transfa.download("xK9mRp", output="/tmp/model.pt")

# File metadata
info = transfa.file_info("xK9mRp")
print(info.expires_at, info.download_count)

# Delete
transfa.delete("xK9mRp")
```

## Authentication

Set your API key (free at [transfa.sh](https://transfa.sh)):

```bash
export TRANSFA_API_KEY=your_key_here
```

Or it's read from `~/.transfa/config.json` automatically if you've used the CLI (`tf auth`).

Without an API key, guest mode applies: 10 MB / 24h TTL.

## All upload options

```python
result = transfa.upload(
    "output.csv",
    ttl="24h",           # "1h", "24h", "7d", "30d"
    password="secret",   # password-protect the link
    once=True,           # delete after first download
    max_downloads=5,
    grace="2h",          # stay downloadable 2h after TTL ends
    # provenance
    run_id="run-42",
    step="evaluate",
    consumer="reporting-agent",
    intent="results",
    artifact=True,       # immutable — blocks deletion
    upstream_ids=["abc123", "def456"],  # files that produced this one
)
```

## Provenance & multi-agent handoff

Tag uploads with pipeline context. The receiving agent can inspect provenance via `file_info` or get the full run manifest:

```python
# Agent A produces a file
result = transfa.upload(
    "features.parquet",
    run_id="pipeline-99",
    step="featurize",
    intent="training-input",
    artifact=True,
)

# Agent B checks provenance before consuming
info = transfa.file_info(result.id)
print(info.run_id, info.step, info.artifact)  # pipeline-99  featurize  True

# Get everything produced in a run
manifest = transfa.run_artifacts("pipeline-99")
for a in manifest.artifacts:
    print(a.step, a.filename, a.sha256)
```

## Async

```python
import asyncio
import transfa

async def main():
    async with transfa.AsyncClient() as client:
        result = await client.upload("model.pt", run_id="run-42", artifact=True)
        print(result.url)

        path = await client.download(result.id)
        manifest = await client.run_artifacts("run-42")

asyncio.run(main())
```

## Custom instance (self-hosted)

```python
client = transfa.Client(
    api_key="your_key",
    base_url="https://files.yourcompany.com",
)
```

## All methods

| Method | Description |
|---|---|
| `upload(path, **kwargs)` | Upload a file, get `UploadResult` |
| `download(id, output, *, verify, password)` | Download, SHA-256 verify, return `Path` |
| `file_info(id)` | Metadata without downloading, returns `FileInfo` |
| `list_uploads(limit)` | Recent uploads, returns `List[UploadResult]` |
| `delete(id, *, force)` | Delete (force=True for artifact-flagged files) |
| `run_artifacts(run_id)` | Full run manifest, returns `RunManifest` |
| `extend(id, ttl)` | Extend expiry, returns updated `FileInfo` |

All methods available on both `Client` (sync) and `AsyncClient` (async).

## Return types

```python
@dataclass
class UploadResult:
    id: str
    url: str           # browser share page
    agent_link: str    # direct download URL
    filename: str
    bytes: int
    sha256: str
    expires_at: datetime
    run_id: Optional[str]
    step: Optional[str]
    consumer: Optional[str]
    intent: Optional[str]
    artifact: bool
    upstream_ids: List[str]

@dataclass
class FileInfo:
    id: str; filename: str; bytes: int; sha256: str
    mime_type: str; download_count: int; max_downloads: Optional[int]
    has_password: bool; expires_at: datetime; created_at: datetime
    expired: bool; active: bool; artifact: bool
    run_id: Optional[str]; step: Optional[str]
    consumer: Optional[str]; intent: Optional[str]
    upstream_ids: List[str]
```

## Links

- Homepage: [transfa.sh](https://transfa.sh)
- CLI: `npm install -g transfa`
- MCP server: `npx -y transfa-mcp`
- GitHub Actions: `colapsis/transfa-action@v1`
- Source: [github.com/colapsis/transfa](https://github.com/colapsis/transfa)
- License: MIT
