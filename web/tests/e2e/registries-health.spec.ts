import { expect, test } from '@playwright/test';
import type { ContractCard, TableContract } from './support/contracts';
import { getCellText, loadContract } from './support/contracts';

interface HealthContract extends TableContract {
	cards: ContractCard[];
}

const contract = loadContract<HealthContract>('health.json');

test.describe('Registries support pages', () => {
	test('health page renders summary cards and contract table rows', async ({ page }) => {
		await page.goto(contract.route);

		await expect(page.getByRole('heading', { name: /Registry Health/i })).toBeVisible();
		await expect(page.getByTestId(contract.table_testid)).toBeVisible();

		for (const card of contract.cards) {
			const locator = page.getByTestId(card.testid);
			await expect(locator).toBeVisible();
			await expect(locator).toContainText(card.label);
		}

		for (const column of contract.columns) {
			await expect(page.getByTestId(column.testid)).toHaveText(column.label);
		}

		const rows = page.locator(`[data-testid="${contract.table_testid}"] tbody tr`);
		const rowCount = await rows.count();
		expect(rowCount).toBeGreaterThanOrEqual(contract.min_rows || 0);
		expect(await getCellText(rows.first(), contract.columns, 'collection_name')).not.toBe('');
		expect(await getCellText(rows.first(), contract.columns, 'gap')).not.toBe('');
		expect(await getCellText(rows.first(), contract.columns, 'status')).not.toBe('');
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
