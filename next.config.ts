import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep Turbopack scoped to this repo so sibling lockfiles do not distort module resolution.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
