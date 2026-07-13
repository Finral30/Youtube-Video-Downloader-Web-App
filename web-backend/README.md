---
title: YTDLv2 API
emoji: 📥
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: YouTube Downloader v2 — FastAPI + pytubefix + FFmpeg backend
---

# YTDLv2 — YouTube Downloader Backend API

FastAPI backend for the YTDLv2 web application.  
Pair this Space with the React frontend deployed on Vercel.

## Features

- ✅ Download YouTube videos up to **4K quality**
- ✅ **MP3 audio** extraction at selectable bitrates (64–320 kbps)
- ✅ Full **playlist support** with bulk download
- ✅ Real-time progress via **Server-Sent Events (SSE)**
- ✅ **Pause / Resume / Cancel** downloads
- ✅ **Download history** stored in SQLite
- ✅ **Auto cleanup** — temp files deleted after browser downloads them
- ✅ **Periodic sweep** — stale temp folders removed every 30 minutes
- ✅ **FFmpeg** — adaptive stream merging + MP3 conversion

## Connecting the Frontend

After deploying, your Space URL will be:
```
https://YOUR_USERNAME-ytdlv2-api.hf.space
```

Set `VITE_API_URL` to this URL in your Vercel frontend environment variables.

## Environment Variables

Set these in **Settings → Variables and Secrets**:

| Variable | Example | Required |
|---|---|---|
| `CORS_ORIGINS` | `https://your-app.vercel.app` | ✅ Yes |
| `COOKIES_FILE` | `/data/cookies.txt` | Optional |

## Persistent Storage (Optional)

Enable **Persistent Storage** in Space Settings ($0.02/GB/month) to keep
your download history across restarts. The app automatically detects `/data`
and stores `ytdl.db` there — no config change needed.

## API Documentation

Visit `/docs` for the interactive Swagger UI once the Space is running.
