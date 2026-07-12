// src/services/downloadApi.ts
import { api, API_URL } from "./api";
import type {
  DownloadProgress,
  MessageResponse,
  StartDownloadRequest,
} from "../types";

export const downloadApi = {
  start: (req: StartDownloadRequest) =>
    api.post<DownloadProgress>("/api/download/start", req).then((r) => r.data),

  pause: (taskId: string) =>
    api.post<MessageResponse>(`/api/download/${taskId}/pause`).then((r) => r.data),

  resume: (taskId: string) =>
    api.post<MessageResponse>(`/api/download/${taskId}/resume`).then((r) => r.data),

  cancel: (taskId: string) =>
    api.post<MessageResponse>(`/api/download/${taskId}/cancel`).then((r) => r.data),

  getFileUrl: (taskId: string) => `${API_URL}/api/download/${taskId}/file`,

  getProgressUrl: (taskId: string) => `${API_URL}/api/download/${taskId}/progress`,
};
