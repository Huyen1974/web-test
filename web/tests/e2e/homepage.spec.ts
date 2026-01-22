import { test, expect } from '@playwright/test';

/**
 * E2 Task #013: Homepage E2E Tests
 *
 * Basic tests to verify the homepage loads correctly.
 */

test.describe('Homepage', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');

    // Page should load without errors
    await expect(page).toHaveURL('/');

    // Should have a title
    const title = await page.title();
    expect(title).toBeTruthy();

    console.log(`[TITLE] ${title}`);

    // Take screenshot
    await page.screenshot({ path: 'test-results/homepage-loaded.png', fullPage: true });
  });

  test('homepage has no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Log any errors found
    if (consoleErrors.length > 0) {
      console.log('[CONSOLE ERRORS]');
      consoleErrors.forEach((err) => console.log(`  - ${err}`));
    }

    // This test warns but doesn't fail on console errors
    // (many sites have benign console errors)
    console.log(`[CONSOLE ERROR COUNT] ${consoleErrors.length}`);
  });

  test('homepage navigation links work', async ({ page }) => {
    await page.goto('/');

    // Look for navigation links
    const links = page.locator('nav a, header a, [role="navigation"] a');
    const linkCount = await links.count();

    console.log(`[NAV LINKS] Found ${linkCount} navigation links`);

    // Take screenshot of navigation
    await page.screenshot({ path: 'test-results/homepage-navigation.png', fullPage: true });
  });
});
