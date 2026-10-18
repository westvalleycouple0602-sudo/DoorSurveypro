
import os, time, json, base64, hashlib, hmac, requests, jwt
from typing import Optional

GITHUB_API = "https://api.github.com"

def _app_jwt():
    app_id = os.getenv("GITHUB_APP_ID")
    pk_pem = os.getenv("GITHUB_APP_PK_PEM")
    now = int(time.time())
    payload = {"iat": now-60, "exp": now+9*60, "iss": app_id}
    token = jwt.encode(payload, pk_pem, algorithm="RS256")
    return token

def get_installation_access_token(installation_id: int) -> str:
    app_token = _app_jwt()
    r = requests.post(
        f"{GITHUB_API}/app/installations/{installation_id}/access_tokens",
        headers={"Authorization": f"Bearer {app_token}", "Accept":"application/vnd.github+json"},
    )
    r.raise_for_status()
    return r.json()["token"]

def verify_webhook(request_body: bytes, signature_header: str):
    secret = os.getenv("GITHUB_WEBHOOK_SECRET", "")
    mac = hmac.new(secret.encode(), msg=request_body, digestmod=hashlib.sha256)
    expected = "sha256=" + mac.hexdigest()
    if not hmac.compare_digest(expected, signature_header or ""):
        raise ValueError("Invalid GitHub webhook signature")

def create_or_update_file(token: str, owner: str, repo: str, path: str, content_bytes: bytes, branch: str, message: str):
    g = requests.get(f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
                     headers={"Authorization": f"Bearer {token}", "Accept":"application/vnd.github+json"},
                     params={"ref": branch})
    sha = g.json().get("sha") if g.status_code == 200 else None
    b64 = base64.b64encode(content_bytes).decode()
    r = requests.put(f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
                     headers={"Authorization": f"Bearer {token}", "Accept":"application/vnd.github+json"},
                     json={"message": message, "content": b64, "branch": branch, **({"sha": sha} if sha else {})})
    r.raise_for_status()
    return r.json()

def create_branch(token: str, owner: str, repo: str, new_branch: str, from_branch: str="main"):
    r = requests.get(f"{GITHUB_API}/repos/{owner}/{repo}/git/ref/heads/{from_branch}",
                     headers={"Authorization": f"Bearer {token}", "Accept":"application/vnd.github+json"})
    r.raise_for_status()
    sha = r.json()["object"]["sha"]
    r2 = requests.post(f"{GITHUB_API}/repos/{owner}/{repo}/git/refs",
                       headers={"Authorization": f"Bearer {token}", "Accept":"application/vnd.github+json"},
                       json={"ref": f"refs/heads/{new_branch}", "sha": sha})
    if r2.status_code not in (200,201,422):
        r2.raise_for_status()
    return True

def open_pr(token: str, owner: str, repo: str, head: str, base: str, title: str, body: str=""):
    r = requests.post(f"{GITHUB_API}/repos/{owner}/{repo}/pulls",
                      headers={"Authorization": f"Bearer {token}", "Accept":"application/vnd.github+json"},
                      json={"title": title, "head": head, "base": base, "body": body})
    r.raise_for_status()
    return r.json()

def dispatch_workflow(token: str, owner: str, repo: str, workflow_file: str, ref: str="main", inputs: dict|None=None):
    r = requests.post(f"{GITHUB_API}/repos/{owner}/{repo}/actions/workflows/{workflow_file}/dispatches",
                      headers={"Authorization": f"Bearer {token}", "Accept":"application/vnd.github+json"},
                      json={"ref": ref, "inputs": inputs or {}})
    r.raise_for_status()
    return True

def create_release(token: str, owner: str, repo: str, tag: str, name: str, body: str="", draft=False, prerelease=False):
    r = requests.post(f"{GITHUB_API}/repos/{owner}/{repo}/releases",
                      headers={"Authorization": f"Bearer {token}", "Accept":"application/vnd.github+json"},
                      json={"tag_name": tag, "name": name, "body": body, "draft": draft, "prerelease": prerelease})
    r.raise_for_status()
    return r.json()

def upload_release_asset(token: str, upload_url_template: str, filename: str, content_bytes: bytes, content_type="application/octet-stream"):
    upload_url = upload_url_template.split("{")[0] + f"?name={filename}"
    r = requests.post(upload_url,
                      headers={"Authorization": f"Bearer {token}", "Content-Type": content_type},
                      data=content_bytes)
    r.raise_for_status()
    return r.json()

def create_gist(token: str, description: str, files: dict, public=False):
    r = requests.post(f"{GITHUB_API}/gists",
                      headers={"Authorization": f"Bearer {token}", "Accept":"application/vnd.github+json"},
                      json={"description": description, "files": files, "public": public})
    r.raise_for_status()
    return r.json()
