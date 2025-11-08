import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Workaround for React 19 + Next.js 15 error page generation issue
  // This prevents Next.js from trying to prerender default error pages
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
