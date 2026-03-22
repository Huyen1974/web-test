import { expect, test } from '@playwright/test';

test.describe('Species Matrix', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/knowledge/registries/species');
		await expect(page.getByRole('heading', { name: /Ma trận Loài/i })).toBeVisible();
	});

	test('shows the Species Matrix headers and at least 33 species rows', async ({ page }) => {
		const headers = await page.locator('table th, table [role="columnheader"]').allTextContents();

		expect(headers).toContain('Mã loài');
		expect(headers).toContain('Tên loài');
		expect(headers).toContain('Lớp');
		expect(headers).toContain('Tổng');

		const rows = page.locator('table tbody tr');
		await expect(rows.first()).toBeVisible();
		expect(await rows.count()).toBeGreaterThanOrEqual(33);
	});

	test('renders the TOTAL summary row', async ({ page }) => {
		await expect(page.getByText('TOTAL', { exact: true })).toBeVisible();
	});
});
