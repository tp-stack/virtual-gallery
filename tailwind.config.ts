import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        museum: {
          black: "#050505",
          dark: "#0D0D0D",
          surface: "#161616",
          border: "#232323",
          ivory: "#F5F2EA",
          stone: "#B8B2A4",
          gold: "#C8A96A",
          white: "#E6E6E6",
          bluegray: "#8FA3B8",
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Helvetica Neue"', "Arial", "sans-serif"],
        display: ['"Inter"', '"Helvetica Neue"', "Arial", "sans-serif"],
      },
      letterSpacing: {
        wide: "0.08em",
        wider: "0.12em",
        widest: "0.16em",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
      },
      borderRadius: {
        museum: "12px",
        "museum-lg": "20px",
      },
      boxShadow: {
        museum: "0 4px 24px rgba(0,0,0,0.4)",
        "museum-sm": "0 2px 8px rgba(0,0,0,0.3)",
        "museum-glow": "0 0 60px rgba(200, 169, 106, 0.08)",
      },
      transitionDuration: {
        museum: "500ms",
      },
    },
  },
  plugins: [],
};
export default config;
