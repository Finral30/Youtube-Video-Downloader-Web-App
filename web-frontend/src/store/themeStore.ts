// src/store/themeStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Theme } from "../types";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => {
        set({ theme });
        // Apply to DOM
        document.documentElement.setAttribute("data-theme", theme);
        if (theme === "light") {
          document.documentElement.classList.remove("dark");
        } else {
          document.documentElement.classList.add("dark");
        }
      },
    }),
    { name: "ytdl-theme" }
  )
);

// Apply theme on load
const savedTheme = useThemeStore.getState().theme;
document.documentElement.setAttribute("data-theme", savedTheme);
if (savedTheme !== "light") {
  document.documentElement.classList.add("dark");
}
