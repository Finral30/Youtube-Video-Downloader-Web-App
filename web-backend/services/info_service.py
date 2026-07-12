"""
services/info_service.py
-------------------------
Fetch video and playlist metadata using pytubefix (no download).
"""

from __future__ import annotations

from typing import Optional
from pytubefix import YouTube, Playlist

from core.models import FormatInfo, PlaylistInfo, PlaylistVideoItem, VideoInfo


# ---------------------------------------------------------------------------
# Video info
# ---------------------------------------------------------------------------

def get_video_info(url: str) -> VideoInfo:
    """Extract metadata and available streams for a single video."""
    yt = YouTube(url)

    formats: list[FormatInfo] = []
    seen_res: set[str] = set()

    # --- Progressive streams (video + audio, no FFmpeg needed) ---
    for stream in (
        yt.streams.filter(progressive=True, file_extension="mp4")
        .order_by("resolution")
        .desc()
    ):
        if stream.resolution and stream.resolution not in seen_res:
            seen_res.add(stream.resolution)
            try:
                fsize = stream.filesize
            except Exception:
                fsize = None
            formats.append(FormatInfo(
                format_id=str(stream.itag),
                ext="mp4",
                quality=stream.resolution,
                resolution=f"{stream.width}x{stream.height}" if stream.width else None,
                filesize=fsize,
                vcodec=stream.video_codec,
                acodec=stream.audio_codec,
                fps=stream.fps,
            ))

    # --- Adaptive video-only streams (1080p / 1440p / 2160p) ---
    for stream in (
        yt.streams.filter(adaptive=True, only_video=True, file_extension="mp4")
        .order_by("resolution")
        .desc()
    ):
        if stream.resolution and stream.resolution not in seen_res:
            seen_res.add(stream.resolution)
            try:
                fsize = stream.filesize
            except Exception:
                fsize = None
            formats.append(FormatInfo(
                format_id=str(stream.itag),
                ext="mp4",
                quality=stream.resolution,
                resolution=f"{stream.width}x{stream.height}" if stream.width else None,
                filesize=fsize,
                vcodec=stream.video_codec,
                fps=stream.fps,
            ))

    # Sort by resolution descending
    def _res_key(f: FormatInfo) -> int:
        try:
            return int(f.quality.replace("p", ""))
        except ValueError:
            return 0

    formats.sort(key=_res_key, reverse=True)

    # Upload date
    upload_date: Optional[str] = None
    if yt.publish_date:
        upload_date = yt.publish_date.strftime("%Y%m%d")

    return VideoInfo(
        id=yt.video_id,
        url=url,
        title=yt.title or "Unknown",
        channel=yt.author or "Unknown",
        duration=yt.length or 0,
        thumbnail=yt.thumbnail_url or "",
        view_count=yt.views,
        upload_date=upload_date,
        description=(yt.description or "")[:1000],
        formats=formats,
        is_live=False,
    )


# ---------------------------------------------------------------------------
# Playlist info
# ---------------------------------------------------------------------------

def _extract_video_id(video_url: str) -> str:
    """Pull the video ID out of any YouTube URL format."""
    if "v=" in video_url:
        return video_url.split("v=")[-1].split("&")[0]
    if "youtu.be/" in video_url:
        return video_url.split("youtu.be/")[-1].split("?")[0]
    return ""


def get_playlist_info(url: str) -> PlaylistInfo:
    """Extract metadata and video list from a playlist URL.

    We intentionally avoid fetching full YouTube() metadata per video
    (each would require a separate HTTP request) and instead return
    video IDs / thumbnail URLs derived from the playlist page alone.
    Titles are fetched for the first 30 videos to keep latency low.
    """
    pl = Playlist(url)
    video_urls: list[str] = list(pl.video_urls)

    videos: list[PlaylistVideoItem] = []
    for i, video_url in enumerate(video_urls, start=1):
        vid_id = _extract_video_id(video_url)

        # Build absolute URL if necessary
        if not video_url.startswith("http"):
            video_url = f"https://www.youtube.com/watch?v={vid_id}"

        # YouTube's standard thumbnail CDN – no HTTP request needed
        thumbnail = (
            f"https://img.youtube.com/vi/{vid_id}/mqdefault.jpg" if vid_id else None
        )

        # Fetch title only for the first 30 videos to keep the response fast
        title = f"Video {i}"
        if i <= 30 and vid_id:
            try:
                yt = YouTube(f"https://www.youtube.com/watch?v={vid_id}")
                title = yt.title or title
            except Exception:
                pass  # Keep placeholder title on any error

        videos.append(PlaylistVideoItem(
            index=i,
            id=vid_id,
            url=video_url,
            title=title,
            thumbnail=thumbnail,
        ))

    # Playlist-level metadata
    playlist_title = "Playlist"
    try:
        playlist_title = pl.title or playlist_title
    except Exception:
        pass

    playlist_owner: Optional[str] = None
    try:
        playlist_owner = pl.owner
    except Exception:
        pass

    return PlaylistInfo(
        id="",
        url=url,
        title=playlist_title,
        channel=playlist_owner,
        video_count=len(video_urls),
        videos=videos,
    )
