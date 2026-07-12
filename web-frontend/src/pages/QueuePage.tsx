// src/pages/QueuePage.tsx
// Live download queue with pause/resume/cancel controls
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, Trash2 } from "lucide-react";
import QueueItem from "../components/queue/QueueItem";
import { useQueueStore } from "../store/queueStore";

export default function QueuePage() {
  const tasks = useQueueStore((s) => s.tasks);
  const removeTask = useQueueStore((s) => s.removeTask);
  const clearCompleted = useQueueStore((s) => s.clearCompleted);

  const taskList = Object.values(tasks);
  const hasDone = taskList.some((t) =>
    ["completed", "cancelled", "failed"].includes(t.status)
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-white">Download Queue</h1>
          <p className="text-surface-400 text-sm mt-0.5">
            {taskList.length} {taskList.length === 1 ? "task" : "tasks"}
          </p>
        </div>
        {hasDone && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={clearCompleted}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 text-surface-400 hover:text-white text-sm transition-colors"
          >
            <Trash2 size={15} />
            Clear done
          </motion.button>
        )}
      </div>

      {taskList.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 text-surface-500 gap-3"
        >
          <Inbox size={48} strokeWidth={1} />
          <p className="text-sm">No downloads yet</p>
          <p className="text-xs">Go to Downloader to start a download</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {taskList.map((task) => (
              <QueueItem key={task.task_id} task={task} onRemove={removeTask} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
