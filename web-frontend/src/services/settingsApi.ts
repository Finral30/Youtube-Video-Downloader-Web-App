// src/services/settingsApi.ts
import { api } from "./api";
import type { AppSettings } from "../types";

export const settingsApi = {
  get: () => api.get<AppSettings>("/api/settings").then((r) => r.data),
  update: (settings: AppSettings) =>
    api.put<AppSettings>("/api/settings", settings).then((r) => r.data),
};
