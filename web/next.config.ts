import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "gateway.pinata.cloud" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "https://gather.philotheephilix.in/:path*",
      },
    ];
  },
};

export default nextConfig;
