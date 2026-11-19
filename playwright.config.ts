import { defineConfig } from '@playwright/test';

// E2E-tests met de gebouwde extensie (issue #19). Draai eerst `npm run build`;
// `npm run test:e2e` doet dat zelf.
export default defineConfig({
  testDir: 'tests/e2e',
  // Elke test start een eigen browser met de extensie; serieel houdt het voorspelbaar.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
