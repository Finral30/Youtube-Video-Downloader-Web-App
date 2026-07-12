// src/pages/DownloaderPage.tsx
// Main page: URL input → video preview → quality selector → download
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, Sparkles } from "lucide-react";
import URLInput from "../components/downloader/URLInput";
import VideoPreview from "../components/downloader/VideoPreview";
import QualitySelector from "../components/downloader/QualitySelector";
import type { DownloadFormat, PlaylistInfo, VideoInfo } from "../types";
import { downloadApi } from "../services/downloadApi";
import { useQueueStore } from "../store/queueStore";
import toast from "react-hot-toast";

export default function DownloaderPage({
  onNavigateToQueue,
  onPlaylistInfo,
}: {
  onNavigateToQueue: () => void;
  onPlaylistInfo: (info: PlaylistInfo) => void;
}) {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [format, setFormat] = useState<DownloadFormat>("video");
  const [quality, setQuality] = useState("best");
  const [bitrate, setBitrate] = useState("192");
  const [downloading, setDownloading] = useState(false);

  const addTask = useQueueStore((s) => s.addTask);

  const handleVideoInfo = useCallback((info: VideoInfo) => {
    setVideoInfo(info);
  }, []);

  const handlePlaylistInfo = useCallback((info: PlaylistInfo) => {
    onPlaylistInfo(info);
  }, [onPlaylistInfo]);

  const handleDownload = async () => {
    if (!videoInfo) return;
    setDownloading(true);
    try {
      const task = await downloadApi.start({
        url: videoInfo.url,
        format,
        quality,
        bitrate,
      });
      // Add to store — QueueItem will open SSE connection automatically
      addTask(task);
      toast.success("Download started!", { icon: "🚀" });
      onNavigateToQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start download";
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-24 lg:pb-8">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-600/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-2">
          <Sparkles size={12} />
          Supports 4K · Playlists · MP3
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
          Download{" "}
          <span className="gradient-text">YouTube</span>{" "}
          Content
        </h1>
        <p className="text-surface-400 text-sm">
          Paste any YouTube link to get started
        </p>
      </motion.div>

      {/* URL Input */}
      <URLInput onVideoInfo={handleVideoInfo} onPlaylistInfo={handlePlaylistInfo} />

      {/* Results */}
      <AnimatePresence mode="wait">
        {videoInfo && (
          <motion.div
            key={videoInfo.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <VideoPreview info={videoInfo} />
            <QualitySelector
              format={format}
              quality={quality}
              bitrate={bitrate}
              availableFormats={videoInfo.formats}
              onFormatChange={setFormat}
              onQualityChange={setQuality}
              onBitrateChange={setBitrate}
            />

            {/* Download button */}
            <motion.button
              onClick={handleDownload}
              disabled={downloading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className={`
                w-full py-4 rounded-2xl font-display font-bold text-base
                flex items-center justify-center gap-2
                transition-all duration-200
                ${downloading
                  ? "bg-surface-700 text-surface-400 cursor-not-allowed"
                  : "bg-gradient-brand text-white shadow-glow hover:shadow-lg"
                }
              `}
              id="start-download-btn"
            >
              <ArrowDown size={20} />
              {downloading ? "Starting…" : `Download ${format === "video" ? "MP4" : "MP3"}`}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
