import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@paridade-risco/shared"],
};

export default nextConfig;
