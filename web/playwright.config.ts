import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const useExternalBaseURL = Boolean(process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
	testDir: './tests/e2e',

	fullyParallel: true,

	forbidOnly: !!process.env.CI,

	retries: process.env.CI ? 2 : 0,

	workers: process.env.CI ? 1 : undefined,

	reporter: [
		['html', { outputFolder: 'playwright-report' }],
		['list'],
		['json', { outputFile: 'test-results/results.json' }],
	],

	use: {
		baseURL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'on-first-retry',
		actionTimeout: 10000,
		navigationTimeout: 30000,
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],

	webServer: useExternalBaseURL
		? undefined
		: {
			command: 'pnpm run build && pnpm exec nuxi preview --host 127.0.0.1 --port 3000',
			port: 3000,
			timeout: 180 * 1000,
			reuseExistingServer: !process.env.CI,
			stdout: 'pipe',
			stderr: 'pipe',
		},

	timeout: 60000,

	expect: {
		timeout: 10000,
	},

	outputDir: 'test-results',
});
