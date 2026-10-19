from fastapi import APIRouter, Request
from .posthog_client import capture
router = APIRouter()
@router.post("/rum")
async def rum(req: Request):
    data = await req.json()
    name = data.get("name"); value = data.get("value"); user = data.get("userId", "anon")
    capture(user, f"web_vital_{name}", value=value, variant=data.get("variant"))
    return {"ok": True}
@router.post("/event")
async def event(req: Request):
    data = await req.json()
    capture(data.get("userId","anon"), data.get("event","custom_event"), **{k:v for k,v in data.items() if k not in {"userId","event"}})
    return {"ok": True}
