import os, time
from typing import Dict
import httpx
_cache: Dict[str, tuple[float, bool]] = {}
TTL = 15
BACKEND = os.getenv("FEATURE_FLAGS_BACKEND", "env")
POSTHOG_HOST = os.getenv("POSTHOG_HOST")
POSTHOG_KEY = os.getenv("POSTHOG_PROJECT_API_KEY")
async def get_flag(key: str, default: bool = True) -> bool:
    now = time.time()
    if key in _cache and now - _cache[key][0] < TTL:
        return _cache[key][1]
    val = default
    if BACKEND == "env":
        val = os.getenv(f"FLAG_{key.upper()}", str(default)).lower() in {"1","true","yes"}
    elif BACKEND == "posthog" and POSTHOG_HOST and POSTHOG_KEY:
        try:
            async with httpx.AsyncClient(timeout=3) as c:
                r = await c.post(f"{POSTHOG_HOST}/decide/?v=3", json={"token": POSTHOG_KEY})
                if r.status_code == 200:
                    val = default
        except Exception:
            val = default
    _cache[key] = (now, val)
    return val
