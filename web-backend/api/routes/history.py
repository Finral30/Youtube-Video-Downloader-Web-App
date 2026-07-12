"""
api/routes/history.py
---------------------
Download history endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from core.database import get_db_dep
from core.models import HistoryListResponse, MessageResponse, StartDownloadRequest
from services.history_service import (
    add_history,
    clear_all_history,
    delete_history_entry,
    get_history,
)
from services.queue_manager import queue_manager
from core.models import DownloadFormat

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=HistoryListResponse)
async def list_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db_dep),
):
    items, total = get_history(db, page=page, page_size=page_size, search=search)
    return HistoryListResponse(items=items, total=total, page=page, page_size=page_size)


@router.delete("/{entry_id}", response_model=MessageResponse)
async def delete_entry(entry_id: int, db: Session = Depends(get_db_dep)):
    if delete_history_entry(db, entry_id):
        return MessageResponse(message="History entry deleted")
    raise HTTPException(404, "Entry not found")


@router.delete("", response_model=MessageResponse)
async def clear_history(db: Session = Depends(get_db_dep)):
    count = clear_all_history(db)
    return MessageResponse(message=f"Cleared {count} history entries")


@router.post("/{entry_id}/redownload", response_model=MessageResponse)
async def redownload(entry_id: int, db: Session = Depends(get_db_dep)):
    """Re-queue a download from history."""
    from core.database import HistoryRecord
    record = db.query(HistoryRecord).filter(HistoryRecord.id == entry_id).first()
    if not record:
        raise HTTPException(404, "History entry not found")

    task = queue_manager.enqueue(
        url=record.url,
        fmt=DownloadFormat(record.format),
        quality=record.quality,
        bitrate="192",
    )
    return MessageResponse(message="Download re-queued", data={"task_id": task.task_id})
