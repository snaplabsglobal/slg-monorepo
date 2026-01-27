import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 建筑蓝 (Architectural Blue) - Primary brand color
        primary: {
          DEFAULT: "#1E40AF", // Deep professional blue
          dark: "#1E3A8A",    // Darker shade
          light: "#3B82F6",   // Lighter shade
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        // 活力橙 (Vibrant Orange) - Secondary accent color
        accent: {
          DEFAULT: "#F97316", // Vibrant orange
          dark: "#EA580C",    // Darker shade
          light: "#FB923C",   // Lighter shade
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
        // Background colors
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Ring colors for focus states
        ring: "#1E40AF",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
export default config;
