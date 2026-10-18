
import os
import uuid
import time
import json
from pathlib import Path
from typing import Dict, Any

from flask import Flask, request, jsonify, send_from_directory

# Optional heavy deps: attempt import only when needed
def try_import_open3d():
    try:
        import open3d as o3d  # type: ignore
        return o3d
    except Exception:
        return None

def try_import_trimesh():
    try:
        import trimesh  # type: ignore
        return trimesh
    except Exception:
        return None

app = Flask(__name__)

STORAGE = Path(os.environ.get("STORAGE_DIR", "./storage"))
STORAGE.mkdir(parents=True, exist_ok=True)
RESULTS = STORAGE / "results.json"
if not RESULTS.exists():
    RESULTS.write_text("{}", encoding="utf-8")

def load_results() -> Dict[str, Any]:
    try:
        return json.loads(RESULTS.read_text(encoding="utf-8"))
    except Exception:
        return {}

def save_results(data: Dict[str, Any]) -> None:
    RESULTS.write_text(json.dumps(data, indent=2), encoding="utf-8")

@app.get("/health")
def health():
    return {"ok": True, "time": int(time.time())}

@app.post("/uploadScan")
def upload_scan():
    scan_type = request.headers.get("X-Scan-Type", "").lower()
    scan_id = f"{int(time.time())}-{uuid.uuid4().hex[:8]}"
    results = load_results()

    if scan_type == "ios_lidar":
        # binary body expected (PLY/OBJ). Default to .ply unless header specifies.
        ext = request.headers.get("X-File-Ext", "ply")
        raw = request.get_data(cache=False, as_text=False)
        fpath = STORAGE / f"{scan_id}.{ext}"
        fpath.write_bytes(raw)

        # Minimal processing stub (deferred heavy libs)
        meta = {
            "scan_id": scan_id,
            "source": "ios_lidar",
            "file": str(fpath),
            "status": "stored",
            "metrics": None,
        }
        results[scan_id] = meta
        save_results(results)
        return jsonify(meta), 201

    elif scan_type == "android_arcore":
        payload = request.get_json(force=True, silent=False)
        # Basic validation & normalization
        units = payload.get("units", "mm")
        meas = payload.get("measurements", {})
        width = float(meas.get("width", 0))
        height = float(meas.get("height", 0))
        depth = float(meas.get("frame_depth", 0))

        normalized = {
            "scan_id": scan_id,
            "source": "android_arcore",
            "units": units,
            "width": width,
            "height": height,
            "frame_depth": depth,
            "confidence": payload.get("confidence", 0.85),
            "raw": payload,
            "status": "received"
        }
        results[scan_id] = normalized
        save_results(results)
        return jsonify(normalized), 201

    else:
        return jsonify({"error": "Unknown or missing X-Scan-Type header (use ios_lidar | android_arcore)"}), 400

@app.get("/results/<scan_id>")
def get_results(scan_id: str):
    results = load_results()
    if scan_id not in results:
        return jsonify({"error": "not found"}), 404
    return jsonify(results[scan_id])

@app.get("/artifacts/<path:filename>")
def artifacts(filename: str):
    return send_from_directory(STORAGE, filename, as_attachment=True)

# ------- Optional: processing helpers for LiDAR scans (PLY/OBJ) -------
def process_lidar_pointcloud(file_path: Path) -> Dict[str, Any]:
    """Attempt to compute very rough metrics from a point cloud.
    This is a placeholder; replace with robust jamb/header plane fitting.
    """
    o3d = try_import_open3d()
    mesh_lib = try_import_trimesh()
    result = {"note": "stub", "points": 0}

    if o3d and file_path.suffix.lower() in {".ply", ".pcd"}:
        try:
            pcd = o3d.io.read_point_cloud(str(file_path))
            result["points"] = len(pcd.points)
            # TODO: add voxel downsample + RANSAC plane estimates
        except Exception as e:
            result["error"] = f"open3d read error: {e}"

    elif mesh_lib and file_path.suffix.lower() in {".obj", ".ply"}:
        try:
            mesh = mesh_lib.load(str(file_path), force='mesh')
            result["vertices"] = int(mesh.vertices.shape[0])
            # TODO: estimate planes / bounding box as proxy measurements
        except Exception as e:
            result["error"] = f"trimesh load error: {e}"

    else:
        result["warning"] = "No point-cloud library available on server. Install open3d or trimesh."

    return result

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8080")), debug=True)


