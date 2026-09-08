import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary action — the Alkarma brand red, taken from the live site.
        brand: {
          DEFAULT: "#CD201F",
          dark: "#A81A19",
          light: "#FDECEC",
          pale: "#FDECEC",
        },
        // Text tones — the live site sets plain black body copy on white.
        ink: {
          DEFAULT: "#000000",
          soft: "#333333",
          muted: "#696969",
        },
        // Page + card surfaces. `paper` is the card/header white, `mid` the
        // page ground behind it, `dark` the hairline border between them.
        paper: {
          DEFAULT: "#FFFFFF",
          mid: "#F0F0F0",
          dark: "#DDDDDD",
        },
        // Loyalty / premium accent
        gold: "#B5922A",
        // Admin sidebar
        "admin-sidebar": "#1e293b", // slate-800
        "admin-accent": "#3b82f6", // blue-500
        // Status
        success: "#2E7D52",
        // Legacy neutral greys (kept for admin UI)
        grey: {
          light: "#f5f5f5",
          mid: "#e0e0e0",
          text: "#666666",
          border: "#dddddd",
        },
      },
      fontFamily: {
        // Cairo throughout — the typeface the live site uses for body,
        // headings and prices alike. Arabic-first with Latin coverage, so a
        // single family handles mixed Arabic/Latin strings (ISBNs, "EGP")
        // without a fallback swap mid-line.
        sans: ["var(--font-cairo)", "system-ui", "sans-serif"],
        display: ["var(--font-cairo)", "system-ui", "sans-serif"],
        "sans-ar": ["var(--font-cairo)", "system-ui", "sans-serif"],
        // `font-mono` is kept as a token because ~10 components still use it
        // for small overline labels — but it MUST resolve to Cairo. A real mono
        // stack has no Arabic glyphs, so Arabic set in it falls back per
        // character and the cursive joins break visibly.
        mono: ["var(--font-cairo)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": "0.625rem",
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "2px",
        md: "4px",
      },
      boxShadow: {
        book: "0 2px 8px rgba(0,0,0,0.1)",
        "book-hover": "0 8px 24px rgba(0,0,0,0.15)",
        card: "0 1px 6px rgba(0,0,0,0.08)",
        "card-hover": "0 6px 20px rgba(0,0,0,0.12)",
      },
      screens: {
        xs: "480px",
      },
      maxWidth: {
        "8xl": "1400px",
      },
    },
  },
  plugins: [typography],
};

export default config;
