"""
core/config.py
--------------
Centralised settings using pydantic-settings.
Values are read from environment variables or a .env file.

Production env vars (set in Railway dashboard):
  CORS_ORIGINS  - comma-separated list of allowed origins
                  e.g. "https://your-app.vercel.app,https://custom-domain.com"
  COOKIES_FILE  - path to cookies.txt (optional)
  FFMPEG_PATH   - override ffmpeg binary path (optional)
"""

import os
import platform
from pathlib import Path
from typing import Union
from pydantic_settings import BaseSettings, SettingsConfigDict


def _resolve_ffmpeg() -> str:
    """Locate ffmpeg: project root → common Linux paths → system PATH."""
    candidates = []
    if platform.system() == "Windows":
        project_root = Path(__file__).parent.parent.parent
        candidates = [project_root / "ffmpeg.exe"]
    else:
        candidates = [
            Path("/usr/bin/ffmpeg"),
            Path("/usr/local/bin/ffmpeg"),
            Path("/app/ffmpeg"),
        ]
    for c in candidates:
        if c.is_file():
            return str(c)
    return "ffmpeg"  # rely on PATH (Docker image has it via apt)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # API
    app_name: str = "YouTube Downloader v2"
    app_version: str = "2.0.0"

    # CORS — accepts a JSON list OR a comma-separated string from env
    # Examples:
    #   .env:      CORS_ORIGINS=["https://x.vercel.app","http://localhost:5173"]
    #   Railway:   CORS_ORIGINS=https://x.vercel.app,http://localhost:5173
    cors_origins: Union[list[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # Database
    database_url: str = "sqlite:///./ytdl.db"

    # Temp download directory (server-side staging area)
    temp_dir: str = str(Path(__file__).parent.parent / "temp")

    # FFmpeg
    ffmpeg_path: str = ""

    # Optional cookies file for authenticated downloads
    cookies_file: str = ""

    def model_post_init(self, __context) -> None:
        # Resolve CORS: if env var was a comma-separated string, split it
        origins = self.cors_origins
        if isinstance(origins, str):
            parsed = [o.strip() for o in origins.split(",") if o.strip()]
            object.__setattr__(self, "cors_origins", parsed)

        # Resolve FFmpeg path
        if not self.ffmpeg_path:
            object.__setattr__(self, "ffmpeg_path", _resolve_ffmpeg())


settings = Settings()
