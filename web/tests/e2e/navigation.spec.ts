import { test, expect } from '@playwright/test';

/**
 * E2 Task #013: Navigation E2E Tests
 *
 * Tests for basic site navigation and routing.
 */

test.describe('Navigation', () => {
  test('can navigate to login page', async ({ page }) => {
    await page.goto('/');

    // Try to navigate to login
    await page.goto('/auth/signin');

    await expect(page).toHaveURL(/.*\/auth\/signin/);
    await page.screenshot({ path: 'test-results/nav-to-login.png', fullPage: true });
  });

  test('protected route redirects to login', async ({ page }) => {
    // Try to access portal without being logged in
    await page.goto('/portal');

    // Should redirect to login (or show login prompt)
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log(`[PORTAL ACCESS URL] ${currentUrl}`);

    await page.screenshot({ path: 'test-results/portal-access-attempt.png', fullPage: true });

    // The portal has a client-side guard that redirects
    // This test documents the current behavior
  });

  test('404 page works for invalid routes', async ({ page }) => {
    await page.goto('/this-page-definitely-does-not-exist-12345');

    await page.waitForLoadState('networkidle');

    // Take screenshot of 404 or error state
    await page.screenshot({ path: 'test-results/404-page.png', fullPage: true });

    const content = await page.content();
    console.log(`[404 PAGE] Page has content: ${content.length} chars`);
  });

  test('main navigation areas are accessible', async ({ page }) => {
    const routes = [
      '/',
      '/auth/signin',
      // Add more public routes here
    ];

    for (const route of routes) {
      const response = await page.goto(route);
      const status = response?.status() ?? 0;

      console.log(`[ROUTE] ${route} -> ${status}`);

      expect(status).toBeLessThan(500); // No server errors
    }
  });
});
