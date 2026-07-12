// src/components/layout/Sidebar.tsx
import { motion } from "framer-motion";
import {
  Download,
  History,
  List,
  ListMusic,
  Settings,
  Zap,
} from "lucide-react";
import type { NavPage } from "../../types";

interface NavItem {
  id: NavPage;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: "downloader", label: "Downloader", icon: <Download size={20} /> },
  { id: "queue",      label: "Queue",      icon: <List size={20} /> },
  { id: "playlist",   label: "Playlist",   icon: <ListMusic size={20} /> },
  { id: "history",    label: "History",    icon: <History size={20} /> },
  { id: "settings",   label: "Settings",   icon: <Settings size={20} /> },
];

interface Props {
  current: NavPage;
  onChange: (page: NavPage) => void;
}

export default function Sidebar({ current, onChange }: Props) {
  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-white/[0.06] bg-surface-900/80 backdrop-blur-xl p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow">
          <Zap size={18} className="text-white" fill="white" />
        </div>
        <div>
          <p className="font-display font-bold text-white text-sm leading-none">YTDLv2</p>
          <p className="text-[11px] text-surface-400 mt-0.5">YouTube Downloader</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = current === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onChange(item.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                text-sm font-medium transition-all duration-200 text-left w-full
                ${active
                  ? "text-white bg-brand-600/20 border border-brand-500/30"
                  : "text-surface-400 hover:text-white hover:bg-white/[0.04]"
                }
              `}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full"
                />
              )}
              <span className={active ? "text-brand-400" : ""}>{item.icon}</span>
              {item.label}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-2 text-[11px] text-surface-500">
        v2.0.0 · Built with yt-dlp
      </div>
    </aside>
  );
}
