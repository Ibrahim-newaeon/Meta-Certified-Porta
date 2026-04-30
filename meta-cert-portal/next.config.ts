import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Emit a self-contained server build at .next/standalone/. Trims node_modules
  // to just the deps the runtime actually imports, which gives Railway/Docker
  // smaller images and faster cold starts.
  //
  // The standalone build does NOT copy .next/static/ or public/ into
  // .next/standalone/ — Vercel handles that automatically, but every other
  // deploy target needs the postbuild script in scripts/standalone-postbuild.mjs.
  output: 'standalone',
};

export default nextConfig;
