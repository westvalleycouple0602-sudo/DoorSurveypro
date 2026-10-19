import os, json, re
from datetime import datetime, timedelta
from urllib.parse import quote
from fastapi import FastAPI, Depends, Request, HTTPException, UploadFile, File, Form
from fastapi.responses import RedirectResponse, JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from .db import Base, engine, get_db
from .models import User, Connection, Project, GithubInstall
from .providers.atlassian import exchange_code_for_tokens as atl_exchange, AtlassianClient, refresh_tokens as atl_refresh
from .providers.google import exchange_code_for_tokens as g_exchange, GoogleClient, refresh_tokens as g_refresh
from .providers.microsoft import exchange_code_for_tokens as ms_exchange, MicrosoftClient, refresh_tokens as ms_refresh
from .providers.github_app import (get_installation_access_token, create_branch, create_or_update_file, open_pr, dispatch_workflow, create_release, upload_release_asset, create_gist, verify_webhook)
from .oauth import will_expire_soon

load_dotenv()
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEMO_EMAIL = os.getenv("DEMO_EMAIL", "demo@doorsurvey.pro")

def get_demo_user(db: Session):
    user = db.query(User).filter_by(email=DEMO_EMAIL).first()
    if not user:
        user = User(email=DEMO_EMAIL, name="Demo User")
        db.add(user); db.commit(); db.refresh(user)
    return user

def ensure_token(conn: Connection, db: Session):
    if conn.refresh_token and conn.provider in ("google","microsoft","atlassian"):
        needs = False
        if conn.expires_at and will_expire_soon(conn.expires_at):
            needs = True
        else:
            try:
                extra = json.loads(conn.extra or '{}')
                last = extra.get('last_refresh')
                if not last or datetime.utcnow() - datetime.fromisoformat(last) > timedelta(minutes=55):
                    needs = True
            except Exception:
                needs = True
        if needs:
            if conn.provider == 'google':
                new = g_refresh(conn.refresh_token)
            elif conn.provider == 'microsoft':
                new = ms_refresh(conn.refresh_token)
            else:
                new = atl_refresh(conn.refresh_token)
            conn.access_token = new.get('access_token', conn.access_token)
            if new.get('refresh_token'):
                conn.refresh_token = new['refresh_token']
            if 'expires_in' in new:
                conn.expires_at = datetime.utcnow() + timedelta(seconds=int(new['expires_in']))
            try:
                extra = json.loads(conn.extra or '{}')
            except Exception:
                extra = {}
            extra['last_refresh'] = datetime.utcnow().isoformat()
            conn.extra = json.dumps(extra)
            db.add(conn); db.commit()
    return conn

# ---------- OAuth start endpoints ----------
@app.get("/oauth/atlassian/start")
def atl_start():
    scopes = "read:jira-work write:jira-work read:confluence-content write:confluence-content offline_access"
    url = (
        "https://auth.atlassian.com/authorize?audience=api.atlassian.com"
        f"&client_id={os.getenv('ATL_CLIENT_ID')}"
        f"&scope={scopes.replace(' ', '%20')}"
        f"&redirect_uri={os.getenv('ATL_REDIRECT_URI')}"
        "&state=xyz&response_type=code&prompt=consent"
    )
    return RedirectResponse(url)

@app.get("/oauth/google/start")
def g_start():
    scopes = "%20".join([
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
        "offline_access"
    ])
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={os.getenv('GOOGLE_CLIENT_ID')}"
        f"&redirect_uri={os.getenv('GOOGLE_REDIRECT_URI')}"
        f"&response_type=code&scope={scopes}&access_type=offline&prompt=consent&state=xyz"
    )
    return RedirectResponse(url)

@app.get("/oauth/ms/start")
def ms_start():
    scopes = "offline_access%20Calendars.ReadWrite"
    url = (
        "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?"
        f"client_id={os.getenv('MS_CLIENT_ID')}"
        f"&response_type=code&redirect_uri={os.getenv('MS_REDIRECT_URI')}"
        f"&response_mode=query&scope={scopes}&state=xyz"
    )
    return RedirectResponse(url)

