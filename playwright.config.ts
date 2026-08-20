import { defineConfig } from '@playwright/test';
import { baseURL, apiKey } from './config/env';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    trace: 'on-first-retry',
  },
});
