// src/components/downloader/VideoPreview.tsx
// Shows video thumbnail, title, metadata after URL is analyzed
import { motion } from "framer-motion";
import { Calendar, Clock, Eye, Tv2 } from "lucide-react";
import type { VideoInfo } from "../../types";
import {
  formatDuration,
  formatUploadDate,
  formatViews,
} from "../../utils/formatters";

interface Props {
  info: VideoInfo;
}

export default function VideoPreview({ info }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        {/* Thumbnail */}
        <div className="relative shrink-0 rounded-xl overflow-hidden sm:w-48 aspect-video bg-surface-800">
          {info.thumbnail ? (
            <img
              src={info.thumbnail}
              alt={info.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-surface-500">
              <Tv2 size={32} />
            </div>
          )}
          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-mono px-1.5 py-0.5 rounded-md">
            {formatDuration(info.duration)}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <h2 className="text-white font-semibold text-sm sm:text-base leading-snug line-clamp-2">
            {info.title}
          </h2>
          <p className="text-surface-400 text-xs font-medium">{info.channel}</p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            {info.view_count != null && (
              <span className="flex items-center gap-1.5 text-xs text-surface-500">
                <Eye size={12} />
                {formatViews(info.view_count)}
              </span>
            )}
            {info.upload_date && (
              <span className="flex items-center gap-1.5 text-xs text-surface-500">
                <Calendar size={12} />
                {formatUploadDate(info.upload_date)}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-surface-500">
              <Clock size={12} />
              {formatDuration(info.duration)}
            </span>
          </div>

          {/* Quality badges */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {info.formats.slice(0, 6).map((fmt) => (
              <span
                key={fmt.format_id}
                className="px-2 py-0.5 rounded-lg bg-surface-700/60 border border-white/[0.06] text-[11px] font-mono text-surface-300"
              >
                {fmt.quality}
              </span>
            ))}
            {info.formats.length > 6 && (
              <span className="px-2 py-0.5 rounded-lg bg-surface-700/60 border border-white/[0.06] text-[11px] text-surface-500">
                +{info.formats.length - 6} more
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
