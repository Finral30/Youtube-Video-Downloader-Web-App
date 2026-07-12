// src/pages/PlaylistPage.tsx
// Playlist manager with select/deselect and bulk download
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, Download, ListMusic, Square } from "lucide-react";
import type { DownloadFormat, PlaylistInfo } from "../types";
import { downloadApi } from "../services/downloadApi";
import { useQueueStore } from "../store/queueStore";
import QualitySelector from "../components/downloader/QualitySelector";
import { formatDuration } from "../utils/formatters";
import toast from "react-hot-toast";

interface Props {
  playlistInfo: PlaylistInfo | null;
}

export default function PlaylistPage({ playlistInfo }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<DownloadFormat>("video");
  const [quality, setQuality] = useState("best");
  const [bitrate, setBitrate] = useState("192");
  const [downloading, setDownloading] = useState(false);
  const addTask = useQueueStore((s) => s.addTask);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!playlistInfo) return;
    setSelectedIds(new Set(playlistInfo.videos.map((v) => v.id)));
  };

  const deselectAll = () => setSelectedIds(new Set());

  const handleDownloadSelected = async () => {
    if (!playlistInfo || selectedIds.size === 0) return;
    setDownloading(true);
    let started = 0;
    for (const video of playlistInfo.videos) {
      if (!selectedIds.has(video.id)) continue;
      try {
        const task = await downloadApi.start({
          url: video.url,
          format,
          quality,
          bitrate,
        });
        addTask(task);
        started++;
      } catch {
        toast.error(`Failed to queue: ${video.title}`);
      }
    }
    toast.success(`${started} download${started !== 1 ? "s" : ""} queued!`, { icon: "🎵" });
    setDownloading(false);
  };

  if (!playlistInfo) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 lg:pb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-surface-500 gap-3"
        >
          <ListMusic size={48} strokeWidth={1} />
          <p className="text-sm">No playlist loaded</p>
          <p className="text-xs">Paste a playlist URL in the Downloader tab</p>
        </motion.div>
      </div>
    );
  }

  const allSelected = selectedIds.size === playlistInfo.videos.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24 lg:pb-8 space-y-5">
      {/* Playlist header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
        <h1 className="font-display font-bold text-white text-lg line-clamp-2">{playlistInfo.title}</h1>
        {playlistInfo.channel && (
          <p className="text-surface-400 text-sm mt-1">{playlistInfo.channel}</p>
        )}
        <p className="text-surface-500 text-xs mt-1">{playlistInfo.video_count} videos</p>
      </motion.div>

      {/* Quality selector */}
      <QualitySelector
        format={format}
        quality={quality}
        bitrate={bitrate}
        onFormatChange={setFormat}
        onQualityChange={setQuality}
        onBitrateChange={setBitrate}
      />

      {/* Select controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={allSelected ? deselectAll : selectAll}
            className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            {allSelected ? "Deselect All" : "Select All"}
          </button>
          <span className="text-surface-500 text-sm">{selectedIds.size} selected</span>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleDownloadSelected}
          disabled={selectedIds.size === 0 || downloading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            selectedIds.size === 0 || downloading
              ? "bg-surface-700 text-surface-500 cursor-not-allowed"
              : "bg-brand-600 text-white shadow-glow-sm hover:bg-brand-500"
          }`}
        >
          <Download size={16} />
          {downloading ? "Queuing…" : `Download ${selectedIds.size}`}
        </motion.button>
      </div>

      {/* Video list */}
      <div className="space-y-2">
        <AnimatePresence>
          {playlistInfo.videos.map((video, i) => {
            const selected = selectedIds.has(video.id);
            return (
              <motion.button
                key={video.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => toggleSelect(video.id)}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 ${
                  selected
                    ? "bg-brand-600/10 border-brand-500/30"
                    : "glass-card border-transparent hover:border-white/[0.08]"
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${
                  selected ? "bg-brand-600 border-brand-500" : "border-surface-600"
                }`}>
                  {selected && (
                    <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                <span className="text-xs text-surface-500 font-mono w-6 shrink-0">{video.index}</span>

                {video.thumbnail && (
                  <img src={video.thumbnail} alt="" className="w-12 h-9 object-cover rounded-lg shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white line-clamp-1">{video.title}</p>
                  {video.duration && (
                    <p className="text-xs text-surface-500">{formatDuration(video.duration)}</p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
