// src/services/historyApi.ts
import { api } from "./api";
import type { HistoryListResponse, MessageResponse } from "../types";

export const historyApi = {
  list: (page = 1, pageSize = 20, search?: string) =>
    api
      .get<HistoryListResponse>("/api/history", {
        params: { page, page_size: pageSize, search: search || undefined },
      })
      .then((r) => r.data),

  delete: (id: number) =>
    api.delete<MessageResponse>(`/api/history/${id}`).then((r) => r.data),

  clearAll: () =>
    api.delete<MessageResponse>("/api/history").then((r) => r.data),

  redownload: (id: number) =>
    api.post<MessageResponse>(`/api/history/${id}/redownload`).then((r) => r.data),
};
