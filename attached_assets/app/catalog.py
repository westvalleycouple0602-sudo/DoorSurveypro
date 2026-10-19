from fastapi import APIRouter, HTTPException
import json, os
router = APIRouter()
CATALOG_PATH = os.getenv("CATALOG_PATH", os.path.join(os.path.dirname(__file__), "data", "doors_frames_catalog.json"))
_catalog = None
def load_catalog():
    global _catalog
    try:
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            _catalog = json.load(f)
    except Exception as e:
        raise RuntimeError(f"Failed to load catalog: {e}")
@router.get("/catalog")
def get_catalog():
    global _catalog
    if _catalog is None:
        load_catalog()
    return _catalog
@router.post("/catalog/reload")
def reload_catalog():
    load_catalog()
    return {"ok": True}
