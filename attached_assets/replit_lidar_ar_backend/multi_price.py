
from __future__ import annotations
import json, hashlib
from typing import List, Dict, Any
import requests

try:
    import cache
except Exception:
    cache = None  # type: ignore

def _key(partner_id: str, lines: list) -> str:
    raw = json.dumps({"partner_id":partner_id,"lines":lines}, sort_keys=True).encode("utf-8")
    return "price:" + hashlib.sha256(raw).hexdigest()

def price_for_partner(base_url: str, partner_id: str, lines: List[Dict[str, Any]], use_cache: bool=True, ttl: int=1800) -> Dict[str, Any]:
    if cache and use_cache:
        k = _key(partner_id, lines)
        v = cache.get(k)
        if v is not None:
            return {"partner_id": partner_id, "cached": True, "result": v}
    r = requests.post(f"{base_url}/api/partners/price", json={"partner_id": partner_id, "lines": lines}, timeout=15)
    data = r.json() if "application/json" in (r.headers.get("content-type","")) else {"status": r.status_code, "text": r.text}
    if cache and use_cache:
        cache.set(_key(partner_id, lines), data, ttl=ttl)
    return {"partner_id": partner_id, "cached": False, "result": data}

def convert_internal(base_url: str, partner_id: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
    r = requests.post(f"{base_url}/api/partners/convert", json={"partner_id": partner_id, "items": items}, timeout=15)
    return r.json()

def compare_partners(base_url: str, partner_ids: List[str], items: List[Dict[str, Any]], use_cache: bool=True) -> Dict[str, Any]:
    table = []
    for pid in partner_ids:
        conv = convert_internal(base_url, pid, items)
        lines = conv.get("lines") or []
        priced = price_for_partner(base_url, pid, lines, use_cache=use_cache)
        total = priced.get("result", {}).get("total")
        currency = priced.get("result", {}).get("currency")
        table.append({"partner_id": pid, "total": total, "currency": currency, "unmapped": conv.get("unmapped_codes")})
    table = sorted(table, key=lambda x: (x["total"] is None, x["total"]))
    return {"partners": table}
