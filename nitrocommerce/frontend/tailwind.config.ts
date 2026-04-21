import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nitro: {
          bg: "#0b0d12",
          panel: "#12151c",
          accent: "#22d3ee",
          danger: "#ef4444",
          ok: "#10b981",
        },
      },
    },
  },
  plugins: [],
};

export default config;
