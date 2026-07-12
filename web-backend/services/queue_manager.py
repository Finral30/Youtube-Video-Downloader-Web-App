"""
services/queue_manager.py
--------------------------
In-memory download queue with thread-pool execution.
Controls max concurrent downloads and task lifecycle.
"""

from __future__ import annotations

import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Dict, List, Optional

from core.models import DownloadFormat, DownloadProgress, DownloadStatus
from services.downloader import DownloadTask


class QueueManager:
    """Singleton-style manager that owns all DownloadTask instances."""

    def __init__(self, max_workers: int = 3) -> None:
        self._tasks: Dict[str, DownloadTask] = {}
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=max_workers)

        # Callbacks
        self._on_complete_cb: Optional[Callable[[DownloadTask, str], None]] = None
        self._on_error_cb: Optional[Callable[[DownloadTask, str], None]] = None

    # ------------------------------------------------------------------
    # Callback registration
    # ------------------------------------------------------------------

    def on_complete(self, cb: Callable[[DownloadTask, str], None]) -> None:
        self._on_complete_cb = cb

    def on_error(self, cb: Callable[[DownloadTask, str], None]) -> None:
        self._on_error_cb = cb

    # ------------------------------------------------------------------
    # Task management
    # ------------------------------------------------------------------

    def enqueue(
        self,
        url: str,
        fmt: DownloadFormat,
        quality: str,
        bitrate: str,
        title: str = "",
        thumbnail: Optional[str] = None,
    ) -> DownloadTask:
        """Create a new task, add to queue, and start downloading."""
        task = DownloadTask(url=url, fmt=fmt, quality=quality, bitrate=bitrate)
        task.progress.title = title
        task.progress.thumbnail = thumbnail

        with self._lock:
            self._tasks[task.task_id] = task

        # Submit to thread pool
        self._executor.submit(
            task.run,
            on_complete=self._on_complete_cb,
            on_error=self._on_error_cb,
        )
        return task

    def get_task(self, task_id: str) -> Optional[DownloadTask]:
        return self._tasks.get(task_id)

    def pause(self, task_id: str) -> bool:
        task = self.get_task(task_id)
        if task:
            task.pause()
            return True
        return False

    def resume(self, task_id: str) -> bool:
        task = self.get_task(task_id)
        if task:
            task.resume()
            return True
        return False

    def cancel(self, task_id: str) -> bool:
        task = self.get_task(task_id)
        if task:
            task.cancel()
            return True
        return False

    def remove(self, task_id: str) -> bool:
        task = self.get_task(task_id)
        if task:
            if not task.is_done:
                task.cancel()
            with self._lock:
                self._tasks.pop(task_id, None)
            return True
        return False

    def get_all_progress(self) -> List[DownloadProgress]:
        with self._lock:
            return [t.progress for t in self._tasks.values()]

    def get_active_queue(self) -> List[DownloadProgress]:
        """Return tasks that are not yet completed/cancelled/failed."""
        with self._lock:
            return [
                t.progress
                for t in self._tasks.values()
                if t.progress.status not in (
                    DownloadStatus.COMPLETED,
                    DownloadStatus.CANCELLED,
                    DownloadStatus.FAILED,
                )
            ]

    def cleanup_done(self) -> None:
        """Remove completed/failed/cancelled tasks from memory."""
        with self._lock:
            done_ids = [
                tid for tid, t in self._tasks.items() if t.is_done
            ]
            for tid in done_ids:
                self._tasks.pop(tid, None)


# Global singleton
queue_manager = QueueManager(max_workers=3)
