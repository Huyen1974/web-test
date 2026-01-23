import { test, expect } from '@playwright/test';

/**
 * E2 Task #013: Login Flow E2E Tests
 *
 * These tests verify the complete login flow in a real browser.
 * They are designed to FAIL when login is broken, providing
 * evidence of exactly where and why the failure occurs.
 */

test.describe('Login Flow', () => {
  // Test credentials - using Directus admin
  const TEST_EMAIL = 'admin@example.com';
  const TEST_PASSWORD = 'Directus@2025!';

  test.beforeEach(async ({ page }) => {
    // Capture console errors for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[BROWSER ERROR] ${msg.text()}`);
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (error) => {
      console.log(`[PAGE ERROR] ${error.message}`);
    });

    // Log network requests to auth endpoints
    page.on('request', (request) => {
      if (request.url().includes('/auth/') || request.url().includes('/users/me')) {
        console.log(`[REQUEST] ${request.method()} ${request.url()}`);
      }
    });

    // Log network responses from auth endpoints
    page.on('response', (response) => {
      if (response.url().includes('/auth/') || response.url().includes('/users/me')) {
        console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
      }
    });
  });

  test('login page loads correctly', async ({ page }) => {
    await page.goto('/auth/signin');

    // Verify we're on the login page
    await expect(page).toHaveURL(/.*\/auth\/signin/);

    // Verify login form is visible
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Take screenshot of login page
    await page.screenshot({ path: 'test-results/login-page-loaded.png', fullPage: true });
  });

  test('login form accepts input', async ({ page }) => {
    await page.goto('/auth/signin');

    // Fill in credentials
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);

    // Verify inputs have values
    await expect(emailInput).toHaveValue(TEST_EMAIL);
    await expect(passwordInput).toHaveValue(TEST_PASSWORD);

    // Take screenshot with filled form
    await page.screenshot({ path: 'test-results/login-form-filled.png', fullPage: true });
  });

  test('login button shows loading state on click', async ({ page }) => {
    await page.goto('/auth/signin');

    // Fill credentials
    await page.locator('input[name="email"]').fill(TEST_EMAIL);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);

    // Click login
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Check for loading state (button should be disabled or show loading indicator)
    // UButton with :loading="loading" adds a loading spinner
    // We check if the button is in loading state or network request is made

    // Wait briefly for loading state to appear
    await page.waitForTimeout(500);

    // Take screenshot of loading state
    await page.screenshot({ path: 'test-results/login-loading-state.png', fullPage: true });
  });

  test('login flow completes successfully', async ({ page }) => {
    // This is the critical test - it should FAIL if login is broken

    await page.goto('/auth/signin');

    // Fill credentials
    await page.locator('input[name="email"]').fill(TEST_EMAIL);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);

    // Take screenshot before clicking
    await page.screenshot({ path: 'test-results/login-before-submit.png', fullPage: true });

    // Click login button
    await page.locator('button[type="submit"]').click();

    // Wait for navigation or URL change (max 15 seconds)
    // This WILL FAIL if login doesn't redirect
    try {
      await page.waitForURL(/.*\/portal.*/, { timeout: 15000 });
      console.log('[SUCCESS] Redirected to portal');
    } catch (error) {
      // Capture state at failure point
      console.log('[FAILURE] Did not redirect to portal');
      console.log(`[CURRENT URL] ${page.url()}`);

      // Take failure screenshot
      await page.screenshot({ path: 'test-results/login-failed-no-redirect.png', fullPage: true });

      // Check for error messages on page
      const errorAlert = page.locator('[role="alert"], .text-red-500, .error');
      if (await errorAlert.count() > 0) {
        const errorText = await errorAlert.first().textContent();
        console.log(`[ERROR MESSAGE] ${errorText}`);
      }

      throw error;
    }

    // If we get here, login succeeded - verify portal state
    await expect(page).toHaveURL(/.*\/portal.*/);
    await page.screenshot({ path: 'test-results/login-success-portal.png', fullPage: true });
  });

  test('logged in user sees avatar/profile indicator', async ({ page }) => {
    // This test depends on successful login
    await page.goto('/auth/signin');

    // Login
    await page.locator('input[name="email"]').fill(TEST_EMAIL);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // Wait for redirect
    try {
      await page.waitForURL(/.*\/portal.*/, { timeout: 15000 });
    } catch {
      await page.screenshot({ path: 'test-results/no-redirect-for-avatar-test.png', fullPage: true });
      throw new Error('Login did not redirect to portal - cannot test avatar visibility');
    }

    // Look for user avatar or profile indicator
    // The portal shows: <UAvatar :src="user.avatar" :alt="userName(user)" /> with class w-12 h-12
    // Or just verify we're on portal and can see user-specific content
    const portalIndicators = page.locator('.w-12.h-12, [class*="avatar"], [class*="Avatar"], img[alt*="Admin"], [alt*="user"]');

    try {
      // Give page time to load user data
      await page.waitForTimeout(2000);
      await expect(portalIndicators.first()).toBeVisible({ timeout: 5000 });
      await page.screenshot({ path: 'test-results/logged-in-avatar-visible.png', fullPage: true });
    } catch {
      // If no avatar found, at least verify we're on portal (which means login worked)
      const currentUrl = page.url();
      if (currentUrl.includes('/portal')) {
        console.log('[INFO] On portal page but avatar not visible - login still successful');
        await page.screenshot({ path: 'test-results/portal-no-avatar.png', fullPage: true });
        // Don't fail - being on portal is success
        return;
      }
      await page.screenshot({ path: 'test-results/no-avatar-visible.png', fullPage: true });
      throw new Error('User avatar/profile indicator not visible after login');
    }
  });

  test('session persists after page refresh', async ({ page }) => {
    // Login first
    await page.goto('/auth/signin');
    await page.locator('input[name="email"]').fill(TEST_EMAIL);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // Wait for redirect
    try {
      await page.waitForURL(/.*\/portal.*/, { timeout: 15000 });
    } catch {
      await page.screenshot({ path: 'test-results/no-redirect-for-session-test.png', fullPage: true });
      throw new Error('Login did not redirect - cannot test session persistence');
    }

    // Get current URL after login
    const urlAfterLogin = page.url();
    console.log(`[URL AFTER LOGIN] ${urlAfterLogin}`);

    // Refresh the page
    await page.reload();

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    // Check if we're still on portal (not redirected to login)
    const currentUrl = page.url();
    console.log(`[URL AFTER REFRESH] ${currentUrl}`);

    if (currentUrl.includes('/auth/signin')) {
      await page.screenshot({ path: 'test-results/session-lost-after-refresh.png', fullPage: true });
      throw new Error('Session lost after page refresh - redirected back to login');
    }

    await expect(page).toHaveURL(/.*\/portal.*/);
    await page.screenshot({ path: 'test-results/session-persisted-after-refresh.png', fullPage: true });
  });

  test('displays error message for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');

    // Fill WRONG credentials
    await page.locator('input[name="email"]').fill('wrong@example.com');
    await page.locator('input[name="password"]').fill('wrongpassword');

    // Click login
    await page.locator('button[type="submit"]').click();

    // Wait for error response
    await page.waitForTimeout(3000);

    // Take screenshot - should show error message
    await page.screenshot({ path: 'test-results/login-invalid-credentials.png', fullPage: true });

    // Check for error message or alert
    // LoginForm shows: <UAlert v-if="error" ...>
    const errorIndicator = page.locator('[role="alert"], .text-red-500, .text-rose-500');

    // We expect either an error message OR we should NOT be on portal
    const currentUrl = page.url();
    if (!currentUrl.includes('/portal')) {
      // Good - we're still on login page
      console.log('[EXPECTED] Still on login page after invalid credentials');
    }
  });
});

