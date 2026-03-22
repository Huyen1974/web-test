import { expect, test } from '@playwright/test';

test.describe('Registries Layer 1', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/knowledge/registries');
		await expect(page.getByRole('heading', { name: 'Danh mục hệ thống' })).toBeVisible();
	});

	test('renders the expected summary headers', async ({ page }) => {
		const headers = await page.locator('table th, table [role="columnheader"]').allTextContents();

		expect(headers).toContain('Số lượng');
		expect(headers).toContain('Thành phần');
		expect(headers).toContain('Mồ côi');
		expect(headers).toContain('Xác minh');
	});

	test('keeps rows 1-10 visible, including the regression rows', async ({ page }) => {
		for (const code of ['CAT-ALL', 'CAT-MOL', 'CAT-CMP', 'CAT-MAT', 'CAT-PRD', 'CAT-BLD', 'CAT-SPE', 'CAT-ORP', 'CAT-PHA', 'CAT-UNM']) {
			await expect(page.getByText(code, { exact: true })).toBeVisible();
		}

		await expect(page.getByText('Phân loại loài')).toBeVisible();
		await expect(page.getByText('Mồ côi (Orphan)')).toBeVisible();
		await expect(page.getByText('Phantom')).toBeVisible();
		await expect(page.getByText('Không quản trị')).toBeVisible();
	});

	test('links to Species Matrix from the registries page', async ({ page }) => {
		await page.getByRole('link', { name: 'Species Matrix' }).click();
		await expect(page).toHaveURL(/\/knowledge\/registries\/species$/);
		await expect(page.getByRole('heading', { name: /Ma trận Loài/i })).toBeVisible();
	});

	test('shows at least 15 registry rows', async ({ page }) => {
		const rows = page.locator('table tbody tr');
		await expect(rows.first()).toBeVisible();
		expect(await rows.count()).toBeGreaterThanOrEqual(15);
	});
});
