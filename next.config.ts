import type { NextConfig } from "next";

const backendApiBase = "http://127.0.0.1:8000/api";
const backendWsBase = "ws://127.0.0.1:8000/ws";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendApiBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
