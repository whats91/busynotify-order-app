/*
 * File Context:
 * Purpose: Defines the project file for Next.Config.
 * Primary Functionality: Provides file-specific behavior or configuration for the surrounding project module.
 * Interlinked With: No direct internal imports; primarily used by framework or toolchain entry points.
 * Role: shared project asset.
 */
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
