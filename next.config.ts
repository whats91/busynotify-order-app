import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Disable trailing slashes to prevent redirect loop with gateway/proxy
  trailingSlash: false,
  // Skip trailing slash redirects entirely
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
