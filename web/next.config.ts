import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      { hostname: "gateway.pinata.cloud" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "https://gath3r.philotheephilix.in/:path*",
      },
    ];
  },
};

export default nextConfig;
