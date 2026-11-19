import { defineConfig } from '@playwright/test';

// E2E in Firefox (issue #22). Playwright is hier alleen de testrunner; Firefox
// met de extensie draait via Selenium en geckodriver, omdat Playwright in
// Firefox geen extensies kan laden. `npm run test:e2e:firefox` bouwt eerst.
export default defineConfig({
  testDir: 'tests/e2e-firefox',
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
});
