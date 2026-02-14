import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // Include snap-auth package components for Tailwind to scan
    "../../packages/snap-auth/src/**/*.{js,ts,jsx,tsx}",
    "../../packages/snap-auth/dist/**/*.{js,mjs}",
  ],
  theme: {
    extend: {
      colors: {
        // 活力橙 (Vibrant Orange) - Primary theme for JSS-Web
        // Focus: Energy, action, construction site vibrancy
        primary: {
          DEFAULT: "#F97316", // Vibrant orange
          dark: "#EA580C",
          light: "#FB923C",
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
        },
        // Use primary orange as accent
        accent: {
          DEFAULT: "#F97316",
          dark: "#EA580C",
          light: "#FB923C",
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
        },
      },
    },
  },
  plugins: [],
};
export default config;