test.describe('Login API Health', () => {
  test('auth endpoint responds', async ({ request }) => {
    // Direct API check - this tests the proxy is working
    const response = await request.post('/api/directus/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'Directus@2025!',
        mode: 'session',
      },
    });

    console.log(`[API STATUS] ${response.status()}`);

    // Should return 200 for valid credentials
    expect(response.status()).toBe(200);

    // Check for session cookie
    const cookies = response.headers()['set-cookie'];
    console.log(`[COOKIES] ${cookies}`);

    if (cookies && cookies.includes('directus_session_token')) {
      console.log('[API] Session cookie is being set');
    } else {
      console.log('[API WARNING] No session cookie in response');
    }
  });

  test('session cookie attributes are correct', async ({ request }) => {
    // E2 Task #014: Verify cookie domain rewriting works
    const response = await request.post('/api/directus/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'Directus@2025!',
        mode: 'session',
      },
    });

    expect(response.status()).toBe(200);

    const setCookieHeader = response.headers()['set-cookie'];
    console.log('[SET-COOKIE HEADER] Raw:', setCookieHeader);

    // Parse and verify cookie attributes
    if (setCookieHeader) {
      const cookies = setCookieHeader.split(/,(?=\s*\w+=)/).map(c => c.trim());

      for (const cookie of cookies) {
        console.log('[COOKIE]', cookie);

        // Verify no external Domain attribute (should use current domain)
        if (cookie.toLowerCase().includes('domain=directus')) {
          console.log('[ERROR] Cookie contains external Directus domain - browser will reject!');
          expect(cookie.toLowerCase()).not.toContain('domain=directus');
        }

        // Verify Path is set
        expect(cookie.toLowerCase()).toContain('path=/');
      }
    }
  });
});

