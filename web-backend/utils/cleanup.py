"""
utils/cleanup.py
----------------
Reusable disk-cleanup utilities for the download temp directory.

Two cleanup modes
─────────────────
1. cleanup_download(task_id, temp_dir)
   Called via FastAPI BackgroundTask immediately after FileResponse
   finishes streaming to the browser. Deletes the entire task folder.

2. cleanup_expired(temp_dir, active_task_ids, max_age_seconds)
   Called by the periodic scheduler in main.py every 30 minutes.
   Deletes task folders that are older than max_age_seconds AND do
   not belong to any active (downloading / paused) task.

Design principles
─────────────────
• Never raises an exception — all errors are caught and logged.
• Never blocks I/O — called from a background thread / asyncio task.
• Cross-platform — works on Windows and Linux (uses pathlib + shutil).
• Idempotent — safe to call even if folder is already gone.
"""

import logging
import shutil
import time
from pathlib import Path
from typing import Set

logger = logging.getLogger("ytdl.cleanup")

# ──────────────────────────────────────────────────────────────────────────────
# Post-download cleanup  (triggered by BackgroundTask)
# ──────────────────────────────────────────────────────────────────────────────

def cleanup_download(task_id: str, temp_dir: str) -> None:
    """
    Delete temp/<task_id>/ and all its contents after the file has been
    fully served to the browser.

    Called as a FastAPI BackgroundTask so it only runs *after* FileResponse
    finishes streaming — the client always receives a complete file.

    Parameters
    ----------
    task_id  : UUID string that identifies the download task.
    temp_dir : Absolute path to the root temp directory (from settings).

    Flow
    ----
    serve_file endpoint returns FileResponse
        ↓  (streaming completes)
    BackgroundTask calls cleanup_download(task_id, temp_dir)
        ↓
    temp/<task_id>/ deleted completely
    """
    folder = Path(temp_dir) / task_id

    if not folder.exists():
        logger.debug("[Cleanup] Folder already gone: temp/%s/", task_id)
        return

    try:
        shutil.rmtree(folder, ignore_errors=True)

        if not folder.exists():
            logger.info("[Cleanup] Deleted temp/%s/", task_id)
        else:
            # ignore_errors=True silenced an error; warn but do not raise
            logger.warning(
                "[Cleanup] Partial deletion — temp/%s/ may still contain files",
                task_id,
            )

    except Exception:
        # Must never propagate — we are running as a background task
        logger.exception("[Cleanup] Unexpected error deleting temp/%s/", task_id)


# ──────────────────────────────────────────────────────────────────────────────
# Periodic expired-temp cleanup  (triggered by scheduler every 30 min)
# ──────────────────────────────────────────────────────────────────────────────

def cleanup_expired(
    temp_dir: str,
    active_task_ids: Set[str],
    max_age_seconds: int = 3600,
) -> None:
    """
    Scan temp_dir and delete any task folder that is:
      • Older than max_age_seconds (default: 1 hour), AND
      • NOT in active_task_ids (i.e., not currently downloading/paused).

    This handles the edge case where a download completes but the user
    never clicks the "Download" button to fetch the file — the temp
    folder would otherwise linger forever.

    Parameters
    ----------
    temp_dir        : Absolute path to the root temp directory.
    active_task_ids : Set of task_id strings for tasks that must NOT be touched.
    max_age_seconds : Folders older than this are eligible for deletion.

    Safety guarantees
    -----------------
    • Folders in active_task_ids are ALWAYS skipped.
    • Folders younger than max_age_seconds are ALWAYS skipped.
    • Exceptions per-folder are caught so one failure cannot stop the sweep.
    """
    root = Path(temp_dir)
    if not root.exists():
        logger.debug("[Cleanup] Temp dir does not exist yet, skipping sweep.")
        return

    now = time.time()
    deleted = 0
    skipped_active = 0
    skipped_recent = 0

    # Collect entries once so we work on a stable snapshot
    try:
        entries = [e for e in root.iterdir() if e.is_dir()]
    except OSError:
        logger.exception("[Cleanup] Cannot read temp dir: %s", temp_dir)
        return

    for entry in entries:
        task_id = entry.name

        # ── Rule 1: never touch active tasks ─────────────────────────────────
        if task_id in active_task_ids:
            skipped_active += 1
            logger.debug("[Cleanup] Skipping active task: temp/%s/", task_id)
            continue

        # ── Rule 2: check folder age via modification time (cross-platform) ───
        try:
            folder_mtime = entry.stat().st_mtime
        except OSError:
            logger.warning("[Cleanup] Cannot stat temp/%s/, skipping.", task_id)
            continue

        age_seconds = now - folder_mtime
        if age_seconds < max_age_seconds:
            skipped_recent += 1
            logger.debug(
                "[Cleanup] Skipping recent folder: temp/%s/ (age: %.0fs)",
                task_id,
                age_seconds,
            )
            continue

        # ── Safe to delete ────────────────────────────────────────────────────
        try:
            shutil.rmtree(entry, ignore_errors=True)
            logger.info(
                "[Cleanup] Deleted expired folder: temp/%s/ (age: %.0f min)",
                task_id,
                age_seconds / 60,
            )
            deleted += 1
        except Exception:
            logger.exception(
                "[Cleanup] Failed to delete expired folder: temp/%s/",
                task_id,
            )

    logger.info(
        "[Cleanup] Sweep complete — deleted: %d  |  active (skipped): %d  |  recent (skipped): %d",
        deleted,
        skipped_active,
        skipped_recent,
    )
