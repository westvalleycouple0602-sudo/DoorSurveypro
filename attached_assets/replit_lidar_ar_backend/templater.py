
from __future__ import annotations
import json, csv, io, time
from pathlib import Path
from typing import List, Dict, Any, Optional

OPTIONS_PATH = Path("./storage/options_dropdowns.json")

def load_options() -> Dict[str, Any]:
    if not OPTIONS_PATH.exists():
        return {"door": {}, "frame": {}}
    return json.loads(OPTIONS_PATH.read_text(encoding="utf-8"))

def default_codes(applies_to: str, market: str) -> List[str]:
    opts = load_options().get(applies_to, {}).get(market, {})
    codes: List[str] = []
    for group, names in opts.items():
        for name, items in names.items():
            for it in items:
                if it.get("default"):
                    code = it.get("code")
                    if code and code not in codes:
                        codes.append(code)
    return codes

def openings_to_csv(openings: List[Dict[str, Any]], partner_id: Optional[str]=None) -> str:
    out = io.StringIO()
    wr = csv.DictWriter(out, fieldnames=["opening_id","qty","codes"])
    wr.writeheader()
    for op in openings:
        codes = op.get("codes") or []
        wr.writerow({
            "opening_id": op.get("opening_id",""),
            "qty": op.get("qty", 1),
            "codes": ";".join(codes)
        })
    return out.getvalue()

def make_template(applies_to: str, market: str, count: int=5) -> str:
    codes = default_codes(applies_to, market)
    openings = [{"opening_id": f"SAMPLE-{i+1}", "qty": 1, "codes": codes} for i in range(max(count,1))]
    return openings_to_csv(openings)

def save_template_csv(applies_to: str, market: str, out_dir: str="./storage/downloads") -> str:
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    csv_txt = make_template(applies_to, market)
    ts = time.strftime("%Y%m%dT%H%M%SZ")
    name = f"template_{applies_to}_{market}_{ts}.csv"
    (Path(out_dir)/name).write_text(csv_txt, encoding="utf-8")
    return name