# ---------------- Barcode / Label Scanning Additions ----------------
def try_import_pil():
    try:
        from PIL import Image  # type: ignore
        return Image
    except Exception:
        return None

def try_import_pyzbar():
    try:
        from pyzbar.pyzbar import decode  # type: ignore
        return decode
    except Exception:
        return None

def parse_hardware_tokens(tokens):
    """Very light heuristics to pull out useful fields from decoded strings."""
    import re
    fields = {
        "manufacturer": None,
        "model": None,
        "bhma_function": None,
        "finish": None,
        "series": None,
        "notes": []
    }
    text = " ".join(tokens).upper()

    # Manufacturer hints
    mfr_hints = {
        "SCHLAGE": ["SCHLAGE", "AL", "ND", "L SERIES", "AD"],
        "SARGENT": ["SARGENT", "10 LINE", "7 LINE", "BHW"],
        "YALE": ["YALE", "5300", "5400", "7000"],
        "VON DUPRIN": ["VON DUPRIN", "98", "99", "33A", "35A"],
        "LCN": ["LCN", "4040", "4041", "4021", "1460", "1260"],
        "HES": ["HES", "1500", "1600", "5000", "7000"],
        "SDC": ["SDC", "1500", "2340", "1581"],
        "ADAMS RITE": ["ADAMS RITE", "4510", "4900", "HERCULITE"],
        "BEST": ["BEST", "9K", "7K"],
        "CORBIN RUSSWIN": ["CORBIN", "RUSSWIN", "CLX", "ML2000"]
    }
    for mfr, keys in mfr_hints.items():
        if any(k in text for k in keys):
            fields["manufacturer"] = mfr
            break

    # Finish codes (US/BHMA)
    finish_match = None
    for code in ["626", "625", "630", "605", "606", "612", "613", "619", "622", "689", "690", "695"]:
        if f" {code} " in f" {text} ":
            finish_match = code; break
    fields["finish"] = finish_match

    # BHMA function like F109, F86, F75, etc.
    import re
    f_match = re.search(r"\bF(\d{2,3})\b", text)
    if f_match:
        fields["bhma_function"] = f"F{f_match.group(1)}"

    # Model/series: simple token that looks like letters+digits (e.g., ND80, 4040XP)
    model_match = re.search(r"\b([A-Z]{1,4}\d{1,4}[A-Z]{0,3})\b", text)
    if model_match:
        fields["model"] = model_match.group(1)

    # Series heuristics
    series_match = re.search(r"\b(4040XP|4041|98/99|33A/35A|5400|10 LINE|9K)\b", text)
    if series_match:
        fields["series"] = series_match.group(1)

    return fields

