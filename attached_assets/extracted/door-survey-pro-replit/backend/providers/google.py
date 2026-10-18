import os, requests

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_EVENTS = "https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events"

class GoogleClient:
    def __init__(self, access_token: str):
        self.access_token = access_token

    def _hdr(self):
        return {"Authorization": f"Bearer {self.access_token}", "Content-Type":"application/json"}

    def create_event(self, calendar_id: str, summary: str, start_iso: str, end_iso: str, location: str|None, description: str|None):
        url = GOOGLE_EVENTS.format(calendarId=calendar_id or "primary")
        payload = {
            "summary": summary,
            "location": location,
            "description": description,
            "start": {"dateTime": start_iso},
            "end":   {"dateTime": end_iso}
        }
        r = requests.post(url, headers=self._hdr(), json=payload)
        r.raise_for_status()
        return r.json()

def exchange_code_for_tokens(code: str):
    data = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "code": code,
        "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI"),
        "grant_type": "authorization_code",
        "access_type": "offline"
    }
    r = requests.post(GOOGLE_TOKEN_URL, data=data)
    r.raise_for_status()
    return r.json()

def refresh_tokens(refresh_token: str):
    data = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    r = requests.post(GOOGLE_TOKEN_URL, data=data)
    r.raise_for_status()
    return r.json()
