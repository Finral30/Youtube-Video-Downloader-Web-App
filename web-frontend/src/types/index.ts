// src/types/index.ts
// All shared TypeScript interfaces mirroring the backend Pydantic models

export type DownloadFormat = "video" | "audio";
export type Theme = "dark" | "light" | "amoled";

export type DownloadStatus =
  | "queued"
  | "fetching_info"
  | "downloading"
  | "merging"
  | "converting"
  | "completed"
  | "paused"
  | "cancelled"
  | "failed";

export interface FormatInfo {
  format_id: string;
  ext: string;
  quality: string;       // e.g. "1080p"
  resolution?: string;   // e.g. "1920x1080"
  filesize?: number;
  vcodec?: string;
  acodec?: string;
  fps?: number;
  tbr?: number;
}

export interface VideoInfo {
  id: string;
  url: string;
  title: string;
  channel: string;
  duration: number;       // seconds
  thumbnail: string;
  view_count?: number;
  upload_date?: string;
  description?: string;
  formats: FormatInfo[];
  is_live: boolean;
}

export interface PlaylistVideoItem {
  index: number;
  id: string;
  url: string;
  title: string;
  duration?: number;
  thumbnail?: string;
  channel?: string;
}

export interface PlaylistInfo {
  id: string;
  url: string;
  title: string;
  channel?: string;
  video_count: number;
  videos: PlaylistVideoItem[];
}

export interface DownloadProgress {
  task_id: string;
  status: DownloadStatus;
  title: string;
  thumbnail?: string;
  url: string;
  format: DownloadFormat;
  quality: string;
  downloaded_bytes: number;
  total_bytes: number;
  percent: number;
  speed: number;         // bytes/sec
  eta?: number;          // seconds
  playlist_index: number;
  playlist_total: number;
  started_at: number;
  completed_at?: number;
  error?: string;
  file_path?: string;
}

export interface StartDownloadRequest {
  url: string;
  format: DownloadFormat;
  quality: string;
  bitrate: string;
  video_ids?: string[];
}

export interface HistoryEntry {
  id: number;
  task_id: string;
  title: string;
  url: string;
  thumbnail?: string;
  format: string;
  quality: string;
  file_size?: number;
  completed_at: number;
  status: string;
}

export interface HistoryListResponse {
  items: HistoryEntry[];
  total: number;
  page: number;
  page_size: number;
}

export interface AppSettings {
  default_quality: string;
  default_format: DownloadFormat;
  default_bitrate: string;
  theme: Theme;
  language: string;
  max_concurrent_downloads: number;
  auto_download_thumbnail: boolean;
}

export interface MessageResponse {
  message: string;
  success: boolean;
  data?: unknown;
}

// UI-only types
export type NavPage = "downloader" | "queue" | "playlist" | "history" | "settings";
