// src/App.tsx
// Root component: layout + routing between pages
import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import Sidebar from "./components/layout/Sidebar";
import MobileNav from "./components/layout/MobileNav";
import DownloaderPage from "./pages/DownloaderPage";
import QueuePage from "./pages/QueuePage";
import PlaylistPage from "./pages/PlaylistPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import { useGlobalQueue } from "./hooks/useGlobalQueue";
import type { NavPage, PlaylistInfo } from "./types";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};

export default function App() {
  const [page, setPage] = useState<NavPage>("downloader");
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);

  // Global SSE listener — tracks all active downloads on every page
  useGlobalQueue();

  const handlePlaylistInfo = useCallback((info: PlaylistInfo) => {
    setPlaylistInfo(info);
    setPage("playlist");
  }, []);

  const handleNavigateToQueue = useCallback(() => {
    setPage("queue");
  }, []);

  return (
    <div className="flex min-h-screen" data-testid="app-root">
      {/* Sidebar – desktop */}
      <Sidebar current={page} onChange={setPage} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {page === "downloader" && (
              <DownloaderPage
                onNavigateToQueue={handleNavigateToQueue}
                onPlaylistInfo={handlePlaylistInfo}
              />
            )}
            {page === "queue"      && <QueuePage />}
            {page === "playlist"   && <PlaylistPage playlistInfo={playlistInfo} />}
            {page === "history"    && <HistoryPage />}
            {page === "settings"   && <SettingsPage />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav current={page} onChange={setPage} />

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#161b27",
            color: "#f0f4ff",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#1a56ff", secondary: "#fff" } },
          error:   { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />
    </div>
  );
}
