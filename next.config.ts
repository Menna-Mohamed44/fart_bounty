import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// Anchor tracing to this app so Next does not pick a parent folder that also has package-lock.json
const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: configDir,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
