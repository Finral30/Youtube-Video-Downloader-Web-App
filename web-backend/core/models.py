"""
core/models.py
--------------
All Pydantic schemas and shared TypedDicts used across the API.
"""

from __future__ import annotations
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field
import time


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class DownloadFormat(str, Enum):
    VIDEO = "video"
    AUDIO = "audio"


class DownloadStatus(str, Enum):
    QUEUED = "queued"
    FETCHING_INFO = "fetching_info"
    DOWNLOADING = "downloading"
    MERGING = "merging"
    CONVERTING = "converting"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    FAILED = "failed"


class VideoQuality(str, Enum):
    Q_144 = "144"
    Q_240 = "240"
    Q_360 = "360"
    Q_480 = "480"
    Q_720 = "720"
    Q_1080 = "1080"
    Q_1440 = "1440"
    Q_2160 = "2160"
    BEST = "best"


class AudioBitrate(str, Enum):
    B_64 = "64"
    B_96 = "96"
    B_128 = "128"
    B_192 = "192"
    B_256 = "256"
    B_320 = "320"


# ---------------------------------------------------------------------------
# Video / Playlist Info Schemas
# ---------------------------------------------------------------------------

class FormatInfo(BaseModel):
    format_id: str
    ext: str
    quality: str
    resolution: Optional[str] = None
    filesize: Optional[int] = None
    vcodec: Optional[str] = None
    acodec: Optional[str] = None
    fps: Optional[float] = None
    tbr: Optional[float] = None  # total bitrate


class VideoInfo(BaseModel):
    id: str
    url: str
    title: str
    channel: str
    duration: int  # seconds
    thumbnail: str
    view_count: Optional[int] = None
    upload_date: Optional[str] = None
    description: Optional[str] = None
    formats: list[FormatInfo] = []
    is_live: bool = False


class PlaylistVideoItem(BaseModel):
    index: int
    id: str
    url: str
    title: str
    duration: Optional[int] = None
    thumbnail: Optional[str] = None
    channel: Optional[str] = None


class PlaylistInfo(BaseModel):
    id: str
    url: str
    title: str
    channel: Optional[str] = None
    video_count: int
    videos: list[PlaylistVideoItem] = []


# ---------------------------------------------------------------------------
# Download Request / Response Schemas
# ---------------------------------------------------------------------------

class StartDownloadRequest(BaseModel):
    url: str
    format: DownloadFormat = DownloadFormat.VIDEO
    quality: str = "best"          # resolution height as string or "best"
    bitrate: str = "192"           # kbps string (audio only)
    video_ids: Optional[list[str]] = None  # playlist: specific video IDs to download


class DownloadProgress(BaseModel):
    task_id: str
    status: DownloadStatus
    title: str = ""
    thumbnail: Optional[str] = None
    url: str = ""
    format: DownloadFormat = DownloadFormat.VIDEO
    quality: str = ""

    # Byte-level progress
    downloaded_bytes: int = 0
    total_bytes: int = 0
    percent: float = 0.0

    # Speed / ETA
    speed: float = 0.0            # bytes/sec
    eta: Optional[int] = None     # seconds remaining

    # Playlist
    playlist_index: int = 0
    playlist_total: int = 0

    # Timestamps
    started_at: float = Field(default_factory=time.time)
    completed_at: Optional[float] = None

    error: Optional[str] = None
    file_path: Optional[str] = None


# ---------------------------------------------------------------------------
# History Schemas
# ---------------------------------------------------------------------------

class HistoryEntry(BaseModel):
    id: int
    task_id: str
    title: str
    url: str
    thumbnail: Optional[str] = None
    format: str
    quality: str
    file_size: Optional[int] = None
    completed_at: float
    status: str


class HistoryListResponse(BaseModel):
    items: list[HistoryEntry]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# Settings Schemas
# ---------------------------------------------------------------------------

class AppSettings(BaseModel):
    default_quality: str = "best"
    default_format: DownloadFormat = DownloadFormat.VIDEO
    default_bitrate: str = "192"
    theme: str = "dark"           # "dark" | "light" | "amoled"
    language: str = "en"
    max_concurrent_downloads: int = 3
    auto_download_thumbnail: bool = True


# ---------------------------------------------------------------------------
# Generic response
# ---------------------------------------------------------------------------

class MessageResponse(BaseModel):
    message: str
    success: bool = True
    data: Optional[Any] = None
