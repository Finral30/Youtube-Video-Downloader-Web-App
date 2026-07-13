"""
api/routes/download.py
----------------------
Download lifecycle endpoints:
  POST   /api/download/start
  POST   /api/download/{task_id}/pause
  POST   /api/download/{task_id}/resume
  POST   /api/download/{task_id}/cancel
  GET    /api/download/{task_id}/progress  (SSE)
  GET    /api/download/{task_id}/file      (serve finished file)
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from sse_starlette.sse import EventSourceResponse

from core.config import settings
from core.models import (
    DownloadFormat,
    DownloadProgress,
    DownloadStatus,
    MessageResponse,
    StartDownloadRequest,
)
from services.queue_manager import queue_manager
from core.database import get_db
from services.history_service import add_history
from utils.cleanup import cleanup_download

router = APIRouter(prefix="/api/download", tags=["download"])


# ------------------------------------------------------------------
# Start
# ------------------------------------------------------------------

@router.post("/start", response_model=DownloadProgress)
async def start_download(req: StartDownloadRequest, background_tasks: BackgroundTasks):
    """Enqueue a new download task and begin downloading immediately."""
    task = queue_manager.enqueue(
        url=req.url,
        fmt=req.format,
        quality=req.quality,
        bitrate=req.bitrate,
    )
    return task.progress


# ------------------------------------------------------------------
# Control
# ------------------------------------------------------------------

@router.post("/{task_id}/pause", response_model=MessageResponse)
async def pause_download(task_id: str):
    if queue_manager.pause(task_id):
        return MessageResponse(message="Download paused", success=True)
    raise HTTPException(404, "Task not found")


@router.post("/{task_id}/resume", response_model=MessageResponse)
async def resume_download(task_id: str):
    if queue_manager.resume(task_id):
        return MessageResponse(message="Download resumed", success=True)
    raise HTTPException(404, "Task not found")


@router.post("/{task_id}/cancel", response_model=MessageResponse)
async def cancel_download(task_id: str):
    if queue_manager.cancel(task_id):
        return MessageResponse(message="Download cancelled", success=True)
    raise HTTPException(404, "Task not found")


# ------------------------------------------------------------------
# SSE Progress stream
# ------------------------------------------------------------------

@router.get("/{task_id}/progress")
async def progress_stream(task_id: str):
    """Server-Sent Events stream for real-time download progress."""

    async def event_generator() -> AsyncGenerator[dict, None]:
        while True:
            task = queue_manager.get_task(task_id)
            if task is None:
                yield {"data": json.dumps({"error": "Task not found"})}
                break

            data = task.progress.model_dump()
            data["status"] = task.progress.status.value
            data["format"] = task.progress.format.value
            yield {"data": json.dumps(data)}

            if task.is_done:
                # Persist to history on completion
                if task.progress.status == DownloadStatus.COMPLETED:
                    try:
                        with get_db() as db:
                            file_size = None
                            if task.progress.file_path and os.path.isfile(task.progress.file_path):
                                file_size = os.path.getsize(task.progress.file_path)
                            add_history(
                                db=db,
                                task_id=task.task_id,
                                title=task.progress.title,
                                url=task.progress.url,
                                thumbnail=task.progress.thumbnail,
                                fmt=task.progress.format.value,
                                quality=task.progress.quality,
                                file_size=file_size,
                            )
                    except Exception:
                        pass
                break

            await asyncio.sleep(0.5)

    return EventSourceResponse(event_generator())


# ------------------------------------------------------------------
# Serve file
# ------------------------------------------------------------------

@router.get("/{task_id}/file")
async def serve_file(task_id: str, background_tasks: BackgroundTasks):
    """Serve the completed download file to the browser.

    A BackgroundTask is registered to delete temp/<task_id>/ only AFTER
    the file has been completely streamed to the client.
    """
    task = queue_manager.get_task(task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if task.progress.status != DownloadStatus.COMPLETED:
        raise HTTPException(409, "Download not yet complete")

    file_path = task.progress.file_path
    if not file_path or not os.path.isfile(file_path):
        raise HTTPException(404, "File not found on server")

    filename = Path(file_path).name

    # Schedule disk cleanup to run after FileResponse finishes streaming.
    # BackgroundTasks guarantees execution only after the full response is sent.
    background_tasks.add_task(cleanup_download, task_id, settings.temp_dir)

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream",
    )
