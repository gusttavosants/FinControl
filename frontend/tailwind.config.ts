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
        accent: {
          50: "#f5ffe6",
          100: "#e6ffbf",
          200: "#d4ff80",
          300: "#c2ff40",
          400: "#b8ff1a",
          500: "#a3e635",
          600: "#84cc16",
          700: "#65a30d",
          800: "#4d7c0f",
          900: "#365314",
        },
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        surface: {
          50: "#1a1d2e",
          100: "#161824",
          200: "#12141f",
          300: "#0e1019",
          400: "#0b0d14",
          500: "#080a10",
          600: "#06080d",
          700: "#04060a",
          800: "#020407",
          900: "#010204",
        },
        card: {
          DEFAULT: "#1a1d2e",
          hover: "#1f2237",
          border: "#2a2d3e",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      boxShadow: {
        glow: "0 0 20px rgba(163, 230, 53, 0.15)",
        card: "0 4px 24px rgba(0, 0, 0, 0.25)",
        "card-hover": "0 8px 32px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
