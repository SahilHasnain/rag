import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Increase body size limit for large PDF uploads (100MB)
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