@app.post("/uploadLabel")
def upload_label():
    """Accepts an image (multipart/form-data) or base64 JSON and attempts to decode barcodes.
    Returns decoded text tokens and heuristic hardware fields.
    Headers:
      - Content-Type: multipart/form-data  (field name: 'file')
      - OR application/json with {'image_b64': '...'} (base64-encoded PNG/JPG)
    """
    decode_fn = try_import_pyzbar()
    Image = try_import_pil()
    if decode_fn is None or Image is None:
        return jsonify({
            "error": "Barcode decoder unavailable. Install 'pyzbar' and 'Pillow' (and system libzbar).",
            "hint": "pip install pyzbar Pillow  # On Linux also: apt-get install libzbar0"
        }), 501

    img = None
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "No file part 'file' found."}), 400
        img = Image.open(file.stream).convert("RGB")
    else:
        # JSON with base64
        try:
            data = request.get_json(force=True)
            import base64, io
            b64 = data.get("image_b64")
            if not b64:
                return jsonify({"error": "Missing 'image_b64' in JSON body."}), 400
            raw = base64.b64decode(b64)
            img = Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception as e:
            return jsonify({"error": f"Invalid JSON or base64 image: {e}"}), 400

    # Decode barcodes/QR/DataMatrix
    try:
        decoded = decode_fn(img)
    except Exception as e:
        return jsonify({"error": f"Decoding error: {e}"}), 500

    tokens = []
    for d in decoded:
        txt = d.data.decode("utf-8", errors="ignore")
        symbology = getattr(d, "type", "UNKNOWN")
        tokens.append(f"{symbology}:{txt}")

    fields = normalize_fields(parse_hardware_tokens(tokens))

    # Persist a small record
    scan_id = f"label-{int(time.time())}-{uuid.uuid4().hex[:6]}"
    record = {
        "scan_id": scan_id,
        "source": "label_scan",
        "tokens": tokens,
        "fields": fields
    }
    results = load_results()
    results[scan_id] = record
    save_results(results)
    return jsonify(record), 201


# -------- Static hosting for public frontend --------
from flask import send_from_directory
PUBLIC_DIR = Path(__file__).parent / "public"

@app.get("/")
def home():
    return send_from_directory(PUBLIC_DIR, "index.html")

@app.get("/public/<path:filename>")
def public_files(filename: str):
    return send_from_directory(PUBLIC_DIR, filename)


# -------- Manufacturer/model normalization using mappings.json --------
MAPPINGS_PATH = Path(__file__).parent / "mappings.json"
CANON = {}
if MAPPINGS_PATH.exists():
    try:
        import json as _json
        CANON = _json.loads(MAPPINGS_PATH.read_text(encoding="utf-8"))
    except Exception:
        CANON = {}

def normalize_fields(fields: dict) -> dict:
    mf = fields.get("manufacturer")
    if mf and "manufacturers" in CANON:
        # match by alias
        for canonical, info in CANON["manufacturers"].items():
            aliases = [canonical] + info.get("aliases", [])
            if any(mf.strip().upper() == a for a in aliases):
                fields["manufacturer"] = canonical
                fields["docs_base"] = info.get("docs_base")
                break
    # expand finish description
    finish = fields.get("finish")
    if finish and "finishes" in CANON and finish in CANON["finishes"]:
        fields["finish_desc"] = CANON["finishes"][finish]
    # expand BHMA function
    fcode = fields.get("bhma_function")
    if fcode and "bhma_functions" in CANON and fcode in CANON["bhma_functions"]:
        fields["bhma_desc"] = CANON["bhma_functions"][fcode]
    return fields


# -------- Manufacturer catalog lookup --------
def build_catalog_links(manufacturer: str, model: str | None, fields: dict) -> dict:
    m = (manufacturer or "").upper().strip()
    mdl = (model or "").strip()
    base = fields.get("docs_base")
    links = {}
    # Generic web fallbacks
    q = "+".join(x for x in [manufacturer, model, "cut sheet", "datasheet"] if x)
    links["web_search"] = f"https://www.google.com/search?q={q}"
    # Known vendor bases
    if base:
        # naive guess: append model token if it looks like alnum (ND80, 4040XP, 98/99)
        token = mdl.replace(" ", "").replace("/", "-")
        links["vendor_home"] = base
        if token:
            links["likely_product_query"] = f"{base}?q={token}"
    return links

@app.get("/catalogLookup")
def catalog_lookup():
    from urllib.parse import unquote
    manufacturer = request.args.get("manufacturer", "")
    model = request.args.get("model", "")
    scan_id = request.args.get("scan_id")
    context_fields = {}
    if scan_id:
        results = load_results()
        rec = results.get(scan_id)
        if rec and "fields" in rec:
            context_fields = rec["fields"]
            # prefer fields from record if missing
            manufacturer = manufacturer or context_fields.get("manufacturer", "")
            model = model or context_fields.get("model", "")
    if not manufacturer and not model:
        return jsonify({"error": "Provide ?manufacturer= and/or ?model= (or scan_id)"}), 400
    links = build_catalog_links(manufacturer, model, context_fields)
    return jsonify({
        "manufacturer": manufacturer,
        "model": model,
        "links": links,
        "context": context_fields
    })

