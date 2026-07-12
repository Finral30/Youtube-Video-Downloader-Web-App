// src/components/queue/QueueItem.tsx
// A single download item with progress bar and controls
import { motion } from "framer-motion";
import {
  Download,
  Loader2,
  Pause,
  Play,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { DownloadProgress } from "../../types";
import {
  formatBytes,
  formatETA,
  formatSpeed,
} from "../../utils/formatters";
import { downloadApi } from "../../services/downloadApi";
import toast from "react-hot-toast";

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  fetching_info: "Fetching info…",
  downloading: "Downloading",
  merging: "Merging streams…",
  converting: "Converting…",
  completed: "Completed",
  paused: "Paused",
  cancelled: "Cancelled",
  failed: "Failed",
};

interface Props {
  task: DownloadProgress;
  onRemove: (taskId: string) => void;
}

export default function QueueItem({ task, onRemove }: Props) {
  const isDone = ["completed", "cancelled", "failed"].includes(task.status);
  const isActive = ["downloading", "merging", "converting", "fetching_info"].includes(task.status);

  const handlePauseResume = async () => {
    try {
      if (task.status === "paused") {
        await downloadApi.resume(task.task_id);
      } else {
        await downloadApi.pause(task.task_id);
      }
    } catch {
      toast.error("Control failed");
    }
  };

  const handleCancel = async () => {
    try {
      await downloadApi.cancel(task.task_id);
    } catch {
      toast.error("Cancel failed");
    }
  };

  const handleDownloadFile = () => {
    const url = downloadApi.getFileUrl(task.task_id);
    const a = document.createElement("a");
    a.href = url;
    a.click();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card p-4"
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="shrink-0 w-16 h-12 rounded-lg bg-surface-800 overflow-hidden">
          {task.thumbnail ? (
            <img src={task.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-surface-500">
              <Download size={16} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-white line-clamp-1 flex-1">
              {task.title || task.url}
            </p>
            {/* Controls */}
            <div className="flex items-center gap-1 shrink-0">
              {task.status === "completed" && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDownloadFile}
                  className="p-1.5 rounded-lg bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 transition-colors"
                  title="Save file"
                >
                  <Download size={14} />
                </motion.button>
              )}
              {!isDone && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePauseResume}
                  className="p-1.5 rounded-lg bg-surface-700 text-surface-300 hover:text-white transition-colors"
                  title={task.status === "paused" ? "Resume" : "Pause"}
                >
                  {task.status === "paused" ? <Play size={14} /> : <Pause size={14} />}
                </motion.button>
              )}
              {!isDone && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleCancel}
                  className="p-1.5 rounded-lg bg-surface-700 text-surface-300 hover:text-red-400 transition-colors"
                  title="Cancel"
                >
                  <X size={14} />
                </motion.button>
              )}
              {isDone && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onRemove(task.task_id)}
                  className="p-1.5 rounded-lg bg-surface-700 text-surface-400 hover:text-white transition-colors"
                  title="Remove"
                >
                  <X size={14} />
                </motion.button>
              )}
            </div>
          </div>

          {/* Status row */}
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs font-medium flex items-center gap-1 ${
              task.status === "completed" ? "text-green-400" :
              task.status === "failed" ? "text-red-400" :
              task.status === "paused" ? "text-yellow-400" :
              "text-surface-400"
            }`}>
              {task.status === "completed" && <CheckCircle2 size={12} />}
              {task.status === "failed" && <AlertCircle size={12} />}
              {isActive && <Loader2 size={12} className="animate-spin" />}
              {STATUS_LABELS[task.status] || task.status}
            </span>

            {isActive && (
              <>
                <span className="text-xs text-surface-500">{formatSpeed(task.speed)}</span>
                <span className="text-xs text-surface-500">ETA {formatETA(task.eta)}</span>
                <span className="text-xs text-surface-500 ml-auto">
                  {formatBytes(task.downloaded_bytes)} / {formatBytes(task.total_bytes)}
                </span>
              </>
            )}
          </div>

          {/* Progress bar */}
          {(isActive || task.status === "paused") && (
            <div className="mt-2 h-1.5 rounded-full bg-surface-800 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  task.status === "paused" ? "bg-yellow-500/70" : "bg-brand-500 progress-glow"
                }`}
                animate={{ width: `${task.percent}%` }}
                transition={{ ease: "linear", duration: 0.3 }}
                style={{ width: `${task.percent}%` }}
              />
            </div>
          )}

          {task.status === "failed" && task.error && (
            <p className="text-xs text-red-400 mt-1 line-clamp-1">{task.error}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
