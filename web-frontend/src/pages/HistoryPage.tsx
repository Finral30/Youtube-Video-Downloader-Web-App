// src/pages/HistoryPage.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Film, Music2, RotateCcw, Search, Trash2 } from "lucide-react";
import { historyApi } from "../services/historyApi";
import { useQueueStore } from "../store/queueStore";
import { formatBytes, formatDate } from "../utils/formatters";
import toast from "react-hot-toast";

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const addTask = useQueueStore((s) => s.addTask);

  const { data, isLoading } = useQuery({
    queryKey: ["history", page, search],
    queryFn: () => historyApi.list(page, 20, search || undefined),
    placeholderData: (prev) => prev,
  });

  const handleDelete = async (id: number) => {
    try {
      await historyApi.delete(id);
      qc.invalidateQueries({ queryKey: ["history"] });
      toast.success("Removed from history");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Clear all download history?")) return;
    try {
      await historyApi.clearAll();
      qc.invalidateQueries({ queryKey: ["history"] });
      toast.success("History cleared");
    } catch {
      toast.error("Failed to clear history");
    }
  };

  const handleRedownload = async (id: number) => {
    try {
      const res = await historyApi.redownload(id);
      const taskId = (res.data as { task_id: string })?.task_id;
      if (taskId) {
        addTask({ task_id: taskId, status: "queued", url: "", format: "video", quality: "", title: "", downloaded_bytes: 0, total_bytes: 0, percent: 0, speed: 0, playlist_index: 0, playlist_total: 0, started_at: Date.now() / 1000 });
      }
      toast.success("Re-queued!", { icon: "🔄" });
    } catch {
      toast.error("Failed to re-download");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-white">History</h1>
          <p className="text-surface-400 text-sm mt-0.5">{data?.total ?? 0} downloads</p>
        </div>
        {(data?.total ?? 0) > 0 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleClearAll}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm transition-colors"
          >
            <Trash2 size={15} />
            Clear All
          </motion.button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search history…"
          className="w-full bg-surface-800 border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-surface-500 outline-none focus:border-brand-500/40 transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center py-24 text-surface-500 gap-3"
        >
          <Clock size={48} strokeWidth={1} />
          <p className="text-sm">{search ? "No results found" : "No download history yet"}</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {data.items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card p-4 flex gap-3"
              >
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="" className="w-16 h-12 object-cover rounded-lg shrink-0" />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-surface-800 flex items-center justify-center shrink-0">
                    {item.format === "audio" ? <Music2 size={20} className="text-surface-500" /> : <Film size={20} className="text-surface-500" />}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium line-clamp-1">{item.title}</p>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-surface-500">{item.format === "audio" ? "MP3" : "MP4"} · {item.quality === "best" ? "Best" : `${item.quality}p`}</span>
                    {item.file_size && <span className="text-xs text-surface-500">{formatBytes(item.file_size)}</span>}
                    <span className="text-xs text-surface-500">{formatDate(item.completed_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleRedownload(item.id)}
                    className="p-1.5 rounded-lg bg-surface-700 text-surface-400 hover:text-brand-400 transition-colors"
                    title="Re-download"
                  >
                    <RotateCcw size={14} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg bg-surface-700 text-surface-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Pagination */}
          {(data.total > 20) && (
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl bg-surface-800 text-surface-400 disabled:opacity-40 hover:text-white text-sm transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-surface-500">
                Page {page} of {Math.ceil(data.total / 20)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(data.total / 20)}
                className="px-4 py-2 rounded-xl bg-surface-800 text-surface-400 disabled:opacity-40 hover:text-white text-sm transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
