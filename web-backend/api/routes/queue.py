"""
api/routes/queue.py
-------------------
Queue inspection and management endpoints.
"""

from fastapi import APIRouter, HTTPException
from typing import List

from core.models import DownloadProgress, MessageResponse
from services.queue_manager import queue_manager

router = APIRouter(prefix="/api/queue", tags=["queue"])


@router.get("", response_model=List[DownloadProgress])
async def get_queue():
    """Return all active (non-finished) queue items."""
    return queue_manager.get_active_queue()


@router.get("/all", response_model=List[DownloadProgress])
async def get_all():
    """Return ALL task progress records including completed/failed."""
    return queue_manager.get_all_progress()


@router.delete("/{task_id}", response_model=MessageResponse)
async def remove_from_queue(task_id: str):
    """Cancel and remove a task from the queue."""
    if queue_manager.remove(task_id):
        return MessageResponse(message="Task removed from queue")
    raise HTTPException(404, "Task not found")


@router.post("/cleanup", response_model=MessageResponse)
async def cleanup_queue():
    """Remove all completed/failed/cancelled tasks from memory."""
    queue_manager.cleanup_done()
    return MessageResponse(message="Completed tasks cleared")
