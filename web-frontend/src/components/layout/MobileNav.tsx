// src/components/layout/MobileNav.tsx
import { motion } from "framer-motion";
import { Download, History, List, ListMusic, Settings } from "lucide-react";
import type { NavPage } from "../../types";

const NAV = [
  { id: "downloader" as NavPage, icon: <Download size={22} />, label: "Download" },
  { id: "queue"      as NavPage, icon: <List size={22} />,     label: "Queue" },
  { id: "playlist"   as NavPage, icon: <ListMusic size={22} />, label: "Playlist" },
  { id: "history"    as NavPage, icon: <History size={22} />,  label: "History" },
  { id: "settings"   as NavPage, icon: <Settings size={22} />, label: "Settings" },
];

interface Props {
  current: NavPage;
  onChange: (page: NavPage) => void;
}

export default function MobileNav({ current, onChange }: Props) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-surface-900/90 backdrop-blur-xl border-t border-white/[0.06]">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {NAV.map((item) => {
          const active = current === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onChange(item.id)}
              whileTap={{ scale: 0.9 }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                active ? "text-brand-400" : "text-surface-400"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="mobile-indicator"
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-400 rounded-full"
                />
              )}
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
