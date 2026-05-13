import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gallery: {
          900: "#0A0A0A",
          800: "#141414",
          700: "#1E1E1E",
          600: "#2A2A2A",
          500: "#3A3A3A",
          400: "#5A5A5A",
          300: "#8A8A8A",
          200: "#B0B0B0",
          100: "#D4D4D4",
          50:  "#F0ECE3",
        },
        gold: {
          500: "#C9A84C",
          400: "#D4B96A",
          300: "#E2CC8A",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        body: ['"Inter"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
