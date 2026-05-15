# Python SDK Design — transfa

**Date:** 2026-05-15  
**Status:** Approved

## Goal

A first-class Python package (`pip install transfa`) that wraps the transfa REST API with sync and async clients, typed return values, and zero friction for ML/data science workflows.

## Package

- **PyPI name:** `transfa`
- **Python:** 3.8+
- **Dependency:** `httpx>=0.24.0` (handles both sync/async, streaming, redirects)

## API surface

```python
# Module-level convenience (sync)
import transfa
result = transfa.upload("model.pt", ttl="24h", run_id="run-42", artifact=True)
transfa.download("xK9mRp", output="model.pt")
info = transfa.file_info("xK9mRp")
transfa.delete("xK9mRp")
manifest = transfa.run_artifacts("run-42")

# Explicit sync client
client = transfa.Client(api_key="...", base_url="https://files.myco.com")

# Async client
async with transfa.AsyncClient() as client:
    result = await client.upload("model.pt")
```

## Structure

```
python/
  transfa/
    __init__.py       # module-level convenience functions + lazy default client
    _client.py        # Client (sync, httpx.Client)
    _async_client.py  # AsyncClient (async, httpx.AsyncClient)
    _models.py        # UploadResult, FileInfo, Artifact, RunManifest dataclasses
    _config.py        # load TRANSFA_API_KEY env or ~/.transfa/config.json
    py.typed          # PEP 561
  pyproject.toml
  README.md
```

## Return types

- `upload` → `UploadResult` (id, url, agent_link, sha256, expires_at, provenance fields)
- `file_info` → `FileInfo` (full metadata including provenance, artifact flag)
- `run_artifacts` → `RunManifest` (run_id, total, list of Artifact)
- `download` → `Path` (destination path, SHA-256 verified by default)
- `list_uploads` → `List[UploadResult]`

## Error handling

Single `TransfaError(message, status_code)` for all API errors. `FileNotFoundError` for missing local files.

## Config

Reads `TRANSFA_API_KEY` env var first, then `~/.transfa/config.json` (same file as CLI). Guest mode if neither is set.
