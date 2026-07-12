// src/store/queueStore.ts
// Zustand store for managing download queue state
import { create } from "zustand";
import type { DownloadProgress } from "../types";

interface QueueStore {
  tasks: Record<string, DownloadProgress>;
  addTask: (task: DownloadProgress) => void;
  updateTask: (taskId: string, updates: Partial<DownloadProgress>) => void;
  removeTask: (taskId: string) => void;
  clearCompleted: () => void;
}

export const useQueueStore = create<QueueStore>((set) => ({
  tasks: {},

  addTask: (task) =>
    set((state) => ({
      tasks: { ...state.tasks, [task.task_id]: task },
    })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: {
        ...state.tasks,
        [taskId]: { ...state.tasks[taskId], ...updates },
      },
    })),

  removeTask: (taskId) =>
    set((state) => {
      const next = { ...state.tasks };
      delete next[taskId];
      return { tasks: next };
    }),

  clearCompleted: () =>
    set((state) => {
      const next = Object.fromEntries(
        Object.entries(state.tasks).filter(
          ([, t]) =>
            !["completed", "cancelled", "failed"].includes(t.status)
        )
      );
      return { tasks: next };
    }),
}));
