// src/hooks/useSSEProgress.ts
// Opens an SSE connection for one download task and writes progress into
// the Zustand queue store. The connection is closed automatically when the
// task reaches a terminal state (completed / cancelled / failed).
import { useEffect, useRef } from "react";
import { API_URL } from "../services/api";
import { useQueueStore } from "../store/queueStore";
import type { DownloadProgress } from "../types";

const TERMINAL = new Set(["completed", "cancelled", "failed"]);

export function useSSEProgress(taskId: string | null) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Nothing to do if no task or if previous connection is still open for the same id
    if (!taskId) return;

    const url = `${API_URL}/api/download/${taskId}/progress`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event: MessageEvent) => {
      try {
        const data: DownloadProgress = JSON.parse(event.data as string);
        // Write to store
        useQueueStore.getState().updateTask(taskId, data);

        // Close once terminal
        if (TERMINAL.has(data.status)) {
          es.close();
          esRef.current = null;
        }
      } catch {
        // ignore JSON parse errors
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [taskId]); // only re-subscribe when taskId changes
}
