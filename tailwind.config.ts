import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Status palette used across dashboard + reports
        flag: {
          red: "#dc2626",
          amber: "#f59e0b",
          yellow: "#eab308",
          green: "#16a34a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
