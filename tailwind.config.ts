import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"]
      },
      colors: {
        blush: "#ffd7e8",
        skywash: "#d8ecff",
        minty: "#d8f8df",
        lavender: "#e8ddff",
        butter: "#fff0b8",
        ink: "#22223b"
      },
      boxShadow: {
        pastel: "0 18px 60px rgba(116, 91, 255, 0.14)",
        soft: "0 12px 32px rgba(31, 41, 55, 0.10)"
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pop: "pop 220ms ease-out"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" }
        },
        pop: {
          "0%": { transform: "scale(0.98)", opacity: "0.75" },
          "100%": { transform: "scale(1)", opacity: "1" }
        }
      }
    }
  },
  plugins: []
};

export default config;
