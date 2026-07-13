# =============================================================
# YTDLv2 Backend — Production Dockerfile
# Compatible with: Hugging Face Spaces · Koyeb · Railway · Local Docker
#
# HF Spaces requirements satisfied:
#   ✅ Port 7860    (HF routes traffic here)
#   ✅ UID 1000     (HF runs containers as this user)
#   ✅ Writable /home/appuser/app/{temp,data}
#   ✅ /data        (auto-used when HF persistent storage is enabled)
#   ✅ Single worker (REQUIRED — queue_manager is in-memory; multiple
#                    workers would each get an isolated copy, breaking
#                    SSE progress, pause/resume, and cancel)
# =============================================================


# -------------------------------------------------------------
# Stage 1 — Dependency builder (keeps runtime image lean)
# -------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /build

# Install C build tools required by some Python packages (e.g. aiohttp)
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies into an isolated prefix so we can
# COPY only them into the final image (no build tools in runtime)
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# -------------------------------------------------------------
# Stage 2 — Lean production runtime
# -------------------------------------------------------------
FROM python:3.11-slim AS runtime

# ── System packages ──────────────────────────────────────────
# ffmpeg  : merge adaptive video+audio streams; MP3 conversion
# curl    : used only by the Docker HEALTHCHECK below
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl \
    && rm -rf /var/lib/apt/lists/*

# ── Non-root user ────────────────────────────────────────────
# UID 1000 is REQUIRED by Hugging Face Spaces.
# gid 0 (root group) lets HF's orchestrator read our files.
RUN useradd --uid 1000 --gid 0 --create-home --shell /bin/bash appuser

WORKDIR /home/appuser/app

# ── Python packages (from builder) ───────────────────────────
COPY --from=builder /install /usr/local

# ── Application source ────────────────────────────────────────
# chown ensures appuser can write to all app files at runtime
COPY --chown=1000:0 . .

# ── Runtime directories ───────────────────────────────────────
# temp/  — staging area for in-progress downloads (always ephemeral)
# data/  — SQLite DB location (ephemeral unless HF persistent storage
#           is enabled, in which case /data is mounted over this dir)
RUN mkdir -p temp data \
    && chown -R 1000:0 temp data \
    && chmod -R 775 temp data

# ── Environment defaults ──────────────────────────────────────
# PORT=7860  → Hugging Face Spaces fixed port
# Override:  PORT=8000 for local Docker / Railway / Koyeb
ENV PORT=7860 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Switch to UID 1000 before any runtime operations
USER 1000

# Document the port (informational; HF ignores EXPOSE, uses app_port in README)
EXPOSE 7860

# ── Health check ──────────────────────────────────────────────
# HF Spaces and Koyeb use this to decide when the container is ready.
# start-period=30s gives uvicorn time to boot before the first check.
HEALTHCHECK \
    --interval=30s \
    --timeout=10s \
    --start-period=30s \
    --retries=3 \
    CMD curl -f "http://localhost:${PORT}/api/health" || exit 1

# ── Start command ─────────────────────────────────────────────
# IMPORTANT — Single worker only:
#   Our download queue, pause/resume state, and SSE connections all
#   live in-memory. Using --workers > 1 (multiprocessing) would give
#   each worker its own isolated copy, completely breaking these features.
#
# --timeout-keep-alive 75
#   SSE progress streams are long-lived connections. The default Starlette
#   keep-alive (5s) would cut them off. 75s > HF's 60s proxy timeout.
#
# Shell form (not exec form) so $PORT is expanded by the shell at runtime.
CMD uvicorn main:app \
        --host 0.0.0.0 \
        --port $PORT \
        --workers 1 \
        --timeout-keep-alive 75 \
        --log-level info
