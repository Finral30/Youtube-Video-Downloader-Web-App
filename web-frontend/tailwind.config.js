/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // Brand
        brand: {
          50:  "#f0f4ff",
          100: "#dde7ff",
          200: "#b4c9ff",
          300: "#7ba3ff",
          400: "#4178ff",
          500: "#1a56ff",
          600: "#0038f5",
          700: "#002bd4",
          800: "#0024ab",
          900: "#001f87",
          950: "#00145c",
        },
        // Dark surface palette
        surface: {
          950: "#070a0f",
          900: "#0d1117",
          850: "#111620",
          800: "#161b27",
          750: "#1c2230",
          700: "#212838",
          600: "#2d3748",
          500: "#3d4a5c",
          400: "#4e5e72",
        },
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #1a56ff 0%, #7c3aed 100%)",
        "gradient-surface": "linear-gradient(180deg, #111620 0%, #0d1117 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 2s linear infinite",
        shimmer: "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        glow: "0 0 20px rgba(26,86,255,0.35)",
        "glow-sm": "0 0 10px rgba(26,86,255,0.25)",
      },
    },
  },
  plugins: [],
};
