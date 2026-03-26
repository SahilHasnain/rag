import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Increase body size limit for large PDF uploads (100MB)
    serverActions: {
      bodySizeLimit: '100mb',
      // Increase timeout to 5 minutes for large file uploads
      allowedOrigins: ['*'],
    },
  },
  // Increase API route timeout
  serverExternalPackages: ['better-sqlite3', 'pdf-parse'],
};

export default nextConfig;