# -------- List all results & CSV export --------
@app.get("/results")
def list_results():
    return jsonify(load_results())

@app.get("/export.csv")
def export_csv():
    import csv, io
    results = load_results()
    headers = ["scan_id","source","units","width","height","frame_depth","door_swing",
               "ada_compliant","confidence","manufacturer","model","bhma_function","finish"]
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=headers)
    w.writeheader()
    for sid, rec in results.items():
        row = {h: rec.get(h) for h in headers}
        if not row.get("manufacturer") and isinstance(rec.get("fields"), dict):
            f = rec["fields"]
            row["manufacturer"] = f.get("manufacturer")
            row["model"] = f.get("model")
            row["bhma_function"] = f.get("bhma_function")
            row["finish"] = f.get("finish")
        row["scan_id"] = sid
        w.writerow(row)
    csv_bytes = buf.getvalue().encode("utf-8")
    from flask import Response
    return Response(csv_bytes, headers={
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=export.csv"
    })


# -------- Basic vendor catalog scraper (best-effort) --------
# NOTE: Many vendor sites may block scraping; this is a light utility.
def try_import_requests_bs4():
    try:
        import requests
        from bs4 import BeautifulSoup
        return requests, BeautifulSoup
    except Exception:
        return None, None

@app.get("/scrapeCatalog")
def scrape_catalog():
    manufacturer = request.args.get("manufacturer", "")
    model = request.args.get("model", "")
    scan_id = request.args.get("scan_id")
    ctx = {}
    if scan_id:
        results = load_results()
        rec = results.get(scan_id) or {}
        ctx = rec.get("fields", {})
        manufacturer = manufacturer or ctx.get("manufacturer", "")
        model = model or ctx.get("model", "")
    if not (manufacturer or model):
        return jsonify({"error": "Provide ?manufacturer= and/or ?model= (or scan_id)"}), 400

    # Build target URLs
    links = build_catalog_links(manufacturer, model, ctx)
    req, BS = try_import_requests_bs4()
    out = {"inputs": {"manufacturer": manufacturer, "model": model}, "links": links, "matches": []}

    if not req or not BS:
        out["warning"] = "requests/bs4 not installed; returning search links only."
        return jsonify(out)

    targets = []
    if links.get("likely_product_query"):
        targets.append(links["likely_product_query"])
    if links.get("vendor_home"):
        targets.append(links["vendor_home"])

    for url in targets[:3]:
        try:
            r = req.get(url, timeout=8)
            if r.status_code != 200 or "text/html" not in r.headers.get("Content-Type",""):
                continue
            soup = BS(r.text, "html.parser")
            # Heuristic: collect links with model token in text or href
            token = (model or "").replace(" ", "").replace("/", "-")
            candidates = []
            for a in soup.find_all("a"):
                txt = (a.get_text() or "").strip()
                href = a.get("href") or ""
                hay = f"{txt} {href}".upper()
                if token and token.upper() in hay:
                    candidates.append({"text": txt, "href": href})
            out["matches"].extend(candidates[:10])
        except Exception as e:
            out.setdefault("errors", []).append(str(e))

    return jsonify(out)

# -------- Point cloud artifact lookup by scan_id --------
@app.get("/pointcloud/<scan_id>")
def pointcloud(scan_id: str):
    results = load_results()
    rec = results.get(scan_id)
    if not rec:
        return jsonify({"error":"not found"}), 404
    # iOS uploads stored under 'file' path
    f = rec.get("file")
    if not f:
        return jsonify({"error":"no point cloud for this scan"}), 404
    p = Path(f)
    if not p.exists():
        return jsonify({"error":"artifact missing"}), 404
    # Serve via /artifacts
    return jsonify({"url": f"/artifacts/{p.name}"})
