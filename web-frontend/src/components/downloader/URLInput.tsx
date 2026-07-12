// src/components/downloader/URLInput.tsx
// The main URL paste bar with animated states
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Loader2, Search, X } from "lucide-react";
import { infoApi } from "../../services/infoApi";
import type { PlaylistInfo, VideoInfo } from "../../types";
import toast from "react-hot-toast";

// Detect if URL is a standalone playlist (not a video inside a playlist)
// e.g. https://youtube.com/playlist?list=PL... → true
// e.g. https://youtube.com/watch?v=xxx&list=PL... → false (treat as single video)
function isPlaylistUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const pathname = u.pathname;
    // Only pure playlist pages — not watch pages that happen to have a list param
    return (
      pathname === "/playlist" && u.searchParams.has("list")
    );
  } catch {
    return false;
  }
}

interface Props {
  onVideoInfo: (info: VideoInfo) => void;
  onPlaylistInfo: (info: PlaylistInfo) => void;
}

export default function URLInput({ onVideoInfo, onPlaylistInfo }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!trimmed.includes("youtube.com") && !trimmed.includes("youtu.be")) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }

    setLoading(true);
    try {
      if (isPlaylistUrl(trimmed)) {
        const info = await infoApi.getPlaylistInfo(trimmed);
        onPlaylistInfo(info);
      } else {
        const info = await infoApi.getVideoInfo(trimmed);
        onVideoInfo(info);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch video info";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleFetch();
  };

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <div className={`
          flex items-center gap-3 px-4 py-3.5 rounded-2xl
          glass-card transition-all duration-300
          ${loading ? "ring-2 ring-brand-500/40" : "ring-1 ring-white/[0.06] hover:ring-white/10 focus-within:ring-2 focus-within:ring-brand-500/50"}
        `}>
          <Link2 size={20} className="text-surface-400 shrink-0" />

          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste YouTube URL here…"
            disabled={loading}
            className="flex-1 bg-transparent text-white placeholder-surface-500 text-sm outline-none min-w-0"
            id="youtube-url-input"
          />

          <AnimatePresence mode="wait">
            {url && !loading && (
              <motion.button
                key="clear"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setUrl("")}
                className="text-surface-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </motion.button>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleFetch}
            disabled={loading || !url.trim()}
            whileTap={{ scale: 0.96 }}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
              transition-all duration-200 shrink-0
              ${loading || !url.trim()
                ? "bg-surface-700 text-surface-500 cursor-not-allowed"
                : "bg-brand-600 hover:bg-brand-500 text-white shadow-glow-sm"
              }
            `}
            id="fetch-info-btn"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            <span className="hidden sm:block">{loading ? "Fetching…" : "Analyze"}</span>
          </motion.button>
        </div>
      </motion.div>

      <p className="mt-2 text-xs text-surface-500 text-center">
        Supports videos, playlists, Shorts — up to 4K quality
      </p>
    </div>
  );
}
