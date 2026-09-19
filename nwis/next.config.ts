import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack (Next 16 default) — no webpack config needed
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.mapbox.com' },
    ],
  },
};

export default nextConfig;
