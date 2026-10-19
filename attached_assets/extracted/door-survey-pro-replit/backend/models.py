from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    connections = relationship("Connection", back_populates="user")
    projects = relationship("Project", back_populates="user")

class Connection(Base):
    __tablename__ = "connections"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    provider = Column(String, index=True)
    access_token = Column(Text)
    refresh_token = Column(Text)
    expires_at = Column(DateTime, nullable=True)
    scopes = Column(Text)
    account_id = Column(String, nullable=True)
    extra = Column(Text)  # JSON: resources, watch/subscription ids, sync tokens
    user = relationship("User", back_populates="connections")
    __table_args__ = (UniqueConstraint('user_id','provider', name='uix_user_provider'),)

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True)
    location = Column(String)
    status = Column(String, default="active")
    ext_provider = Column(String, nullable=True)  # 'jira'
    ext_project_key = Column(String, nullable=True)
    ext_project_id = Column(String, nullable=True)
    default_calendar_provider = Column(String, nullable=True)  # 'google'|'microsoft'
    default_calendar_id = Column(String, nullable=True)
    user = relationship("User", back_populates="projects")
    issues = relationship("Issue", back_populates="project")
    events = relationship("Event", back_populates="project")
    docs = relationship("Doc", back_populates="project")

class Issue(Base):
    __tablename__ = "issues"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String)
    status = Column(String)
    priority = Column(String)
    ext_issue_key = Column(String, index=True)
    ext_issue_id = Column(String, index=True)
    ext_url = Column(String)
    provider = Column(String, default='jira')
    last_synced_at = Column(DateTime)
    project = relationship("Project", back_populates="issues")
    __table_args__ = (UniqueConstraint('provider','ext_issue_id', name='uix_issue_provider_id'),)

class Doc(Base):
    __tablename__ = "docs"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String)
    type = Column(String)  # 'confluence'
    ext_page_id = Column(String, index=True)
    ext_url = Column(String)
    provider = Column(String, default='confluence')
    last_synced_at = Column(DateTime)
    project = relationship("Project", back_populates="docs")

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    summary = Column(String)
    location = Column(String)
    description = Column(Text)
    start_ts = Column(DateTime)
    end_ts = Column(DateTime)
    provider = Column(String)  # 'google'|'microsoft'
    calendar_id = Column(String)
    ext_event_id = Column(String, index=True)
    last_synced_at = Column(DateTime)
    source_external = Column(Boolean, default=False)  # true if edited externally
    project = relationship("Project", back_populates="events")
    __table_args__ = (UniqueConstraint('provider','calendar_id','ext_event_id', name='uix_event_provider_id'),)


class GithubInstall(Base):
    __tablename__ = "github_installs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    installation_id = Column(Integer, index=True, nullable=False)
    default_owner = Column(String, nullable=True)
    default_repo  = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
