import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compress responses
  compress: true,

  // Standalone output for smaller Docker/EC2 deployments
  // output: 'standalone',

  // Experimental features for performance
  experimental: {
    // Parallelise route rendering
    serverActions: { bodySizeLimit: "2mb" },
  },

  // Custom HTTP response headers — cache static assets aggressively
  async headers() {
    return [
      {
        // Next.js static chunks — cache forever (they have hash in filename)
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Authenticated & dynamic API routes must never be cached publicly on the CDN
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