# ---------- OAuth callbacks ----------
@app.get("/oauth/atlassian/callback")
def atl_cb(code: str, db: Session = Depends(get_db)):
    tokens = atl_exchange(code)
    user = get_demo_user(db)
    conn = db.query(Connection).filter_by(user_id=user.id, provider='atlassian').first()
    if not conn:
        conn = Connection(user_id=user.id, provider='atlassian')
    conn.access_token = tokens.get('access_token')
    conn.refresh_token = tokens.get('refresh_token')
    conn.scopes = " ".join(tokens.get('scope', [])) if isinstance(tokens.get('scope'), list) else str(tokens.get('scope'))
    conn.extra = json.dumps({"resources": tokens.get('resources', [])})
    db.add(conn); db.commit()
    return JSONResponse({"status": "ok"})

@app.get("/oauth/google/callback")
def g_cb(code: str, db: Session = Depends(get_db)):
    tokens = g_exchange(code)
    user = get_demo_user(db)
    conn = db.query(Connection).filter_by(user_id=user.id, provider='google').first()
    if not conn:
        conn = Connection(user_id=user.id, provider='google')
    conn.access_token = tokens.get('access_token')
    conn.refresh_token = tokens.get('refresh_token')
    conn.scopes = tokens.get('scope','')
    db.add(conn); db.commit()
    return JSONResponse({"status": "ok"})

@app.get("/oauth/ms/callback")
def ms_cb(code: str, db: Session = Depends(get_db)):
    tokens = ms_exchange(code)
    user = get_demo_user(db)
    conn = db.query(Connection).filter_by(user_id=user.id, provider='microsoft').first()
    if not conn:
        conn = Connection(user_id=user.id, provider='microsoft')
    conn.access_token = tokens.get('access_token')
    conn.refresh_token = tokens.get('refresh_token')
    conn.scopes = tokens.get('scope','')
    db.add(conn); db.commit()
    return JSONResponse({"status": "ok"})

# ---------- API: Jira issues ----------
@app.get("/api/jira/issues")
def list_issues(projectKey: str, jqlExtra: str|None = None, db: Session = Depends(get_db)):
    user = get_demo_user(db)
    conn = db.query(Connection).filter_by(user_id=user.id, provider='atlassian').first()
    if not conn:
        raise HTTPException(401, "Atlassian not connected")
    conn = ensure_token(conn, db)
    resources = json.loads(conn.extra or '{}').get('resources', [])
    client = AtlassianClient(conn.access_token, resources)
    site = client.get_jira_site()
    if not site: raise HTTPException(400, "No Jira site found in resources")
    jql = f"project={projectKey}" + (f" AND {jqlExtra}" if jqlExtra else "")
    return client.search_issues(site['id'], jql, 25)

@app.post("/api/jira/issues")
def create_issue(payload: dict, db: Session = Depends(get_db)):
    user = get_demo_user(db)
    conn = db.query(Connection).filter_by(user_id=user.id, provider='atlassian').first()
    if not conn:
        raise HTTPException(401, "Atlassian not connected")
    conn = ensure_token(conn, db)
    resources = json.loads(conn.extra or '{}').get('resources', [])
    client = AtlassianClient(conn.access_token, resources)
    site = client.get_jira_site()
    return client.create_issue(site['id'], payload['projectKey'], payload['summary'], payload.get('description',''))

# ---------- API: Confluence page ----------
@app.post("/api/confluence/pages")
def create_page(payload: dict, db: Session = Depends(get_db)):
    user = get_demo_user(db)
    conn = db.query(Connection).filter_by(user_id=user.id, provider='atlassian').first()
    if not conn:
        raise HTTPException(401, "Atlassian not connected")
    conn = ensure_token(conn, db)
    resources = json.loads(conn.extra or '{}').get('resources', [])
    client = AtlassianClient(conn.access_token, resources)
    wiki = client.get_conf_site()
    return client.create_confluence_page(wiki['id'], payload['spaceId'], payload['title'], payload['htmlBody'], payload.get('parentId'))

