from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


def _dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


@dataclass
class UploadResult:
    id: str
    url: str
    agent_link: str
    filename: str
    bytes: int
    sha256: str
    expires_at: datetime
    run_id: Optional[str] = None
    step: Optional[str] = None
    consumer: Optional[str] = None
    intent: Optional[str] = None
    artifact: bool = False
    upstream_ids: List[str] = field(default_factory=list)
    grace_seconds: Optional[int] = None

    @classmethod
    def _from_dict(cls, d: dict) -> UploadResult:
        return cls(
            id=d["id"],
            url=d.get("url", ""),
            agent_link=d.get("download_url", ""),
            filename=d.get("filename", d.get("original_filename", "")),
            bytes=d.get("bytes", d.get("size", 0)),
            sha256=d.get("sha256", ""),
            expires_at=_dt(d.get("expires_at")),
            run_id=d.get("run_id"),
            step=d.get("step"),
            consumer=d.get("consumer"),
            intent=d.get("intent"),
            artifact=d.get("artifact", False),
            upstream_ids=d.get("upstream_ids") or [],
            grace_seconds=d.get("grace_seconds"),
        )


@dataclass
class FileInfo:
    id: str
    filename: str
    bytes: int
    sha256: str
    mime_type: str
    download_count: int
    max_downloads: Optional[int]
    has_password: bool
    expires_at: datetime
    created_at: datetime
    expired: bool
    active: bool
    artifact: bool = False
    run_id: Optional[str] = None
    step: Optional[str] = None
    consumer: Optional[str] = None
    intent: Optional[str] = None
    upstream_ids: List[str] = field(default_factory=list)

    @classmethod
    def _from_dict(cls, d: dict) -> FileInfo:
        return cls(
            id=d["id"],
            filename=d.get("filename", ""),
            bytes=d.get("bytes", d.get("size", 0)),
            sha256=d.get("sha256", ""),
            mime_type=d.get("mime_type", "application/octet-stream"),
            download_count=d.get("download_count", 0),
            max_downloads=d.get("max_downloads"),
            has_password=d.get("has_password", False),
            expires_at=_dt(d.get("expires_at")),
            created_at=_dt(d.get("created_at")),
            expired=d.get("expired", False),
            active=d.get("active", True),
            artifact=d.get("artifact", False),
            run_id=d.get("run_id"),
            step=d.get("step"),
            consumer=d.get("consumer"),
            intent=d.get("intent"),
            upstream_ids=d.get("upstream_ids") or [],
        )


@dataclass
class Artifact:
    id: str
    url: str
    agent_link: str
    filename: str
    bytes: int
    sha256: str
    mime_type: str
    expires_at: datetime
    created_at: datetime
    active: bool
    artifact: bool = False
    step: Optional[str] = None
    consumer: Optional[str] = None
    intent: Optional[str] = None
    upstream_ids: List[str] = field(default_factory=list)

    @classmethod
    def _from_dict(cls, d: dict) -> Artifact:
        return cls(
            id=d["id"],
            url=d.get("url", ""),
            agent_link=d.get("download_url", ""),
            filename=d.get("filename", ""),
            bytes=d.get("bytes", d.get("size", 0)),
            sha256=d.get("sha256", ""),
            mime_type=d.get("mime_type", "application/octet-stream"),
            expires_at=_dt(d.get("expires_at")),
            created_at=_dt(d.get("created_at")),
            active=d.get("active", True),
            artifact=d.get("artifact", False),
            step=d.get("step"),
            consumer=d.get("consumer"),
            intent=d.get("intent"),
            upstream_ids=d.get("upstream_ids") or [],
        )


@dataclass
class RunManifest:
    run_id: str
    total: int
    created_at: datetime
    artifacts: List[Artifact]

    @classmethod
    def _from_dict(cls, d: dict) -> RunManifest:
        return cls(
            run_id=d["run_id"],
            total=d.get("total", 0),
            created_at=_dt(d.get("created_at")),
            artifacts=[Artifact._from_dict(a) for a in d.get("artifacts", [])],
        )
