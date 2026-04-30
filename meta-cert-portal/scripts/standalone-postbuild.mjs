// Copies static assets into the standalone server output so it can serve
// /_next/static/* and files from /public/ at runtime.
//
// Vercel does this automatically; Railway, Docker, fly.io, etc. don't.
// Cross-platform via Node's fs.cpSync (Node 16.7+).
//
// Hooked from package.json's `postbuild` so it runs once after `next build`.

import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const standaloneDir = resolve('.next', 'standalone');

if (!existsSync(standaloneDir)) {
  // `output: 'standalone'` not enabled or build failed — nothing to do.
  console.log('[postbuild] .next/standalone not present, skipping copy');
  process.exit(0);
}

const copies = [
  { src: resolve('.next', 'static'), dst: resolve(standaloneDir, '.next', 'static') },
  { src: resolve('public'),          dst: resolve(standaloneDir, 'public') },
];

for (const { src, dst } of copies) {
  if (!existsSync(src)) {
    console.log(`[postbuild] ${src} not present, skipping`);
    continue;
  }
  cpSync(src, dst, { recursive: true });
  console.log(`[postbuild] copied ${src} -> ${dst}`);
}