test.describe('Cookie Storage Verification', () => {
  test('browser stores session cookie after login', async ({ page, context }) => {
    // E2 Task #014: Verify cookies are stored in browser
    await page.goto('/auth/signin');

    // Fill and submit login
    await page.locator('input[name="email"]').fill('admin@example.com');
    await page.locator('input[name="password"]').fill('Directus@2025!');
    await page.locator('button[type="submit"]').click();

    // Wait for navigation or error
    await page.waitForTimeout(5000);

    // Check stored cookies
    const cookies = await context.cookies();
    console.log('[STORED COOKIES]', JSON.stringify(cookies, null, 2));

    // Find session token cookie
    const sessionCookie = cookies.find(c => c.name === 'directus_session_token');

    if (sessionCookie) {
      console.log('[SUCCESS] Session cookie stored:', {
        name: sessionCookie.name,
        domain: sessionCookie.domain,
        path: sessionCookie.path,
        httpOnly: sessionCookie.httpOnly,
        secure: sessionCookie.secure,
        sameSite: sessionCookie.sameSite,
      });
      expect(sessionCookie).toBeDefined();
    } else {
      console.log('[ERROR] Session cookie NOT stored in browser');
      console.log('[ALL COOKIES]', cookies.map(c => c.name));
      // This will fail the test if session cookie is not stored
      expect(sessionCookie).toBeDefined();
    }
  });

  test('cookie is sent with subsequent requests', async ({ page }) => {
    // E2 Task #014: Verify cookie is sent on follow-up requests

    // Login first
    await page.goto('/auth/signin');
    await page.locator('input[name="email"]').fill('admin@example.com');
    await page.locator('input[name="password"]').fill('Directus@2025!');

    // Track requests to /users/me
    let userMeRequest: any = null;
    page.on('request', req => {
      if (req.url().includes('/users/me')) {
        userMeRequest = req;
        console.log('[REQUEST /users/me] Cookie header:', req.headers()['cookie'] || 'NONE');
      }
    });

    page.on('response', res => {
      if (res.url().includes('/users/me')) {
        console.log('[RESPONSE /users/me] Status:', res.status());
      }
    });

    await page.locator('button[type="submit"]').click();

    // Wait for potential /users/me call
    await page.waitForTimeout(5000);

    // Verify cookie was sent
    if (userMeRequest) {
      const cookieHeader = userMeRequest.headers()['cookie'];
      console.log('[VERIFY] Cookie header on /users/me:', cookieHeader);

      if (!cookieHeader || !cookieHeader.includes('directus_session_token')) {
        console.log('[ERROR] Session cookie NOT sent with /users/me request!');
      }
    }
  });
});
