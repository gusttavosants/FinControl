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
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e5ff",
          200: "#bcd2ff",
          300: "#8eb4ff",
          400: "#598bff",
          500: "#3366ff",
          600: "#1a4fff",
          700: "#0d3beb",
          800: "#1132be",
          900: "#142f95",
        },
        accent: {
          50: "#edfcf2",
          100: "#d3f8e0",
          200: "#aaf0c6",
          300: "#73e2a4",
          400: "#3bcc7e",
          500: "#17b364",
          600: "#0b9050",
          700: "#097342",
          800: "#0a5b36",
          900: "#094b2e",
        },
        danger: {
          50: "#fff1f2",
          100: "#ffe1e3",
          200: "#ffc8cc",
          300: "#ffa1a8",
          400: "#ff6b76",
          500: "#f93a4a",
          600: "#e71d30",
          700: "#c21325",
          800: "#a01323",
          900: "#841623",
        },
        warn: {
          50: "#fff8eb",
          100: "#ffedc6",
          200: "#ffd888",
          300: "#ffbe4a",
          400: "#ffa520",
          500: "#f98307",
          600: "#dd5f02",
          700: "#b74006",
          800: "#94310c",
          900: "#7a290d",
        },
        surface: {
          0: "#ffffff",
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        glass: "0 4px 30px rgba(0, 0, 0, 0.06)",
        "glass-lg": "0 8px 40px rgba(0, 0, 0, 0.08)",
        "glass-xl": "0 12px 60px rgba(0, 0, 0, 0.1)",
        card: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 10px 40px rgba(0, 0, 0, 0.08)",
        "glow-brand": "0 0 24px rgba(51, 102, 255, 0.15)",
        "glow-accent": "0 0 24px rgba(23, 179, 100, 0.15)",
        "glow-danger": "0 0 24px rgba(249, 58, 74, 0.15)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glass-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
        "dark-glass":
          "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.85) 100%)",
        "mesh-1":
          "radial-gradient(at 40% 20%, rgba(51,102,255,0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(23,179,100,0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(249,58,74,0.04) 0px, transparent 50%)",
        "mesh-dark":
          "radial-gradient(at 40% 20%, rgba(51,102,255,0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(23,179,100,0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(249,58,74,0.06) 0px, transparent 50%)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
