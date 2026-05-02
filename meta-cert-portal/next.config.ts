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

  // unpdf is the server-side PDF text extractor (pdfjs-dist's Node build
  // throws "DOMMatrix is not defined" without browser globals). Marking it
  // server-external keeps Next from bundling its dynamic-imported sub-paths
  // and just loads it from node_modules at runtime.
  //
  // pdfjs-dist itself is kept in the list because react-pdf depends on it
  // transitively for client-side rendering — it should not be bundled into
  // server output.
  serverExternalPackages: ['unpdf', 'pdfjs-dist'],
};

export default nextConfig;
