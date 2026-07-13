"""
main.py
-------
FastAPI application entry point.

Startup sequence
────────────────
1. init_db()            — create SQLite tables if they don't exist
2. makedirs(temp_dir)   — ensure download staging dir exists
3. _cleanup_scheduler   — asyncio background task (runs every 30 min)
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import init_db
from api.routes import info, download, queue, history, settings as settings_router
from utils.cleanup import cleanup_expired
from services.queue_manager import queue_manager

logger = logging.getLogger("ytdl.main")

# ──────────────────────────────────────────────────────────────────────────────
# Periodic cleanup scheduler
# ──────────────────────────────────────────────────────────────────────────────

_CLEANUP_INTERVAL_SECONDS = 30 * 60   # run every 30 minutes
_CLEANUP_MAX_AGE_SECONDS   = 60 * 60  # delete folders older than 1 hour
_CLEANUP_STARTUP_DELAY     = 60       # wait 60 s after startup before first sweep


async def _cleanup_scheduler() -> None:
    """
    Asyncio background task that periodically scans the temp directory and
    removes stale download folders.

    Rules enforced by cleanup_expired():
      • Never deletes folders that belong to active (downloading/paused) tasks.
      • Never deletes folders younger than _CLEANUP_MAX_AGE_SECONDS.
      • All errors are caught inside cleanup_expired — this loop never crashes.
    """
    # Give the server a moment to fully start before the first sweep
    await asyncio.sleep(_CLEANUP_STARTUP_DELAY)

    while True:
        try:
            active_ids = queue_manager.get_active_task_ids()
            cleanup_expired(
                temp_dir=settings.temp_dir,
                active_task_ids=active_ids,
                max_age_seconds=_CLEANUP_MAX_AGE_SECONDS,
            )
        except Exception:
            # Belt-and-suspenders: cleanup_expired already swallows exceptions,
            # but we catch here too so the scheduler loop can never die.
            logger.exception("[Cleanup] Scheduler encountered an unexpected error")

        await asyncio.sleep(_CLEANUP_INTERVAL_SECONDS)


# ──────────────────────────────────────────────────────────────────────────────
# Application lifespan
# ──────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown logic."""
    # Initialise database tables
    init_db()

    # Ensure temp staging directory exists
    os.makedirs(settings.temp_dir, exist_ok=True)

    # Start the periodic cleanup background task
    scheduler = asyncio.create_task(_cleanup_scheduler())
    logger.info(
        "[Cleanup] Scheduler started — interval: %d min, max age: %d min",
        _CLEANUP_INTERVAL_SECONDS // 60,
        _CLEANUP_MAX_AGE_SECONDS // 60,
    )

    yield  # ← server is running

    # Gracefully cancel the scheduler on shutdown
    scheduler.cancel()
    try:
        await scheduler
    except asyncio.CancelledError:
        logger.info("[Cleanup] Scheduler stopped.")


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI application
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="YouTube Downloader v2 REST API",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(info.router)
app.include_router(download.router)
app.include_router(queue.router)
app.include_router(history.router)
app.include_router(settings_router.router)

from core.config import settings

print("=" * 60)
print(settings.cors_origins)
print("=" * 60)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.app_version}
