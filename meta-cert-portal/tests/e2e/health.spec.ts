import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test('health endpoint is reachable without auth', async ({ request }) => {
  const res = await request.get(`${BASE}/api/health`);
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test('robots.txt advertises the sitemap', async ({ request }) => {
  const res = await request.get(`${BASE}/robots.txt`);
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/Sitemap:/);
  expect(body).toMatch(/Disallow: \/admin/);
});

test('sitemap.xml lists at least the home page', async ({ request }) => {
  const res = await request.get(`${BASE}/sitemap.xml`);
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/<urlset/);
  expect(body).toMatch(/<loc>/);
});
