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

  // pdfjs-dist's legacy build is loaded via dynamic import (`pdfjs-dist/legacy/
  // build/pdf.mjs`). Next's tracer can't always follow string-constructed paths
  // into the standalone bundle, so on Railway/Docker the file is missing at
  // runtime → extraction fails silently. Marking it server-external loads the
  // package straight from node_modules at runtime instead of trying to bundle.
  serverExternalPackages: ['pdfjs-dist'],
};

export default nextConfig;
