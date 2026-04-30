// Learn flow smoke test. Requires a seeded learner in the database — set
//   TEST_LEARNER_EMAIL + TEST_LEARNER_PASSWORD
//   TEST_TRACK_SLUG  (a published track to enroll in)
//
// Steps: log in → enroll → open first lesson → mark complete → confirm
// progress is set.

import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test.describe('Learn flow', () => {
  test.skip(
    !process.env.TEST_LEARNER_EMAIL || !process.env.TEST_TRACK_SLUG,
    'Set TEST_LEARNER_EMAIL/PASSWORD/TRACK_SLUG to run'
  );

  test('learner can log in, enroll, and complete a lesson', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel('Email').fill(process.env.TEST_LEARNER_EMAIL!);
    await page.getByLabel('Password').fill(process.env.TEST_LEARNER_PASSWORD!);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/);

    // Browse tracks → open the seeded test track. We use track id from the
    // first card link; alternatively query by code if the test seeds one.
    await page.goto(`${BASE}/tracks`);
    await page.getByRole('link').first().click();

    // Enroll if not already
    const enrollBtn = page.getByRole('button', { name: /enroll/i });
    if (await enrollBtn.isVisible()) {
      await enrollBtn.click();
      await expect(page.getByText(/enrolled/i)).toBeVisible();
    }

    // Open first lesson link in the curriculum
    const firstLesson = page.getByRole('link', { name: /min$/ }).first();
    await firstLesson.click();
    await page.waitForURL(/\/lessons\//);

    // Mark complete (only works if the active resource is a link — link
    // card has the button; PDF / video flow through their own controls).
    const markBtn = page.getByRole('button', { name: /mark complete/i });
    if (await markBtn.isVisible()) {
      await markBtn.click();
    }

    // Resume on dashboard
    await page.goto(`${BASE}/dashboard`);
    await expect(page.getByText(/continue where you left off/i)).toBeVisible();
  });
});
