from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Union

import httpx

from ._config import load_api_key
from ._models import FileInfo, RunManifest, UploadResult

DEFAULT_BASE_URL = "https://transfa.sh"


class TransfaError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class Client:
    """Synchronous transfa client."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 300.0,
    ) -> None:
        self._api_key = api_key or load_api_key()
        self._base_url = base_url.rstrip("/")
        self._http = httpx.Client(
            base_url=self._base_url,
            timeout=timeout,
            follow_redirects=True,
        )

    # ── internals ────────────────────────────────────────────────────────────

    def _auth(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self._api_key}"} if self._api_key else {}

    def _check(self, response: httpx.Response) -> None:
        if response.status_code >= 400:
            try:
                msg = response.json().get("error", response.text)
            except Exception:
                msg = response.text
            raise TransfaError(msg, response.status_code)

    @staticmethod
    def _id(id_or_url: str) -> str:
        return id_or_url.rstrip("/").split("/")[-1] if "/" in id_or_url else id_or_url

    # ── public API ────────────────────────────────────────────────────────────

    def upload(
        self,
        path: Union[str, os.PathLike],
        *,
        ttl: Optional[str] = None,
        name: Optional[str] = None,
        password: Optional[str] = None,
        once: bool = False,
        max_downloads: Optional[int] = None,
        grace: Optional[str] = None,
        run_id: Optional[str] = None,
        step: Optional[str] = None,
        consumer: Optional[str] = None,
        intent: Optional[str] = None,
        artifact: bool = False,
        upstream_ids: Optional[List[str]] = None,
    ) -> UploadResult:
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(f"File not found: {path}")

        data: Dict[str, str] = {}
        if ttl:             data["ttl"] = ttl
        if name:            data["filename"] = name
        if password:        data["password"] = password
        if once:            data["max_downloads"] = "1"
        elif max_downloads: data["max_downloads"] = str(max_downloads)
        if grace:           data["grace"] = grace
        if run_id:          data["run_id"] = run_id
        if step:            data["step"] = step
        if consumer:        data["consumer"] = consumer
        if intent:          data["intent"] = intent
        if artifact:        data["artifact"] = "true"
        if upstream_ids:    data["upstream_ids"] = json.dumps(upstream_ids)

        with open(p, "rb") as f:
            response = self._http.post(
                "/api/upload",
                files={"file": (name or p.name, f, "application/octet-stream")},
                data=data,
                headers=self._auth(),
            )
        self._check(response)
        return UploadResult._from_dict(response.json())

    def download(
        self,
        id_or_url: str,
        output: Optional[Union[str, os.PathLike]] = None,
        *,
        password: Optional[str] = None,
        verify: bool = True,
    ) -> Path:
        file_id = self._id(id_or_url)
        info = self.file_info(file_id)
        dest = Path(output) if output else Path(info.filename)

        params = {"password": password} if password else {}
        sha = hashlib.sha256()

        with self._http.stream("GET", f"/api/download/{file_id}", params=params) as r:
            self._check(r)
            with open(dest, "wb") as f:
                for chunk in r.iter_bytes(chunk_size=65536):
                    f.write(chunk)
                    if verify:
                        sha.update(chunk)

        if verify and sha.hexdigest() != info.sha256:
            dest.unlink(missing_ok=True)
            raise TransfaError(
                f"SHA-256 mismatch: expected {info.sha256}, got {sha.hexdigest()}"
            )
        return dest

    def file_info(self, id_or_url: str) -> FileInfo:
        response = self._http.get(f"/api/download/info/{self._id(id_or_url)}")
        self._check(response)
        return FileInfo._from_dict(response.json())

    def list_uploads(self, limit: int = 10) -> List[UploadResult]:
        if not self._api_key:
            raise TransfaError("API key required for list_uploads")
        response = self._http.get(
            "/api/upload",
            params={"limit": min(limit, 100)},
            headers=self._auth(),
        )
        self._check(response)
        return [UploadResult._from_dict(u) for u in response.json().get("uploads", [])]

    def delete(self, id_or_url: str, *, force: bool = False) -> bool:
        if not self._api_key:
            raise TransfaError("API key required for delete")
        params = {"force": "true"} if force else {}
        response = self._http.delete(
            f"/api/upload/{self._id(id_or_url)}",
            params=params,
            headers=self._auth(),
        )
        self._check(response)
        return True

    def run_artifacts(self, run_id: str) -> RunManifest:
        response = self._http.get(f"/api/run/{run_id}")
        self._check(response)
        return RunManifest._from_dict(response.json())

    def extend(self, id_or_url: str, ttl: str) -> FileInfo:
        if not self._api_key:
            raise TransfaError("API key required for extend")
        response = self._http.patch(
            f"/api/upload/{self._id(id_or_url)}/extend",
            json={"ttl": ttl},
            headers=self._auth(),
        )
        self._check(response)
        return self.file_info(self._id(id_or_url))

    # ── context manager ───────────────────────────────────────────────────────

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> Client:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
