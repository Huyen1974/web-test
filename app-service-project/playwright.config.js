import { defineConfig } from '@playwright/test';

const LOCAL_BASE_URL = 'http://127.0.0.1:4173';

const baseURL = process.env.WEB_APP_URL || LOCAL_BASE_URL;

const webServer = process.env.WEB_APP_URL
  ? undefined
  : {
      command: 'bash ./scripts/start-vrt-server.sh',
      port: 4173,
      reuseExistingServer: true,
      timeout: 180000, // Increased to 3 minutes for build + server startup
    };

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled', // Disable animations globally for VRT
    },
  },
  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15000, // 15 seconds for actions
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}{ext}',
  retries: process.env.CI ? 2 : 0, // Retry failed tests twice in CI
  workers: process.env.CI ? 2 : undefined, // Limit parallelism in CI
  webServer,
});
