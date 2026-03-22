import { expect, test } from '@playwright/test';
import type { TableContract } from './support/contracts';
import { loadContract } from './support/contracts';

interface SpeciesContract extends TableContract {
	total_testid: string;
	required_text: string[];
}

const contract = loadContract<SpeciesContract>('species-matrix.json');

test.describe('Species Matrix', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(contract.route);
		await expect(page.getByRole('heading', { name: /Ma trận Loài/i })).toBeVisible();
	});

	test('renders the contract table and at least 33 species rows', async ({ page }) => {
		await expect(page.getByTestId(contract.table_testid)).toBeVisible();

		for (const column of contract.columns) {
			await expect(page.getByTestId(column.testid)).toHaveText(column.label);
		}

		const rows = page.locator(`[data-testid="${contract.table_testid}"] tbody tr`);
		expect(await rows.count()).toBeGreaterThanOrEqual(contract.min_rows || 0);
	});

	test('renders the TOTAL summary contract', async ({ page }) => {
		const total = page.getByTestId(contract.total_testid);
		await expect(total).toBeVisible();
		await expect(total).toContainText(contract.required_text[1]);
	});
});
