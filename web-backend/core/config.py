"""
core/config.py
--------------
Centralised settings using pydantic-settings.
Values are read from environment variables or a .env file.

Production env vars (set in HF Spaces / Koyeb / Railway dashboard):
  CORS_ORIGINS  - comma-separated list of allowed frontend origins
                  e.g. "https://your-app.vercel.app"
  DATABASE_URL  - SQLite path (auto-detected based on available dirs)
  TEMP_DIR      - where to stage downloads
  FFMPEG_PATH   - override ffmpeg binary path (optional)
  COOKIES_FILE  - path to cookies.txt for age-restricted videos (optional)
"""

import os
import platform
from pathlib import Path
from typing import Union
from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_ffmpeg() -> str:
    """Locate ffmpeg: Windows project root → common Linux paths → PATH."""
    if platform.system() == "Windows":
        project_root = Path(__file__).parent.parent.parent
        candidate = project_root / "ffmpeg.exe"
        if candidate.is_file():
            return str(candidate)
    else:
        for p in ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/app/ffmpeg"]:
            if Path(p).is_file():
                return p
    return "ffmpeg"  # rely on PATH (Docker image installs via apt)


def _resolve_data_dir() -> Path:
    """
    Detect the best writable data directory:

    Priority:
      1. /data      — Hugging Face Spaces persistent storage (mounted when enabled)
      2. ./data     — local Docker / dev (created in Dockerfile)
      3. /tmp/ytdl  — absolute fallback (ephemeral but always writable)
    """
    candidates = [
        Path("/data"),
        Path(__file__).parent.parent / "data",
        Path("/tmp/ytdl"),
    ]
    for d in candidates:
        try:
            d.mkdir(parents=True, exist_ok=True)
            # Quick write test
            test = d / ".write_test"
            test.touch()
            test.unlink()
            return d
        except OSError:
            continue
    return Path("/tmp/ytdl")


def _resolve_temp_dir() -> Path:
    """
    Detect the best writable temp directory for in-progress downloads.

    Priority:
      1. ./temp  — local Docker / dev (created in Dockerfile)
      2. /tmp/ytdl/temp — absolute fallback
    """
    candidates = [
        Path(__file__).parent.parent / "temp",
        Path("/tmp/ytdl/temp"),
    ]
    for d in candidates:
        try:
            d.mkdir(parents=True, exist_ok=True)
            test = d / ".write_test"
            test.touch()
            test.unlink()
            return d
        except OSError:
            continue
    return Path("/tmp/ytdl/temp")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # API
    app_name: str = "YouTube Downloader v2"
    app_version: str = "2.0.0"

    # CORS — accepts a JSON list OR a comma-separated string from env.
    # HF Spaces:  CORS_ORIGINS=https://your-app.vercel.app
    # Local:      default includes localhost dev servers
    cors_origins: Union[list[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # Database — auto-resolved below if not set via env
    database_url: str = ""

    # Temp directory — auto-resolved below if not set via env
    temp_dir: str = ""

    # FFmpeg — auto-resolved below if not set via env
    ffmpeg_path: str = ""

    # Optional cookies file for authenticated / age-restricted downloads
    cookies_file: str = ""

    def model_post_init(self, __context) -> None:
        # ── CORS ─────────────────────────────────────────────────────────────
        origins = self.cors_origins
        if isinstance(origins, str):
            parsed = [o.strip() for o in origins.split(",") if o.strip()]
            object.__setattr__(self, "cors_origins", parsed)

        # ── Database URL ──────────────────────────────────────────────────────
        if not self.database_url:
            data_dir = _resolve_data_dir()
            db_path = data_dir / "ytdl.db"
            object.__setattr__(self, "database_url", f"sqlite:///{db_path}")

        # ── Temp directory ────────────────────────────────────────────────────
        if not self.temp_dir:
            object.__setattr__(self, "temp_dir", str(_resolve_temp_dir()))

        # ── FFmpeg ────────────────────────────────────────────────────────────
        if not self.ffmpeg_path:
            object.__setattr__(self, "ffmpeg_path", _resolve_ffmpeg())


settings = Settings()
