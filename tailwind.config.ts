import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'bee-yellow': '#FFD700',
        'bee-orange': '#FFB800',
        'bee-black': '#0A0A0A',
        'bee-dark': '#121212',
        'bee-gray': '#1F1F1F',
      },
      backgroundImage: {
        'bee-mesh': "radial-gradient(at 0% 0%, rgba(255, 215, 0, 0.15) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(255, 184, 0, 0.1) 0, transparent 50%)",
      }
    },
  },
  plugins: [],
};

export default config;