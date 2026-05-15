from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

_CONFIG_FILE = Path.home() / ".transfa" / "config.json"


def load_api_key() -> Optional[str]:
    if key := os.environ.get("TRANSFA_API_KEY"):
        return key
    try:
        return json.loads(_CONFIG_FILE.read_text()).get("api_key")
    except Exception:
        return None
