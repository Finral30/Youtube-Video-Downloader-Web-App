"""
api/routes/info.py
------------------
GET video and playlist metadata without downloading.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.models import PlaylistInfo, VideoInfo
from services.info_service import get_playlist_info, get_video_info

router = APIRouter(prefix="/api/info", tags=["info"])


class InfoRequest(BaseModel):
    url: str


@router.post("/video", response_model=VideoInfo)
async def video_info(req: InfoRequest):
    """Fetch metadata and available formats for a YouTube video URL."""
    try:
        return get_video_info(req.url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/playlist", response_model=PlaylistInfo)
async def playlist_info(req: InfoRequest):
    """Fetch metadata and video list for a YouTube playlist URL."""
    try:
        return get_playlist_info(req.url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
