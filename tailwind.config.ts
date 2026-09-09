import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0a0f1d",
        foreground: "#f8fafc",
        surface: {
          DEFAULT: "#0f172a",
          card: "#131e36",
          hover: "#1a2948",
          border: "#1e293b",
          borderLight: "#334155",
          muted: "#94a3b8"
        },
        market: {
          green: "#10b981",
          greenBg: "rgba(16, 185, 129, 0.12)",
          red: "#f43f5e",
          redBg: "rgba(244, 63, 94, 0.12)",
          blue: "#38bdf8",
          blueBg: "rgba(56, 189, 248, 0.12)",
          yellow: "#f59e0b",
          yellowBg: "rgba(245, 158, 11, 0.12)",
          purple: "#a855f7"
        }
      },
    },
  },
  plugins: [],
};
export default config;

