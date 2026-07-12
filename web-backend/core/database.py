"""
core/database.py
----------------
SQLite database setup using SQLAlchemy (sync engine for simplicity).
Tables: download_history, app_settings
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, Text
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from contextlib import contextmanager
import json

from core.config import settings


engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # SQLite: allow multi-thread
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# ORM Models
# ---------------------------------------------------------------------------

class HistoryRecord(Base):
    __tablename__ = "download_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(512), nullable=False)
    url = Column(Text, nullable=False)
    thumbnail = Column(Text, nullable=True)
    format = Column(String(16), nullable=False)
    quality = Column(String(16), nullable=False)
    file_size = Column(Integer, nullable=True)
    completed_at = Column(Float, nullable=False)
    status = Column(String(32), nullable=False, default="completed")


class SettingsRecord(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, default=1)
    data = Column(Text, nullable=False, default="{}")  # JSON blob


# ---------------------------------------------------------------------------
# Init & helpers
# ---------------------------------------------------------------------------

def init_db() -> None:
    """Create all tables on startup."""
    Base.metadata.create_all(bind=engine)
    # Ensure a default settings row exists
    with get_db() as db:
        row = db.query(SettingsRecord).filter(SettingsRecord.id == 1).first()
        if not row:
            db.add(SettingsRecord(id=1, data="{}"))
            db.commit()


@contextmanager
def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_dep():
    """FastAPI dependency."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
