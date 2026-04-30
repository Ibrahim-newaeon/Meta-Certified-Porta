import type { MetadataRoute } from 'next';

// Only public marketing surfaces. Everything else is auth-gated; track and
// lesson URLs intentionally aren't listed because RLS would block crawlers
// anyway and we don't want learner-facing routes indexed.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
