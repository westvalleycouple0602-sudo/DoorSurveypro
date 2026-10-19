
from flask import Flask, send_from_directory
app = Flask(__name__, static_folder="public", static_url_path="/public")

@app.get("/")
def _root_index():
    # Basic landing page
    return send_from_directory("public", "pricing.html")


# --- Template export (CSV built from default options)
from templater import save_template_csv

@app.get("/api/template")
def api_template():
    applies = request.args.get("applies_to","door")
    market = request.args.get("market","commercial")
    fname = save_template_csv(applies, market, out_dir="./storage/downloads")
    return jsonify({"download_url": f"/storage/downloads/{fname}", "applies_to": applies, "market": market})


# --- Multi-partner price comparison
from multi_price import compare_partners

@app.post("/api/partners/price_multi")
def api_price_multi():
    data = request.get_json(force=True, silent=True) or {}
    partners = data.get("partners") or []
    items = data.get("items") or []
    base_url = request.host_url.rstrip("/")
    result = compare_partners(base_url, partners, items, use_cache=True)
    return jsonify(result)
