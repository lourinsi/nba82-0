import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "cdn.nba.com",
        pathname: "/headshots/nba/latest/260x190/**",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
