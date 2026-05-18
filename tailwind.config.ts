import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["var(--font-inter)"],
        display: ["var(--font-syne)"],
      },
      colors: {
        bg:     "#080808",
        blue:   "#5468E0",
        blue2:  "#56B4F0",
        pink:   "#FF2D9B",
      },
    },
  },
  plugins: [],
};

export default config;
