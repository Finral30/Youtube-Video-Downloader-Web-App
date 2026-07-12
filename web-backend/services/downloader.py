"""
services/downloader.py
-----------------------
pytubefix-based download engine with:
  - True pause/resume via threading.Event + HTTP Range requests
  - Cancel with cleanup
  - Real-time progress via chunk callbacks
  - Adaptive stream merging (1080p+) via FFmpeg
  - MP3 conversion via FFmpeg
"""

from __future__ import annotations

import os
import shutil
import subprocess
import threading
import time
import uuid
from pathlib import Path
from typing import Callable, Optional

import requests as http_requests
from pytubefix import YouTube

from core.config import settings
from core.models import DownloadFormat, DownloadProgress, DownloadStatus
from utils.filename import sanitize_filename, unique_filepath


CHUNK_SIZE = 65_536  # 64 KiB — small enough for responsive pause


# ---------------------------------------------------------------------------
# DownloadTask
# ---------------------------------------------------------------------------

class DownloadTask:
    """Represents one queued or active download."""

    def __init__(
        self,
        url: str,
        fmt: DownloadFormat,
        quality: str,
        bitrate: str,
        task_id: Optional[str] = None,
    ) -> None:
        self.task_id: str = task_id or str(uuid.uuid4())
        self.url = url
        self.fmt = fmt
        self.quality = quality   # "best" or height e.g. "1080"
        self.bitrate = bitrate   # kbps string e.g. "192"

        # Pause / cancel controls
        self._pause_event = threading.Event()
        self._pause_event.set()          # starts in "running" state
        self._cancel_flag = False

        # Live progress (polled by SSE endpoint every 500 ms)
        self.progress = DownloadProgress(
            task_id=self.task_id,
            status=DownloadStatus.QUEUED,
            url=url,
            format=fmt,
            quality=quality,
        )

        # Staging directory for this task
        self.output_dir = str(Path(settings.temp_dir) / self.task_id)

    # ------------------------------------------------------------------
    # Control API
    # ------------------------------------------------------------------

    def pause(self) -> None:
        if self.progress.status == DownloadStatus.DOWNLOADING:
            self._pause_event.clear()
            self.progress.status = DownloadStatus.PAUSED

    def resume(self) -> None:
        if self.progress.status == DownloadStatus.PAUSED:
            self.progress.status = DownloadStatus.DOWNLOADING
            self._pause_event.set()

    def cancel(self) -> None:
        self._cancel_flag = True
        self._pause_event.set()          # unblock a paused thread
        self.progress.status = DownloadStatus.CANCELLED

    @property
    def is_done(self) -> bool:
        return self.progress.status in (
            DownloadStatus.COMPLETED,
            DownloadStatus.CANCELLED,
            DownloadStatus.FAILED,
        )

    # ------------------------------------------------------------------
    # Internal: chunked HTTP download with pause / resume / cancel
    # ------------------------------------------------------------------

    def _chunked_download(self, stream_url: str, output_path: str, total_bytes: int = 0) -> None:
        """
        Download *stream_url* to *output_path* using HTTP Range requests.

        Supports:
          - Resume  : appends to an existing partial file
          - Pause   : blocks on threading.Event between chunks
          - Cancel  : raises InterruptedError, caller removes the file
        """
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        downloaded = 0
        file_mode = "wb"
        headers: dict = {}

        # Resume: check for existing partial file
        if os.path.exists(output_path):
            downloaded = os.path.getsize(output_path)
            if 0 < downloaded < total_bytes:
                headers["Range"] = f"bytes={downloaded}-"
                file_mode = "ab"
            else:
                downloaded = 0

        try:
            response = http_requests.get(
                stream_url, headers=headers, stream=True, timeout=30
            )
            response.raise_for_status()
        except http_requests.RequestException as exc:
            raise RuntimeError(f"HTTP error: {exc}") from exc

        _start = time.time()
        _last_bytes = downloaded

        with open(output_path, file_mode) as fh:
            for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                # --- pause gate ---
                self._pause_event.wait()

                # --- cancel gate ---
                if self._cancel_flag:
                    raise InterruptedError("Download cancelled by user")

                if not chunk:
                    continue

                fh.write(chunk)
                downloaded += len(chunk)

                # Update shared progress
                now = time.time()
                elapsed = now - _start or 0.001
                speed = (downloaded - _last_bytes) / elapsed
                _start, _last_bytes = now, downloaded

                self.progress.status = DownloadStatus.DOWNLOADING
                self.progress.downloaded_bytes = downloaded
                self.progress.total_bytes = total_bytes
                self.progress.percent = (
                    downloaded / total_bytes * 100 if total_bytes else 0.0
                )
                self.progress.speed = speed
                if speed > 0 and total_bytes:
                    self.progress.eta = int((total_bytes - downloaded) / speed)

    # ------------------------------------------------------------------
    # Internal: stream selection helpers
    # ------------------------------------------------------------------

    def _select_video_stream(self, yt: YouTube):
        """Return the best pytubefix stream for the requested quality."""
        q = self.quality

        if q == "best":
            # Prefer highest-res progressive; fall back to adaptive if higher res
            prog = yt.streams.filter(progressive=True, file_extension="mp4") \
                             .order_by("resolution").last()
            adapt = yt.streams.filter(adaptive=True, only_video=True, file_extension="mp4") \
                               .order_by("resolution").last()

            def _res(s):
                try:
                    return int(s.resolution.replace("p", "")) if s and s.resolution else 0
                except Exception:
                    return 0

            if _res(adapt) > _res(prog):
                return adapt, True   # needs FFmpeg merge
            return prog, False

        # Specific resolution requested
        res_str = f"{q}p"
        # Try progressive first (no merge needed)
        stream = (
            yt.streams.filter(progressive=True, file_extension="mp4", res=res_str).first()
        )
        if stream:
            return stream, False

        # Try adaptive video stream
        stream = (
            yt.streams.filter(adaptive=True, only_video=True, file_extension="mp4", res=res_str).first()
        )
        if stream:
            return stream, True

        # Fallback: best progressive available
        stream = (
            yt.streams.filter(progressive=True, file_extension="mp4")
            .order_by("resolution").last()
        )
        return stream, False

    def _get_audio_stream(self, yt: YouTube):
        """Return the highest-quality audio-only stream."""
        return (
            yt.streams.filter(only_audio=True).order_by("abr").last()
            or yt.streams.get_audio_only()
        )

    # ------------------------------------------------------------------
    # Internal: FFmpeg helpers
    # ------------------------------------------------------------------

    def _ffmpeg_merge(self, video_path: str, audio_path: str, output_path: str) -> None:
        """Merge separate video and audio files with FFmpeg."""
        self.progress.status = DownloadStatus.MERGING
        cmd = [
            settings.ffmpeg_path, "-y",
            "-i", video_path,
            "-i", audio_path,
            "-c:v", "copy",
            "-c:a", "aac",
            output_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg merge failed: {result.stderr[-500:]}")

    def _ffmpeg_to_mp3(self, input_path: str, output_path: str) -> None:
        """Convert any audio file to MP3 at the requested bitrate."""
        self.progress.status = DownloadStatus.CONVERTING
        cmd = [
            settings.ffmpeg_path, "-y",
            "-i", input_path,
            "-vn",
            "-ab", f"{self.bitrate}k",
            "-ar", "44100",
            output_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg convert failed: {result.stderr[-500:]}")

    # ------------------------------------------------------------------
    # Run
    # ------------------------------------------------------------------

    def run(
        self,
        on_complete: Optional[Callable[[DownloadTask, str], None]] = None,
        on_error: Optional[Callable[[DownloadTask, str], None]] = None,
    ) -> None:
        """Execute the full download pipeline in the calling thread."""
        os.makedirs(self.output_dir, exist_ok=True)
        self.progress.status = DownloadStatus.FETCHING_INFO
        self.progress.started_at = time.time()

        try:
            yt = YouTube(self.url)
            self.progress.title = yt.title or ""
            self.progress.thumbnail = yt.thumbnail_url

            if self.fmt == DownloadFormat.AUDIO:
                result_path = self._run_audio(yt)
            else:
                result_path = self._run_video(yt)

            if self._cancel_flag:
                self.progress.status = DownloadStatus.CANCELLED
                self._cleanup_temp()
                return

            self.progress.file_path = result_path
            self.progress.status = DownloadStatus.COMPLETED
            self.progress.completed_at = time.time()
            self.progress.percent = 100.0

            if on_complete:
                on_complete(self, result_path)

        except InterruptedError:
            self.progress.status = DownloadStatus.CANCELLED
            self._cleanup_temp()

        except Exception as exc:
            self.progress.status = DownloadStatus.FAILED
            self.progress.error = str(exc)
            if on_error:
                on_error(self, str(exc))

    # ------------------------------------------------------------------
    # Video pipeline
    # ------------------------------------------------------------------

    def _run_video(self, yt: YouTube) -> str:
        safe_title = sanitize_filename(yt.title or "video")
        stream, needs_merge = self._select_video_stream(yt)

        if stream is None:
            raise RuntimeError("No suitable video stream found for the requested quality.")

        if needs_merge:
            return self._download_adaptive_video(yt, stream, safe_title)
        else:
            return self._download_progressive_video(stream, safe_title)

    def _download_progressive_video(self, stream, safe_title: str) -> str:
        """Single-stream download (video + audio together, no FFmpeg)."""
        out_path = unique_filepath(self.output_dir, f"{safe_title}.mp4")
        self._chunked_download(stream.url, out_path, stream.filesize or 0)
        return out_path

    def _download_adaptive_video(self, yt: YouTube, video_stream, safe_title: str) -> str:
        """Download separate video + audio tracks then merge with FFmpeg."""
        audio_stream = self._get_audio_stream(yt)

        vid_ext = video_stream.mime_type.split("/")[-1] if video_stream.mime_type else "mp4"
        aud_ext = audio_stream.mime_type.split("/")[-1] if audio_stream and audio_stream.mime_type else "webm"

        vid_tmp = os.path.join(self.output_dir, f"_video_tmp.{vid_ext}")
        aud_tmp = os.path.join(self.output_dir, f"_audio_tmp.{aud_ext}")

        # Download video track
        self._chunked_download(video_stream.url, vid_tmp, video_stream.filesize or 0)
        if self._cancel_flag:
            raise InterruptedError("Cancelled")

        # Download audio track (reset progress counters for second stage)
        self.progress.downloaded_bytes = 0
        self.progress.percent = 0.0
        self._chunked_download(
            audio_stream.url, aud_tmp,
            audio_stream.filesize or 0,
        )
        if self._cancel_flag:
            raise InterruptedError("Cancelled")

        # Merge
        out_path = unique_filepath(self.output_dir, f"{safe_title}.mp4")
        self._ffmpeg_merge(vid_tmp, aud_tmp, out_path)

        # Clean up temp tracks
        for p in (vid_tmp, aud_tmp):
            try:
                os.remove(p)
            except OSError:
                pass

        return out_path

    # ------------------------------------------------------------------
    # Audio pipeline
    # ------------------------------------------------------------------

    def _run_audio(self, yt: YouTube) -> str:
        safe_title = sanitize_filename(yt.title or "audio")
        stream = self._get_audio_stream(yt)
        if stream is None:
            raise RuntimeError("No audio stream available for this video.")

        aud_ext = stream.mime_type.split("/")[-1] if stream.mime_type else "mp4"
        raw_tmp = os.path.join(self.output_dir, f"_audio_raw.{aud_ext}")

        self._chunked_download(stream.url, raw_tmp, stream.filesize or 0)
        if self._cancel_flag:
            raise InterruptedError("Cancelled")

        mp3_path = unique_filepath(self.output_dir, f"{safe_title}.mp3")
        self._ffmpeg_to_mp3(raw_tmp, mp3_path)

        try:
            os.remove(raw_tmp)
        except OSError:
            pass

        return mp3_path

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    def _cleanup_temp(self) -> None:
        if os.path.isdir(self.output_dir):
            try:
                shutil.rmtree(self.output_dir)
            except OSError:
                pass