# Resolve space key -> spaceId
@app.get("/api/confluence/space_id")
def conf_space_id(key: str, db: Session = Depends(get_db)):
    user = get_demo_user(db)
    conn = db.query(Connection).filter_by(user_id=user.id, provider='atlassian').first()
    if not conn:
        raise HTTPException(401, "Atlassian not connected")
    conn = ensure_token(conn, db)
    resources = json.loads(conn.extra or '{}').get('resources', [])
    client = AtlassianClient(conn.access_token, resources)
    wiki = client.get_conf_site()
    if not wiki:
        raise HTTPException(400, "No Confluence site found")
    from .providers.atlassian import get_space_id_by_key
    sid = get_space_id_by_key(conn.access_token, wiki['id'], key)
    if not sid:
        raise HTTPException(404, "Space not found")
    return {"spaceId": sid}

# ---------- API: Google Calendar ----------
@app.post("/api/google/events")
def g_create_event(payload: dict, db: Session = Depends(get_db)):
    user = get_demo_user(db)
    conn = db.query(Connection).filter_by(user_id=user.id, provider='google').first()
    if not conn:
        raise HTTPException(401, "Google not connected")
    conn = ensure_token(conn, db)
    client = GoogleClient(conn.access_token)
    return client.create_event(payload.get('calendarId','primary'), payload['summary'], payload['startISO'], payload['endISO'], payload.get('location'), payload.get('description'))

# ---------- API: Microsoft (Outlook) ----------
@app.post("/api/ms/events")
def ms_create_event(payload: dict, db: Session = Depends(get_db)):
    user = get_demo_user(db)
    conn = db.query(Connection).filter_by(user_id=user.id, provider='microsoft').first()
    if not conn:
        raise HTTPException(401, "Microsoft not connected")
    conn = ensure_token(conn, db)
    client = MicrosoftClient(conn.access_token)
    return client.create_event(payload['summary'], payload['startISO'], payload['endISO'], payload.get('location'), payload.get('description'))



