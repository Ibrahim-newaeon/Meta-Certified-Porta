import type { MetadataRoute } from 'next';

// SECURITY: the only public surfaces are /, /login, /register. Everything
// else is auth-gated and uninteresting to crawlers — disallow it explicitly
// so signed login URLs and admin routes don't show up in search results.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register'],
        disallow: ['/dashboard', '/tracks', '/lessons', '/exam', '/admin', '/api'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
