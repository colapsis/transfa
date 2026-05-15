"""transfa — ephemeral file transfer for AI agents and developers."""
from __future__ import annotations

import os
from pathlib import Path
from typing import List, Optional, Union

from ._client import Client, TransfaError
from ._async_client import AsyncClient
from ._models import Artifact, FileInfo, RunManifest, UploadResult

__version__ = "0.1.0"
__all__ = [
    "Client",
    "AsyncClient",
    "TransfaError",
    "UploadResult",
    "FileInfo",
    "RunManifest",
    "Artifact",
    "upload",
    "download",
    "file_info",
    "list_uploads",
    "delete",
    "run_artifacts",
    "extend",
]

_default: Optional[Client] = None


def _get() -> Client:
    global _default
    if _default is None:
        _default = Client()
    return _default


def upload(path: Union[str, os.PathLike], **kwargs) -> UploadResult:
    """Upload a file. Returns UploadResult with url, sha256, and provenance fields."""
    return _get().upload(path, **kwargs)


def download(
    id_or_url: str,
    output: Optional[Union[str, os.PathLike]] = None,
    **kwargs,
) -> Path:
    """Download a file. SHA-256 verified by default. Returns destination Path."""
    return _get().download(id_or_url, output, **kwargs)


def file_info(id_or_url: str) -> FileInfo:
    """Get metadata for an upload without downloading it."""
    return _get().file_info(id_or_url)


def list_uploads(limit: int = 10) -> List[UploadResult]:
    """List recent uploads. Requires TRANSFA_API_KEY."""
    return _get().list_uploads(limit)


def delete(id_or_url: str, *, force: bool = False) -> bool:
    """Delete an upload. Pass force=True to delete artifact-flagged files."""
    return _get().delete(id_or_url, force=force)


def run_artifacts(run_id: str) -> RunManifest:
    """Get the provenance manifest for a pipeline run."""
    return _get().run_artifacts(run_id)


def extend(id_or_url: str, ttl: str) -> FileInfo:
    """Extend an upload's expiry. Requires TRANSFA_API_KEY."""
    return _get().extend(id_or_url, ttl)
