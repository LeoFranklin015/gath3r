import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "gateway.pinata.cloud" },
    ],
  },
};

export default nextConfig;
