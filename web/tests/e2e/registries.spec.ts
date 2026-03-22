import { expect, test } from '@playwright/test';
import type { ContractLink, ContractRow, TableContract } from './support/contracts';
import { getCellText, loadContract } from './support/contracts';

interface RegistriesContract extends TableContract {
	required_rows: ContractRow[];
	required_links: ContractLink[];
}

const contract = loadContract<RegistriesContract>('registries.json');

test.describe('Registries Layer 1', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(contract.route);
		await expect(page.getByRole('heading', { name: 'Danh mục hệ thống' })).toBeVisible();
	});

	test('renders the contract headers on the tier A table', async ({ page }) => {
		await expect(page.getByTestId(contract.table_testid)).toBeVisible();

		for (const column of contract.columns) {
			await expect(page.getByTestId(column.testid)).toHaveText(column.label);
		}
	});

	test('keeps all required summary rows visible', async ({ page }) => {
		for (const row of contract.required_rows) {
			const locator = page.getByTestId(row.testid);
			await expect(locator).toBeVisible();
			await expect(locator).toContainText(row.code);
			if (row.name) {
				await expect(locator).toContainText(row.name);
			}
		}
	});

	test('keeps the Species Matrix link live from the contract', async ({ page }) => {
		const [linkContract] = contract.required_links;
		const link = page.getByTestId(linkContract.testid);

		await expect(link).toBeVisible();
		await expect(link).toHaveAttribute('href', linkContract.href);
		await link.click();

		await expect(page).toHaveURL(new RegExp(`${linkContract.href}$`));
		await expect(page.getByRole('heading', { name: /Ma trận Loài/i })).toBeVisible();
	});

	test('renders non-empty counts for all rows and composition for critical summaries', async ({ page }) => {
		const rows = page.locator(`[data-testid="${contract.table_testid}"] tbody tr`);
		const rowCount = await rows.count();
		expect(rowCount).toBeGreaterThanOrEqual(contract.min_rows || 0);

		for (let index = 0; index < rowCount; index += 1) {
			const row = rows.nth(index);
			expect(await getCellText(row, contract.columns, 'record_count')).not.toBe('');
		}

		const catAll = page.getByTestId('row-CAT-ALL');
		expect(await getCellText(catAll, contract.columns, 'thanh_phan')).toMatch(/loài/i);

		const catSpe = page.getByTestId('row-CAT-SPE');
		expect(await getCellText(catSpe, contract.columns, 'record_count')).not.toBe('');
		expect(await getCellText(catSpe, contract.columns, 'thanh_phan')).toMatch(/loài/i);

		for (const rowTestId of ['row-CAT-ORP', 'row-CAT-PHA', 'row-CAT-UNM']) {
			expect(await getCellText(page.getByTestId(rowTestId), contract.columns, 'record_count')).toMatch(/^\d+$/);
		}
	});
});
