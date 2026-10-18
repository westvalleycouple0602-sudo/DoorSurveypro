from sqlalchemy.orm import Session
from datetime import datetime
from .models import Issue, Event, Doc

def upsert_issue(db: Session, project_id: int, provider: str, ext_issue_id: str, ext_issue_key: str|None, title: str, status: str|None, priority: str|None, ext_url: str|None):
    row = db.query(Issue).filter_by(provider=provider, ext_issue_id=ext_issue_id).first()
    if not row:
        row = Issue(project_id=project_id, provider=provider, ext_issue_id=ext_issue_id)
    row.ext_issue_key = ext_issue_key
    row.title = title
    row.status = status
    row.priority = priority
    row.ext_url = ext_url
    row.last_synced_at = datetime.utcnow()
    db.add(row); db.commit(); db.refresh(row)
    return row

def upsert_event(db: Session, project_id: int, provider: str, calendar_id: str, ext_event_id: str, summary: str, start_ts, end_ts, location: str|None, description: str|None, source_external: bool=False):
    row = db.query(Event).filter_by(provider=provider, calendar_id=calendar_id, ext_event_id=ext_event_id).first()
    if not row:
        row = Event(project_id=project_id, provider=provider, calendar_id=calendar_id, ext_event_id=ext_event_id)
    row.summary = summary
    row.start_ts = start_ts
    row.end_ts = end_ts
    row.location = location
    row.description = description
    row.last_synced_at = datetime.utcnow()
    row.source_external = source_external
    db.add(row); db.commit(); db.refresh(row)
    return row
