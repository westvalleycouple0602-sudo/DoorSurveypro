import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// The guarded npm command supplies an explicitly approved disposable app.
// Never start or reuse the application's current database-backed dev server.
export default defineConfig({
  ...base,
  webServer: undefined,
  use: { ...base.use, baseURL: process.env.TEST_APP_BASE_URL || 'http://127.0.0.1:1' },
});
