import { expect, test } from '@playwright/test';

test.describe('Registries support pages', () => {
	test('health page renders summary cards and table rows', async ({ page }) => {
		await page.goto('/knowledge/registries/health');

		await expect(page.getByRole('heading', { name: /Registry Health/i })).toBeVisible();
		await expect(page.getByText('KHỚP', { exact: true })).toBeVisible();
		await expect(page.getByText('Orphan', { exact: true })).toBeVisible();
		await expect(page.getByText('Phantom', { exact: true })).toBeVisible();

		const headers = await page.locator('table th, table [role="columnheader"]').allTextContents();
		expect(headers).toContain('Collection');
		expect(headers).toContain('Nơi chứa');
		expect(headers).toContain('Nơi sinh');
		expect(headers).toContain('Gap');
		expect(headers).toContain('Trạng thái');

		const rows = page.locator('table tbody tr');
		await expect(rows.first()).toBeVisible();
		expect(await rows.count()).toBeGreaterThan(0);
	});

	test('unmanaged page renders observed and excluded collections', async ({ page }) => {
		await page.goto('/knowledge/registries/unmanaged');

		await expect(page.getByRole('heading', { name: 'Collections không quản trị' })).toBeVisible();
		await expect(page.getByRole('cell', { name: 'observed', exact: true })).toBeVisible();
		await expect(page.getByRole('cell', { name: 'excluded', exact: true })).toBeVisible();

		const rows = page.locator('table tbody tr');
		await expect(rows.first()).toBeVisible();
		expect(await rows.count()).toBeGreaterThan(0);
	});
});
