
from flask import Flask, jsonify, request
import json, os
try:
    from replit import db
    HAS_REPLIT_DB = True
except Exception:
    HAS_REPLIT_DB = False

APP_DIR = os.path.dirname(os.path.abspath(__file__))
CATALOG_PATH = os.path.join(APP_DIR, "hardware_catalog", "pivot_catalog.json")

app = Flask(__name__)

def load_catalog():
    with open(CATALOG_PATH, "r") as f:
        return json.load(f)

catalog = load_catalog()

def cache_get(key):
    if HAS_REPLIT_DB and key in db:
        return db[key]
    return None

def cache_set(key, value):
    if HAS_REPLIT_DB:
        db[key] = value

@app.route("/")
def root():
    return jsonify({
        "app": "Glass Pivot/Patch Hardware Catalog API",
        "endpoints": {
            "/hardware": "List all items",
            "/hardware/<part_number>": "Get a single item by PartNumber",
            "/search": "Query by role/manufacturer (e.g. /search?role=TopPatch&manufacturer=CRL)"
        },
        "count": len(catalog)
    })

@app.route("/hardware", methods=["GET"])
def list_all():
    return jsonify(catalog)

@app.route("/hardware/<part_number>", methods=["GET"])
def get_one(part_number):
    key = f"pivot_{part_number}"
    cached = cache_get(key)
    if cached:
        return jsonify(cached)
    rec = catalog.get(part_number)
    if not rec:
        # try case-insensitive
        for k, v in catalog.items():
            if k.lower() == part_number.lower():
                rec = v
                break
    if not rec:
        return jsonify({"error": "Not found"}), 404
    cache_set(key, rec)
    return jsonify(rec)

@app.route("/search", methods=["GET"])
def search():
    role = request.args.get("role")
    mfr = request.args.get("manufacturer")
    q = request.args.get("q")
    results = {}
    for k, v in catalog.items():
        if role and str(v.get("Role","")).lower() != role.lower():
            continue
        if mfr and str(v.get("Manufacturer","")).lower() != mfr.lower():
            continue
        if q:
            blob = json.dumps(v).lower()
            if q.lower() not in blob and q.lower() not in k.lower():
                continue
        results[k] = v
    return jsonify(results)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000)
