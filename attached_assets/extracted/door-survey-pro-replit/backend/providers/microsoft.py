import os, requests

MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
MS_EVENTS_URL = "https://graph.microsoft.com/v1.0/me/events"

class MicrosoftClient:
    def __init__(self, access_token: str):
        self.access_token = access_token

    def _hdr(self):
        return {"Authorization": f"Bearer {self.access_token}", "Content-Type":"application/json"}

    def create_event(self, summary: str, start_iso: str, end_iso: str, location: str|None, description: str|None):
        payload = {
            "subject": summary,
            "body": {"contentType": "HTML", "content": description or ""},
            "start": {"dateTime": start_iso, "timeZone": "UTC"},
            "end":   {"dateTime": end_iso,   "timeZone": "UTC"},
            "location": {"displayName": location or ""}
        }
        r = requests.post(MS_EVENTS_URL, headers=self._hdr(), json=payload)
        r.raise_for_status()
        return r.json()

def exchange_code_for_tokens(code: str):
    data = {
        "client_id": os.getenv("MS_CLIENT_ID"),
        "client_secret": os.getenv("MS_CLIENT_SECRET"),
        "code": code,
        "redirect_uri": os.getenv("MS_REDIRECT_URI"),
        "grant_type": "authorization_code"
    }
    r = requests.post(MS_TOKEN_URL, data=data)
    r.raise_for_status()
    return r.json()

def refresh_tokens(refresh_token: str):
    data = {
        "client_id": os.getenv("MS_CLIENT_ID"),
        "client_secret": os.getenv("MS_CLIENT_SECRET"),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
        "redirect_uri": os.getenv("MS_REDIRECT_URI"),
    }
    r = requests.post(MS_TOKEN_URL, data=data)
    r.raise_for_status()
    return r.json()
