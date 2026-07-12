// src/services/infoApi.ts
import { api } from "./api";
import type { PlaylistInfo, VideoInfo } from "../types";

export const infoApi = {
  getVideoInfo: (url: string) =>
    api.post<VideoInfo>("/api/info/video", { url }).then((r) => r.data),

  getPlaylistInfo: (url: string) =>
    api.post<PlaylistInfo>("/api/info/playlist", { url }).then((r) => r.data),
};
