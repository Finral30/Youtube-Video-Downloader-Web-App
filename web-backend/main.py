"""
main.py
-------
FastAPI application entry point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import init_db
from api.routes import info, download, queue, history, settings as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown logic."""
    init_db()
    import os
    os.makedirs(settings.temp_dir, exist_ok=True)
    yield
    # Cleanup on shutdown (optional)


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


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.app_version}
