import { spawnSync } from "node:child_process";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const revision = (spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf-8",
}).stdout ?? "").trim().slice(0, 8) || "unknown";

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@paridade-risco/shared"],
  experimental: {
    // Keep containerized and CI builds within the memory available to Docker Desktop.
    cpus: 2,
    webpackMemoryOptimizations: true,
  },
};

export default withSerwist(nextConfig);
