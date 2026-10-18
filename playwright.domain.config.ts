import { defineConfig } from '@playwright/test';

// Pure calculation assertions using the Playwright runner, not browser tests.
// Deliberately no webServer, browser project or application credentials.
export default defineConfig({
  testDir: './tests',
  testMatch: 'landed-cost.test.ts',
  workers: 1,
  reporter: 'list',
  forbidOnly: !!process.env.CI,
});
