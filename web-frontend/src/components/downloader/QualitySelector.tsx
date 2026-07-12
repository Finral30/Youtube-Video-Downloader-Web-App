// src/components/downloader/QualitySelector.tsx
// Format (Video/Audio) + Quality + Bitrate picker
import { motion } from "framer-motion";
import { Film, Music } from "lucide-react";
import type { DownloadFormat, FormatInfo } from "../../types";

const VIDEO_QUALITIES = ["best", "2160", "1440", "1080", "720", "480", "360", "240", "144"];
const AUDIO_BITRATES = ["320", "256", "192", "128", "96", "64"];

interface Props {
  format: DownloadFormat;
  quality: string;
  bitrate: string;
  availableFormats?: FormatInfo[];
  onFormatChange: (fmt: DownloadFormat) => void;
  onQualityChange: (q: string) => void;
  onBitrateChange: (b: string) => void;
}

export default function QualitySelector({
  format,
  quality,
  bitrate,
  availableFormats,
  onFormatChange,
  onQualityChange,
  onBitrateChange,
}: Props) {
  // Filter qualities to those actually available (if info provided)
  const availableHeights = availableFormats?.map((f) => f.quality.replace("p", "")) ?? [];
  const qualities = VIDEO_QUALITIES.filter(
    (q) => q === "best" || availableHeights.length === 0 || availableHeights.includes(q)
  );

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Format Toggle */}
      <div>
        <p className="text-xs font-medium text-surface-400 mb-2 uppercase tracking-wider">Format</p>
        <div className="flex gap-2">
          {(["video", "audio"] as DownloadFormat[]).map((f) => (
            <motion.button
              key={f}
              onClick={() => onFormatChange(f)}
              whileTap={{ scale: 0.97 }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                format === f
                  ? "bg-brand-600 text-white shadow-glow-sm"
                  : "bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700"
              }`}
              id={`format-${f}-btn`}
            >
              {f === "video" ? <Film size={16} /> : <Music size={16} />}
              {f === "video" ? "MP4 Video" : "MP3 Audio"}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Quality / Bitrate */}
      {format === "video" ? (
        <div>
          <p className="text-xs font-medium text-surface-400 mb-2 uppercase tracking-wider">Quality</p>
          <div className="flex flex-wrap gap-2">
            {qualities.map((q) => (
              <motion.button
                key={q}
                onClick={() => onQualityChange(q)}
                whileTap={{ scale: 0.95 }}
                className={`px-3 py-1.5 rounded-lg text-sm font-mono font-medium transition-all duration-150 ${
                  quality === q
                    ? "bg-brand-600/90 text-white ring-1 ring-brand-400/50"
                    : "bg-surface-800 text-surface-300 hover:bg-surface-700"
                }`}
                id={`quality-${q}-btn`}
              >
                {q === "best" ? "Best" : `${q}p`}
                {q === "2160" && (
                  <span className="ml-1 text-[10px] text-brand-300">4K</span>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xs font-medium text-surface-400 mb-2 uppercase tracking-wider">Bitrate</p>
          <div className="flex flex-wrap gap-2">
            {AUDIO_BITRATES.map((b) => (
              <motion.button
                key={b}
                onClick={() => onBitrateChange(b)}
                whileTap={{ scale: 0.95 }}
                className={`px-3 py-1.5 rounded-lg text-sm font-mono font-medium transition-all duration-150 ${
                  bitrate === b
                    ? "bg-brand-600/90 text-white ring-1 ring-brand-400/50"
                    : "bg-surface-800 text-surface-300 hover:bg-surface-700"
                }`}
                id={`bitrate-${b}-btn`}
              >
                {b}k
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
