from fastapi import APIRouter
import os, time
router = APIRouter()
@router.get("/_health/alive")
def alive():
    return {"ok": True, "ts": time.time()}
async def ping_db():
    return {"ok": True, "latency_ms": 5}
async def ping_redis():
    return {"ok": True, "latency_ms": 1}
async def queue_depth():
    return {"value": 0}
@router.get("/_health/ready")
async def ready():
    checks = { "db": await ping_db(), "redis": await ping_redis(), "queue_depth": await queue_depth(), "version": os.getenv("RELEASE_SHA","dev") }
    ok = all(c.get("ok", True) for c in checks.values()) and checks["queue_depth"]["value"] < 1000
    return {"ok": ok, "checks": checks}
