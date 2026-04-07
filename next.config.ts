import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack config (used by `next dev` in Next.js 16+)
  turbopack: {},

  // Webpack config (used by `next build` for production)
  webpack: (config) => {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
};

export default nextConfig;