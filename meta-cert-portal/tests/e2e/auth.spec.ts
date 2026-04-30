// Run with:
//   pnpm add -D @playwright/test
//   pnpm exec playwright install --with-deps
//   pnpm exec playwright test tests/e2e/auth.spec.ts
//
// These three tests verify the middleware redirects from
// `02-auth-and-roles.md` § 9.

import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('Auth middleware', () => {
  test('logged-out user is redirected from /admin to /login with redirect param', async ({ page }) => {
    const response = await page.goto(`${BASE}/admin`);
    expect(page.url()).toMatch(/\/login\?redirect=%2Fadmin/);
    expect(response?.status()).toBeLessThan(400);
  });

  test('logged-out user is redirected from /dashboard to /login', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    expect(page.url()).toContain('/login');
  });

  test('public routes are reachable while logged out', async ({ page }) => {
    const home = await page.goto(`${BASE}/`);
    expect(home?.status()).toBeLessThan(400);
    expect(page.url()).toBe(`${BASE}/`);

    const health = await page.request.get(`${BASE}/api/health`);
    expect(health.status()).toBe(200);
    expect(await health.json()).toEqual({ ok: true });

    const login = await page.goto(`${BASE}/login`);
    expect(login?.status()).toBeLessThan(400);
    expect(page.url()).toContain('/login');
  });
});

test.describe('Login flow (requires running Supabase + a seeded test user)', () => {
  test.skip(!process.env.TEST_USER_EMAIL, 'Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run');

  test('successful password login lands on /dashboard', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
    await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);
    expect(page.url()).toContain('/dashboard');
  });

  test('learner cannot reach /admin (redirected to /dashboard)', async ({ page, context }) => {
    // Assumes the previous test left a session in this context.
    await page.goto(`${BASE}/admin`);
    await page.waitForURL(/\/dashboard/);
    expect(page.url()).toContain('/dashboard');
  });
});
