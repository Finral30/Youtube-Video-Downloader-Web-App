// src/hooks/useGlobalQueue.ts
// Mounts ONE SSE connection per active task, globally (regardless of which page is open).
// This ensures progress is tracked even when the user stays on the Downloader page.
import { useEffect, useRef } from "react";
import { useQueueStore } from "../store/queueStore";
import { API_URL } from "../services/api";
import type { DownloadProgress } from "../types";

const TERMINAL = new Set(["completed", "cancelled", "failed"]);

export function useGlobalQueue() {
  // Map of taskId → EventSource
  const connectionsRef = useRef<Map<string, EventSource>>(new Map());

  // Re-run whenever the task map changes (new tasks added)
  const tasks = useQueueStore((s) => s.tasks);

  useEffect(() => {
    const connections = connectionsRef.current;

    // Open a connection for every non-terminal, non-connected task
    Object.values(tasks).forEach((task) => {
      if (TERMINAL.has(task.status)) return;          // already done
      if (connections.has(task.task_id)) return;      // already subscribed

      const url = `${API_URL}/api/download/${task.task_id}/progress`;
      const es = new EventSource(url);
      connections.set(task.task_id, es);

      es.onmessage = (event: MessageEvent) => {
        try {
          const data: DownloadProgress = JSON.parse(event.data as string);
          useQueueStore.getState().updateTask(task.task_id, data);

          if (TERMINAL.has(data.status)) {
            es.close();
            connections.delete(task.task_id);
          }
        } catch {
          // ignore bad JSON
        }
      };

      es.onerror = () => {
        es.close();
        connections.delete(task.task_id);
      };
    });

    // Close connections for tasks that have been removed from the store
    connections.forEach((es, id) => {
      if (!tasks[id]) {
        es.close();
        connections.delete(id);
      }
    });
  }, [tasks]);

  // Close all on unmount (app shutdown)
  useEffect(() => {
    return () => {
      connectionsRef.current.forEach((es) => es.close());
      connectionsRef.current.clear();
    };
  }, []);
}
