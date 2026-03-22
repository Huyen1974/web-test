import { expect, test } from '@playwright/test';

const PAGES = [
	'/knowledge',
	'/knowledge/registries',
	'/knowledge/registries/species',
	'/knowledge/registries/health',
	'/knowledge/registries/unmanaged',
	'/knowledge/modules',
	'/knowledge/workflows',
	'/knowledge/current-tasks',
	'/knowledge/laws',
];

for (const path of PAGES) {
	test(`${path} does not return 404/500`, async ({ page }) => {
		const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

		expect(response, `No HTTP response for ${path}`).not.toBeNull();
		expect(response!.status(), `${path} returned ${response!.status()}`).toBeLessThan(400);
		await expect(page).not.toHaveTitle(/404|500/i);
	});
}
