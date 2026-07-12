"""
services/history_service.py
----------------------------
CRUD operations for download history stored in SQLite.
"""

from __future__ import annotations

import time
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from core.database import HistoryRecord
from core.models import HistoryEntry


def add_history(
    db: Session,
    task_id: str,
    title: str,
    url: str,
    thumbnail: Optional[str],
    fmt: str,
    quality: str,
    file_size: Optional[int],
    status: str = "completed",
) -> HistoryRecord:
    record = HistoryRecord(
        task_id=task_id,
        title=title,
        url=url,
        thumbnail=thumbnail,
        format=fmt,
        quality=quality,
        file_size=file_size,
        completed_at=time.time(),
        status=status,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_history(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
) -> Tuple[List[HistoryEntry], int]:
    query = db.query(HistoryRecord)
    if search:
        query = query.filter(HistoryRecord.title.ilike(f"%{search}%"))
    total = query.count()
    records = (
        query.order_by(HistoryRecord.completed_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    entries = [
        HistoryEntry(
            id=r.id,
            task_id=r.task_id,
            title=r.title,
            url=r.url,
            thumbnail=r.thumbnail,
            format=r.format,
            quality=r.quality,
            file_size=r.file_size,
            completed_at=r.completed_at,
            status=r.status,
        )
        for r in records
    ]
    return entries, total


def delete_history_entry(db: Session, entry_id: int) -> bool:
    record = db.query(HistoryRecord).filter(HistoryRecord.id == entry_id).first()
    if record:
        db.delete(record)
        db.commit()
        return True
    return False


def clear_all_history(db: Session) -> int:
    count = db.query(HistoryRecord).count()
    db.query(HistoryRecord).delete()
    db.commit()
    return count
