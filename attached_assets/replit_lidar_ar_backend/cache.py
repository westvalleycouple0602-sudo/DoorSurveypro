
from __future__ import annotations
import json, time
from pathlib import Path
from typing import Any, Optional

CACHE_FILE = Path("./storage/cache.json")
DEFAULT_TTL = 3600

def _load() -> dict:
    if not CACHE_FILE.exists():
        return {}
    try:
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}

def _save(obj: dict) -> None:
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(json.dumps(obj, indent=2), encoding="utf-8")

def set(key: str, value: Any, ttl: int=DEFAULT_TTL) -> None:
    data = _load()
    data[key] = {"value": value, "exp": time.time() + ttl}
    _save(data)

def get(key: str) -> Optional[Any]:
    data = _load()
    item = data.get(key)
    if not item:
        return None
    if item.get("exp", 0) < time.time():
        data.pop(key, None)
        _save(data)
        return None
    return item.get("value")

def clear(prefix: str="") -> int:
    data = _load()
    keys = list(data.keys())
    removed = 0
    for k in keys:
        if not prefix or k.startswith(prefix):
            removed += 1
            data.pop(k, None)
    _save(data)
    return removed
