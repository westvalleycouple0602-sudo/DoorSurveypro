import os, httpx
BASE = os.getenv("JIRA_BASE_URL"); EMAIL = os.getenv("JIRA_EMAIL"); TOKEN = os.getenv("JIRA_API_TOKEN"); PROJECT = os.getenv("JIRA_PROJECT_KEY")
def create_issue(summary: str, description: str):
    if not (BASE and EMAIL and TOKEN and PROJECT): return False, "Jira not configured"
    auth = (EMAIL, TOKEN)
    payload = {"fields": {"project": {"key": PROJECT}, "summary": summary, "issuetype": {"name": "Task"}, "description": description}}
    try:
        r = httpx.post(f"{BASE}/rest/api/3/issue", json=payload, auth=auth, timeout=10)
        return r.status_code in (200,201), r.text
    except Exception as e:
        return False, str(e)
