import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@keeper.sh/auth"],
  cacheComponents: true,
};

export default nextConfig;
