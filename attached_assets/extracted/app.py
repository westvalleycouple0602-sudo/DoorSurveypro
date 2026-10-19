
import os, json, time, uuid, datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
app = Flask(__name__)
STORAGE = Path("./storage"); STORAGE.mkdir(parents=True, exist_ok=True)
RESULTS = STORAGE / "results.json"
if not RESULTS.exists(): RESULTS.write_text("{}", encoding="utf-8")
def load_results():
    try: return json.loads(RESULTS.read_text(encoding="utf-8"))
    except Exception: return {}
def save_results(d): RESULTS.write_text(json.dumps(d, indent=2), encoding="utf-8")
@app.get("/artifacts/<path:name>")
def artifacts(name: str): return send_from_directory(STORAGE, name, as_attachment=True)


# ---- Bug reporting store ----
BUGS_FILE = Path("./storage/bug_reports.json")
if not BUGS_FILE.exists():
    BUGS_FILE.write_text("{}", encoding="utf-8")

def load_bugs():
    try: return json.loads(BUGS_FILE.read_text(encoding="utf-8"))
    except Exception: return {}

def save_bugs(bugs):
    BUGS_FILE.write_text(json.dumps(bugs, indent=2), encoding="utf-8")


@app.post("/uploadBugFile")
def upload_bug_file():
    """Accepts multipart/form-data with a 'file' field. Returns a URL under /artifacts."""
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
    f = request.files['file']
    if not f.filename:
        return jsonify({"error": "Empty filename"}), 400
    safe = f"bug_{int(time.time())}_{uuid.uuid4().hex[:6]}_{f.filename.replace(' ', '_')}"
    out = STORAGE / safe
    f.save(out)
    return jsonify({"url": f"/artifacts/{safe}", "name": f.filename}), 201