# ---------- Composite Action: One-click Schedule Site Visit ----------
@app.post("/api/actions/schedule_visit")
def schedule_site_visit(payload: dict, db: Session = Depends(get_db)):
    """Create a Jira issue, a calendar event (Google or Outlook), and a Confluence report page.
    Expected payload:
    {
      "projectKey": "DSP",
      "summary": "Site visit – 123 Main St",
      "description": "Measure door openings",
      "startISO": "2025-10-26T18:00:00Z",
      "endISO": "2025-10-26T19:00:00Z",
      "location": "123 Main St",
      "calendarProvider": "google" | "microsoft",
      "calendarId": "primary",
      "confluenceSpaceId": "<spaceId>",
      "confluenceParentId": null
    }
    """
    user = get_demo_user(db)
    out = {"jira": None, "calendar": None, "confluence": None}

    # --- Jira issue ---
    jira_conn = db.query(Connection).filter_by(user_id=user.id, provider='atlassian').first()
    if not jira_conn:
        raise HTTPException(401, "Atlassian not connected")
    jira_conn = ensure_token(jira_conn, db)
    resources = json.loads(jira_conn.extra or '{}').get('resources', [])
    acli = AtlassianClient(jira_conn.access_token, resources)
    site = acli.get_jira_site()
    if not site: raise HTTPException(400, "No Jira site found")
    issue = acli.create_issue(site['id'], payload['projectKey'], payload['summary'], payload.get('description',''))
    out["jira"] = {"key": issue.get("key"), "id": issue.get("id"), "url": f"{site.get('url','')}/browse/{issue.get('key')}"}

    # --- Calendar event ---
    cal_provider = (payload.get("calendarProvider") or "google").lower()
    if cal_provider == "google":
        g_conn = db.query(Connection).filter_by(user_id=user.id, provider='google').first()
        if not g_conn:
            raise HTTPException(401, "Google not connected")
        g_conn = ensure_token(g_conn, db)
        gcli = GoogleClient(g_conn.access_token)
        ge = gcli.create_event(payload.get('calendarId','primary'), payload['summary'], payload['startISO'], payload['endISO'], payload.get('location'), payload.get('description'))
        out["calendar"] = {"provider": "google", "id": ge.get("id"), "htmlLink": ge.get("htmlLink"), "calendarId": payload.get('calendarId','primary')}
    else:
        m_conn = db.query(Connection).filter_by(user_id=user.id, provider='microsoft').first()
        if not m_conn:
            raise HTTPException(401, "Microsoft (Outlook) not connected")
        m_conn = ensure_token(m_conn, db)
        mcli = MicrosoftClient(m_conn.access_token)
        me = mcli.create_event(payload['summary'], payload['startISO'], payload['endISO'], payload.get('location'), payload.get('description'))
        out["calendar"] = {"provider": "microsoft", "id": me.get("id")}

    # --- Confluence page ---
    # ensure parent page per Project if spaceId provided and no parentId
    wiki = acli.get_conf_site()
    if wiki and payload.get("confluenceSpaceId"):
        # Ensure parent page exists
        from .providers.atlassian import find_page_by_title
        parentId = payload.get('confluenceParentId')
        if not parentId:
            ensure_parent_title = f"Door Survey – {payload.get('projectKey','')}"
            parent_page = find_page_by_title(jira_conn.access_token, wiki['id'], payload['confluenceSpaceId'], ensure_parent_title)
            if not parent_page:
                parent_page = acli.create_confluence_page(wiki['id'], payload['confluenceSpaceId'], ensure_parent_title, "<p>Parent for site visit reports.</p>", None)
            parentId = str(parent_page.get('id')) if isinstance(parent_page, dict) else str(parent_page)

        # Simple HTML content referencing created resources
        issue_link = out["jira"]["url"] if out["jira"] else ""
        cal_line = f"Calendar: {out['calendar'].get('provider')} – {out['calendar'].get('id')}"
        html = f"""<p><strong>Door Survey – Site Visit</strong></p>
<p><strong>Summary:</strong> {payload.get('summary','')}</p>
<p><strong>Location:</strong> {payload.get('location','')}</p>
<p><strong>Start:</strong> {payload.get('startISO','')}</p>
<p><strong>End:</strong> {payload.get('endISO','')}</p>
<p><strong>Jira Issue:</strong> <a href="{issue_link}">{out['jira'].get('key')}</a></p>
<p>{cal_line}</p>
<p><em>Generated by Door Survey Pro.</em></p>
"""
        page = acli.create_confluence_page(wiki['id'], payload['confluenceSpaceId'], f"Site Visit – {payload.get('summary','')}", html, parentId)
        out["confluence"] = {"id": page.get("id"), "title": page.get("title"), "url": f"{wiki.get('url','')}/spaces/"}

    return out



# ---------- List Calendars ----------
@app.get("/api/google/calendars")
def g_list_calendars(db: Session = Depends(get_db)):
    user = get_demo_user(db)
    conn = db.query(Connection).filter_by(user_id=user.id, provider='google').first()
    if not conn: raise HTTPException(401, "Google not connected")
    conn = ensure_token(conn, db)
    import requests
    r = requests.get("https://www.googleapis.com/calendar/v3/users/me/calendarList",
                     headers={"Authorization": f"Bearer {conn.access_token}"})
    if r.status_code == 401: raise HTTPException(401, "Google token invalid")
    data = r.json()
    items = [{"id": c.get("id"), "summary": c.get("summary")} for c in data.get("items", [])]
    return {"items": items}

@app.get("/api/ms/calendars")
def ms_list_calendars(db: Session = Depends(get_db)):
    user = get_demo_user(db)
    conn = db.query(Connection).filter_by(user_id=user.id, provider='microsoft').first()
    if not conn: raise HTTPException(401, "Microsoft not connected")
    conn = ensure_token(conn, db)
    import requests
    r = requests.get("https://graph.microsoft.com/v1.0/me/calendars",
                     headers={"Authorization": f"Bearer {conn.access_token}"})
    if r.status_code == 401: raise HTTPException(401, "Microsoft token invalid")
    data = r.json()
    items = [{"id": c.get("id"), "name": c.get("name")} for c in data.get("value", [])]
    return {"items": items}



