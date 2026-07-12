// src/pages/SettingsPage.tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Zap } from "lucide-react";
import type { AppSettings, Theme } from "../types";
import { settingsApi } from "../services/settingsApi";
import { useThemeStore } from "../store/themeStore";
import toast from "react-hot-toast";

const THEMES: { id: Theme; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "dark",   label: "Dark",   icon: <Moon size={18} />,    desc: "Deep navy surfaces" },
  { id: "light",  label: "Light",  icon: <Sun size={18} />,     desc: "Clean white UI" },
  { id: "amoled", label: "AMOLED", icon: <Zap size={18} />,     desc: "Pure black for OLED" },
];

const QUALITIES = ["best", "2160", "1440", "1080", "720", "480", "360", "240", "144"];
const BITRATES = ["320", "256", "192", "128", "96", "64"];
const FORMATS = ["video", "audio"] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const [settings, setSettings] = useState<AppSettings>({
    default_quality: "best",
    default_format: "video",
    default_bitrate: "192",
    theme: "dark",
    language: "en",
    max_concurrent_downloads: 3,
    auto_download_thumbnail: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi.get().then(setSettings).catch(() => {});
  }, []);

  const update = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleThemeChange = (t: Theme) => {
    setTheme(t);
    update("theme", t);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.update(settings);
      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-24 lg:pb-8 space-y-6">
      <h1 className="font-display text-xl font-bold text-white">Settings</h1>

      {/* Theme */}
      <Section title="Appearance">
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <motion.button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              whileTap={{ scale: 0.97 }}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                (settings.theme === t.id || theme === t.id)
                  ? "bg-brand-600/15 border-brand-500/40 text-brand-400"
                  : "bg-surface-800 border-transparent text-surface-400 hover:text-white"
              }`}
            >
              {t.icon}
              <span className="text-xs font-semibold">{t.label}</span>
              <span className="text-[10px] text-surface-500">{t.desc}</span>
            </motion.button>
          ))}
        </div>
      </Section>

      {/* Defaults */}
      <Section title="Download Defaults">
        <SettingRow label="Default Format">
          <div className="flex gap-2">
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => update("default_format", f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  settings.default_format === f
                    ? "bg-brand-600 text-white"
                    : "bg-surface-800 text-surface-400 hover:text-white"
                }`}
              >
                {f === "video" ? "MP4" : "MP3"}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Default Quality">
          <select
            value={settings.default_quality}
            onChange={(e) => update("default_quality", e.target.value)}
            className="bg-surface-800 border border-white/[0.06] text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-brand-500/40"
          >
            {QUALITIES.map((q) => (
              <option key={q} value={q}>{q === "best" ? "Best Available" : `${q}p${q === "2160" ? " (4K)" : ""}`}</option>
            ))}
          </select>
        </SettingRow>

        <SettingRow label="Default Audio Bitrate">
          <select
            value={settings.default_bitrate}
            onChange={(e) => update("default_bitrate", e.target.value)}
            className="bg-surface-800 border border-white/[0.06] text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-brand-500/40"
          >
            {BITRATES.map((b) => (
              <option key={b} value={b}>{b} kbps</option>
            ))}
          </select>
        </SettingRow>

        <SettingRow label="Max Concurrent Downloads">
          <div className="flex gap-2">
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                onClick={() => update("max_concurrent_downloads", n)}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                  settings.max_concurrent_downloads === n
                    ? "bg-brand-600 text-white"
                    : "bg-surface-800 text-surface-400 hover:text-white"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </SettingRow>
      </Section>

      {/* Save */}
      <motion.button
        onClick={handleSave}
        disabled={saving}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-colors shadow-glow-sm disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Settings"}
      </motion.button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-4 space-y-4">
      <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-white">{label}</span>
      {children}
    </div>
  );
}