@app.post("/reportBug")
def report_bug():
    data = request.get_json(force=True, silent=False)
    required = ["user_id", "description", "platform"]
    missing = [r for r in required if r not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    bug_id = str(uuid.uuid4())
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    entry = {
        "bug_id": bug_id,
        "scan_id": data.get("scan_id"),
        "user_id": data["user_id"],
        "platform": data["platform"],
        "page": data.get("page"),
        "severity": data.get("severity", "Medium"),
        "description": data["description"],
        "screenshot_url": data.get("screenshot_url"),
        "logs_url": data.get("logs_url"),
        "extra": data.get("extra", {}),
        "timestamp": timestamp,
        "status": "New"
    }
    bugs = load_bugs()
    bugs[bug_id] = entry
    save_bugs(bugs)

    # Optional: Slack webhook notification via env var BUG_WEBHOOK_URL
    try:
        import requests
        webhook = os.environ.get("BUG_WEBHOOK_URL") or os.environ.get("SLACK_BUG_WEBHOOK")
        if webhook:
            color = "#dc2626" if entry["severity"].lower()=="high" else ("#eab308" if entry["severity"].lower()=="medium" else "#16a34a")
            text = f":beetle: New Bug *{bug_id}* ({entry['severity']})\nUser: {entry['user_id']} | Platform: {entry['platform']}"
            fields = [
                {"title":"Scan", "value": entry.get("scan_id") or "-", "short": True},
                {"title":"Page", "value": entry.get("page") or "-", "short": True},
                {"title":"Time (UTC)", "value": timestamp, "short": True},
            ]
            if entry.get("screenshot_url"):
                fields.append({"title":"Screenshot", "value": entry["screenshot_url"], "short": False})
            if entry.get("logs_url"):
                fields.append({"title":"Logs", "value": entry["logs_url"], "short": False})
            requests.post(webhook, json={
                "text": text,
                "attachments": [{
                    "color": color,
                    "fields": fields + [{"title":"Description", "value": entry["description"], "short": False}]
                }]
            }, timeout=6)
    except Exception as e:
        print("Webhook notify failed:", e)

    return jsonify({"bug_id": bug_id, "status": "submitted"}), 201


@app.get("/bugs")
def list_bugs():
    return jsonify(load_bugs())

@app.get("/bugs/<bug_id>")
def get_bug(bug_id: str):
    bugs = load_bugs()
    if bug_id not in bugs:
        return jsonify({"error":"not found"}), 404
    return jsonify(bugs[bug_id])


from pathlib import Path as _Path
PROGRESS_DIR = _Path("./storage/progress"); PROGRESS_DIR.mkdir(parents=True, exist_ok=True)
def _progress_path(scan_id: str) -> _Path:
    safe = "".join(ch for ch in scan_id if ch.isalnum() or ch in ("-","_"))
    return PROGRESS_DIR / f"{safe}.log"


    @app.post("/reportBug")
    def report_bug():
        import os, uuid, datetime, json
        from flask import request, jsonify
        data = request.get_json(force=True, silent=False)
        required = ["user_id", "description", "platform"]
        missing = [r for r in required if r not in data]
        if missing:
            return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

        bug_id = str(uuid.uuid4())
        timestamp = datetime.datetime.utcnow().isoformat() + "Z"

        # Attach logs excerpt automatically if scan_id provided
        logs_url = data.get("logs_url")
        logs_excerpt = None
        scan_id = data.get("scan_id")
        if scan_id:
            try:
                lp = _progress_path(scan_id)
                if lp.exists():
                    lines = lp.read_text(encoding="utf-8").splitlines()
                    tail = lines[-80:] if len(lines) > 80 else lines
                    logs_excerpt = "\n".join(tail)
                    logs_url = logs_url or f"/progress/{scan_id}"
            except Exception:
                pass

        entry = {
            "bug_id": bug_id,
            "scan_id": scan_id,
            "user_id": data["user_id"],
            "platform": data["platform"],
            "page": data.get("page"),
            "severity": data.get("severity", "Medium"),
            "description": data["description"],
            "screenshot_url": data.get("screenshot_url"),
            "logs_url": logs_url,
            "logs_excerpt": logs_excerpt,
            "extra": data.get("extra", {}),
            "timestamp": timestamp,
            "status": "New"
        }
        bugs = load_bugs(); bugs[bug_id] = entry; save_bugs(bugs)

        # Slack webhook notify (optional)
        try:
            import requests
            webhook = os.environ.get("BUG_WEBHOOK_URL") or os.environ.get("SLACK_BUG_WEBHOOK")
            if webhook:
                color = "#dc2626" if entry["severity"].lower()=="high" else ("#eab308" if entry["severity"].lower()=="medium" else "#16a34a")
                text = f":beetle: New Bug *{bug_id}* ({entry['severity']})\nUser: {entry['user_id']} | Platform: {entry['platform']}"
                fields = [
                    {"title":"Scan", "value": entry.get("scan_id") or "-", "short": True},
                    {"title":"Page", "value": entry.get("page") or "-", "short": True},
                    {"title":"Time (UTC)", "value": timestamp, "short": True},
                ]
                if entry.get("screenshot_url"): fields.append({"title":"Screenshot", "value": entry["screenshot_url"], "short": False})
                if entry.get("logs_url"): fields.append({"title":"Logs", "value": entry["logs_url"], "short": False})
                if entry.get("logs_excerpt"): fields.append({"title":"Logs (tail)", "value": entry["logs_excerpt"][:1200], "short": False})
                requests.post(webhook, json={"text": text, "attachments":[{"color": color, "fields": fields + [{"title":"Description", "value": entry["description"], "short": False}]}]}, timeout=6)
        except Exception as e:
            print("Webhook notify failed:", e)

        # SendGrid email (optional)
        try:
            sg_key = os.environ.get("SENDGRID_API_KEY")
            to_addr = os.environ.get("BUG_EMAIL_TO")
            from_addr = os.environ.get("BUG_EMAIL_FROM", "noreply@example.com")
            if sg_key and to_addr:
                import requests, json as _json
                subject = f"[Bug] {bug_id} ({entry['severity']}) - {entry['page'] or entry['platform']}"
                body = f"""New bug reported
Bug ID: {bug_id}
User: {entry['user_id']}
Platform: {entry['platform']}
Page: {entry.get('page') or '-'}
Severity: {entry['severity']}
Scan: {entry.get('scan_id') or '-'}
Time (UTC): {timestamp}

Description:
{entry['description']}

Screenshot: {entry.get('screenshot_url') or '-'}
Logs URL: {entry.get('logs_url') or '-'}

Logs (tail):
{(entry.get('logs_excerpt') or '-')}
"""
                mail = {
                  "personalizations": [{"to": [{"email": a.strip()} for a in to_addr.split(",") if a.strip()]}],
                  "from": {"email": from_addr},
                  "subject": subject,
                  "content": [{"type":"text/plain","value": body}]
                }
                resp = requests.post("https://api.sendgrid.com/v3/mail/send",
                                     headers={"Authorization": f"Bearer {sg_key}", "Content-Type": "application/json"},
                                     data=_json.dumps(mail), timeout=8)
                print("SendGrid response:", resp.status_code)
        except Exception as e:
            print("SendGrid email failed:", e)

        return jsonify({"bug_id": bug_id, "status": "submitted"}), 201


@app.patch("/bugs/<bug_id>")
def update_bug(bug_id: str):
    from flask import request, jsonify
    bugs = load_bugs()
    if bug_id not in bugs:
        return jsonify({"error":"not found"}), 404
    data = request.get_json(force=True, silent=True) or {}
    allowed = {"status","severity","assignee","notes"}
    for k,v in data.items():
        if k in allowed: bugs[bug_id][k] = v
    save_bugs(bugs)
    return jsonify(bugs[bug_id])


# ---- Static file serving for Replit ----
from flask import send_from_directory, redirect
WEB_DIR = Path("./public")

@app.get("/")
def root_redirect():
    # Landing page -> /public/index.html
    return redirect("/public/index.html")

@app.get("/public/<path:name>")
def static_public(name: str):
    return send_from_directory(WEB_DIR, name)