# ---------- GitHub App integration ----------
@app.post("/github/installation")
def save_installation(installation_id: int, owner: str, repo: str, db: Session = Depends(get_db)):
    user = get_demo_user(db)
    row = db.query(GithubInstall).filter_by(user_id=user.id).first()
    if not row: row = GithubInstall(user_id=user.id, installation_id=installation_id)
    row.installation_id = installation_id; row.default_owner = owner; row.default_repo = repo
    db.add(row); db.commit()
    return {"ok": True}

@app.post("/github/export")
def github_export(payload: dict, db: Session = Depends(get_db)):
    import base64
    user = get_demo_user(db)
    inst = db.query(GithubInstall).filter_by(user_id=user.id).first()
    if not inst: raise HTTPException(400, "GitHub installation not configured")
    owner = payload.get("owner") or inst.default_owner
    repo  = payload.get("repo")  or inst.default_repo
    if not owner or not repo: raise HTTPException(400, "owner/repo required")

    token = get_installation_access_token(inst.installation_id)
    base = payload.get("base","main"); branch = payload.get("branch")
    if not branch: raise HTTPException(400, "branch required")

    create_branch(token, owner, repo, branch, from_branch=base)
    for f in payload.get("files", []):
        content = f["content"].encode() if not f.get("isBase64") else base64.b64decode(f["content"])
        create_or_update_file(token, owner, repo, f["path"], content, branch, f"Add {f['path']}")

    pr = open_pr(token, owner, repo, head=branch, base=base, title=f"Door Survey export: {branch}")
    return {"pr": pr}

@app.post("/github/actions/dispatch")
def github_actions_dispatch(payload: dict, db: Session = Depends(get_db)):
    user = get_demo_user(db)
    inst = db.query(GithubInstall).filter_by(user_id=user.id).first()
    if not inst: raise HTTPException(400, "GitHub installation not configured")
    token = get_installation_access_token(inst.installation_id)
    dispatch_workflow(token, payload.get("owner") or inst.default_owner, payload.get("repo") or inst.default_repo,
                      payload["workflow"], payload.get("ref","main"), payload.get("inputs"))
    return {"ok": True}

@app.post("/github/releases")
def github_create_release(payload: dict, db: Session = Depends(get_db)):
    import base64
    user = get_demo_user(db)
    inst = db.query(GithubInstall).filter_by(user_id=user.id).first()
    if not inst: raise HTTPException(400, "GitHub installation not configured")
    token = get_installation_access_token(inst.installation_id)
    owner = payload.get("owner") or inst.default_owner
    repo  = payload.get("repo")  or inst.default_repo
    rel = create_release(token, owner, repo, payload["tag"], payload.get("name", payload["tag"]), payload.get("body",""))
    upload_url = rel["upload_url"]
    for a in payload.get("assets", []):
        data = base64.b64decode(a["content"])
        upload_release_asset(token, upload_url, a["filename"], data)
    return {"release": rel}

@app.post("/github/gists")
def github_gist(payload: dict, db: Session = Depends(get_db)):
    user = get_demo_user(db)
    inst = db.query(GithubInstall).filter_by(user_id=user.id).first()
    if not inst: raise HTTPException(400, "GitHub installation not configured")
    token = get_installation_access_token(inst.installation_id)
    return create_gist(token, payload.get("description",""), payload.get("files",{}), bool(payload.get("public")))

# ---------- Webhooks ----------
@app.post("/webhooks/atlassian")
async def wh_atlassian(request: Request):
    payload = await request.json()
    print("Jira webhook:", json.dumps(payload)[:500])
    return JSONResponse(status_code=204, content=None)

