import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable Turbopack to avoid "too many open files" error
  experimental: {
    turbo: undefined,
  },
};

export default nextConfig;
