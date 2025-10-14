import { test, expect } from '@playwright/test';

const LOGIN_BUTTON_LABEL = 'Đăng nhập bằng Google';
const LOGOUT_BUTTON_LABEL = 'Đăng xuất';

// Reusable login helper function
export async function loginUser(page) {
  const loginButton = page.getByRole('button', { name: LOGIN_BUTTON_LABEL });
  await expect(loginButton).toBeVisible();
  await loginButton.click();

  // Wait for login to complete - check for logout button
  const signOutButton = page.getByRole('button', { name: LOGOUT_BUTTON_LABEL });
  await expect(signOutButton).toBeVisible();
}

// Reusable logout helper function
export async function logoutUser(page) {
  const signOutButton = page.getByRole('button', { name: LOGOUT_BUTTON_LABEL });
  await expect(signOutButton).toBeVisible();
  await signOutButton.click();

  // Wait for logout to complete - check for login button
  const loginButton = page.getByRole('button', { name: LOGIN_BUTTON_LABEL });
  await expect(loginButton).toBeVisible();
}

test.describe('Authentication smoke flow', () => {
  test('allows a user to sign in and sign out', async ({ page }) => {
    await page.goto('/');

    await loginUser(page);
    await logoutUser(page);
  });
});
