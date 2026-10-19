import os, json, requests
from typing import Dict, Any

ATL_TOKEN_URL = "https://auth.atlassian.com/oauth/token"
ATL_ACCESSIBLE_RES = "https://api.atlassian.com/oauth/token/accessible-resources"

class AtlassianClient:
    def __init__(self, access_token: str, resources: list[dict]):
        self.access_token = access_token
        self.resources = resources or []

    def _hdr(self):
        return {"Authorization": f"Bearer {self.access_token}", "Accept":"application/json"}

    def get_jira_site(self):
        for r in self.resources:
            if r.get("url","").endswith("/jira"):
                return r
        return next((r for r in self.resources if "jira" in r.get("url","")), None)

    def get_conf_site(self):
        for r in self.resources:
            if "/wiki" in r.get("url",""):
                return r
        return None

    def search_issues(self, cloud_id: str, jql: str, max_results=25):
        url = f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/search"
        r = requests.get(url, headers=self._hdr(), params={"jql": jql, "maxResults": max_results})
        r.raise_for_status()
        return r.json()

    def create_issue(self, cloud_id: str, project_key: str, summary: str, description: str):
        url = f"https://api.atlassian.com/ex/jira/{cloud_id}/rest/api/3/issue"
        payload = {"fields": {"project": {"key": project_key}, "summary": summary, "issuetype": {"name":"Task"}, "description": description}}
        r = requests.post(url, headers={**self._hdr(),"Content-Type":"application/json"}, json=payload)
        r.raise_for_status()
        return r.json()

    def create_confluence_page(self, wiki_id: str, space_id: str, title: str, html_body: str, parent_id: str|None):
        url = f"https://api.atlassian.com/ex/confluence/{wiki_id}/wiki/api/v2/pages"
        payload = {
            "title": title,
            "spaceId": space_id,
            "body": {"representation": "storage", "value": html_body}
        }
        if parent_id:
            payload["parentId"] = parent_id
        r = requests.post(url, headers={**self._hdr(),"Content-Type":"application/json"}, json=payload)
        r.raise_for_status()
        return r.json()

def exchange_code_for_tokens(code: str):
    data = {
        "grant_type": "authorization_code",
        "client_id": os.getenv("ATL_CLIENT_ID"),
        "client_secret": os.getenv("ATL_CLIENT_SECRET"),
        "code": code,
        "redirect_uri": os.getenv("ATL_REDIRECT_URI")
    }
    r = requests.post(ATL_TOKEN_URL, json=data)
    r.raise_for_status()
    tok = r.json()
    r2 = requests.get(ATL_ACCESSIBLE_RES, headers={"Authorization": f"Bearer {tok['access_token']}"})
    r2.raise_for_status()
    resources = r2.json()
    tok["resources"] = resources
    return tok

def refresh_tokens(refresh_token: str):
    data = {
        "grant_type": "refresh_token",
        "client_id": os.getenv("ATL_CLIENT_ID"),
        "client_secret": os.getenv("ATL_CLIENT_SECRET"),
        "refresh_token": refresh_token,
    }
    r = requests.post(ATL_TOKEN_URL, json=data)
    r.raise_for_status()
    return r.json()


def get_space_id_by_key(access_token: str, wiki_id: str, key: str):
    """Resolve Confluence space KEY -> spaceId using v2."
    """
    url = f"https://api.atlassian.com/ex/confluence/{wiki_id}/wiki/api/v2/spaces"
    r = requests.get(url, headers={"Authorization": f"Bearer {access_token}", "Accept":"application/json"}, params={"keys": key})
    r.raise_for_status()
    data = r.json()
    items = data.get("results") or data.get("data") or []
    if items:
        # v2 returns items with 'id' field
        return items[0].get("id")
    return None

def upload_attachment_v1(access_token: str, wiki_id: str, page_id: str, filename: str, filebytes: bytes):
    """Use v1 endpoint for attachments (multipart)."""
    url = f"https://api.atlassian.com/ex/confluence/{wiki_id}/rest/api/content/{page_id}/child/attachment"
    files = {
        'file': (filename, filebytes, 'application/octet-stream')
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Atlassian-Token": "no-check"
    }
    r = requests.post(url, headers=headers, files=files)
    r.raise_for_status()
    return r.json()


def find_page_by_title(access_token: str, wiki_id: str, space_id: str, title: str):
    """Find a Confluence page by exact title within a space (v2)."""
    url = f"https://api.atlassian.com/ex/confluence/{wiki_id}/wiki/api/v2/pages"
    params = {"spaceId": space_id, "title": title}
    r = requests.get(url, headers={"Authorization": f"Bearer {access_token}", "Accept":"application/json"}, params=params)
    r.raise_for_status()
    data = r.json()
    items = data.get("results") or data.get("data") or []
    return items[0] if items else None