@app.post("/api/google/watch")
def google_watch(payload: dict, db: Session = Depends(get_db)):
    user = get_demo_user(db)
    conn = db.query(Connection).filter_by(user_id=user.id, provider='google').first()
    if not conn:
        raise HTTPException(401, "Google not connected")
    conn = ensure_token(conn, db)
    from .providers.google import GoogleClient
    import uuid, requests
    
    # Validate calendarId to prevent SSRF
    calendar_id = payload.get('calendarId', 'primary')
    if not re.match(r'^[a-zA-Z0-9@._-]+$', calendar_id):
        raise HTTPException(400, "Invalid calendarId format")
    
    channel_id = str(uuid.uuid4())
    base_url = os.getenv("BASE_URL")
    if not base_url:
        raise HTTPException(500, "BASE_URL environment variable not configured")
    callback = base_url + "/webhooks/google"
    watch_body = {"id": channel_id, "type": "web_hook", "address": callback}
    # Use URL encoding for additional safety
    url = f"https://www.googleapis.com/calendar/v3/calendars/{quote(calendar_id, safe='')}/events/watch"
    r = requests.post(url, headers={"Authorization": f"Bearer {conn.access_token}", "Content-Type":"application/json"}, json=watch_body)
    data = r.json()
    extra = json.loads(conn.extra or '{}')
    extra['google_watch'] = {"channelId": channel_id, "resourceId": data.get('resourceId'), "calendarId": calendar_id}
    conn.extra = json.dumps(extra); db.add(conn); db.commit()
    return data

@app.post("/webhooks/google")
async def wh_google(request: Request, db: Session = Depends(get_db)):
    headers = {k:v for k,v in request.headers.items() if k.lower().startswith('x-goog-')}
    print("Google webhook headers:", headers)
    return JSONResponse(status_code=204, content=None)

@app.get("/webhooks/ms")
async def ms_validation(validationToken: str | None = None):
    if validationToken:
        return PlainTextResponse(validationToken)
    return JSONResponse({"ok": True})



@app.post("/webhooks/github")
async def github_webhook(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    sig = request.headers.get("X-Hub-Signature-256")
    try:
        verify_webhook(raw, sig)
    except Exception:
        raise HTTPException(401, "Invalid webhook signature")

    event = request.headers.get("X-GitHub-Event","")
    payload = await request.json()

    if event == "workflow_run":
        print("Workflow run:", payload.get("action"), payload.get("workflow_run",{}).get("conclusion"))
    elif event == "pull_request":
        print("PR:", payload.get("action"), payload.get("pull_request",{}).get("html_url"))
    elif event == "release":
        print("Release:", payload.get("action"), payload.get("release",{}).get("html_url"))

    return JSONResponse({"ok": True})

@app.post("/webhooks/ms")
async def ms_notifications(request: Request):
    payload = await request.json()
    print("MS Graph notifications:", json.dumps(payload)[:500])
    return JSONResponse(status_code=202, content=None)

@app.get("/")
def root():
    return {"ok": True, "service": "Door Survey Pro integrations (FastAPI)"}



# Upload attachments to a Confluence page
@app.post("/api/confluence/pages/{page_id}/attachments")
async def conf_upload_attachments(page_id: str, files: list[UploadFile] = File(...), db: Session = Depends(get_db)):
    user = get_demo_user(db)
    conn = db.query(Connection).filter_by(user_id=user.id, provider='atlassian').first()
    if not conn:
        raise HTTPException(401, "Atlassian not connected")
    conn = ensure_token(conn, db)
    resources = json.loads(conn.extra or '{}').get('resources', [])
    client = AtlassianClient(conn.access_token, resources)
    wiki = client.get_conf_site()
    if not wiki:
        raise HTTPException(400, "No Confluence site found")
    from .providers.atlassian import upload_attachment_v1
    results = []
    for uf in files:
        content = await uf.read()
        res = upload_attachment_v1(conn.access_token, wiki['id'], page_id, uf.filename, content)
        results.append(res)
    return {"ok": True, "uploaded": len(results), "results": results}

# ---------- Serve React build (if present) ----------
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from pathlib import Path

FRONTEND_DIST = Path(__file__).resolve().parent.parent / 'frontend' / 'dist'
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="static")
    @app.exception_handler(404)
    async def spa_fallback(request, exc):
        index_file = FRONTEND_DIST / 'index.html'
        if index_file.exists():
            return FileResponse(str(index_file))
        return JSONResponse({"detail":"Not Found"}, status_code=404)
