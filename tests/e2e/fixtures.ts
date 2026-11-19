// Playwright-fixtures voor de E2E-tests (issue #19): Chromium met de gebouwde
// extensie geladen, en een lokale testsite.

import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import path from 'node:path';
import { startSiteServer } from './site-server';

const EXTENSION_PATH = path.resolve(import.meta.dirname, '../../.output/chrome-mv3');

type Fixtures = {
  context: BrowserContext;
  serviceWorker: Worker;
};

type WorkerFixtures = {
  siteUrl: string;
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  siteUrl: [
    async ({}, use) => {
      const server = await startSiteServer();
      await use(server.url);
      await server.close();
    },
    { scope: 'worker' },
  ],

  // Extensies laden kan alleen in een persistente context. Het kanaal
  // 'chromium' ondersteunt extensies ook headless.
  context: async ({ siteUrl }, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: siteUrl });
    await use(context);
    await context.close();
  },

  serviceWorker: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await use(worker);
  },
});

export const expect = test.expect;

/**
 * Zet de pick-modus aan, zoals een klik op het extensie-icoon doet: de
 * background stuurt TOGGLE_PICK_MODE naar het content script van de tab.
 * Playwright kan het icoon in de werkbalk zelf niet aanklikken.
 */
export async function startPickMode(serviceWorker: Worker, page: Page): Promise<void> {
  await page.waitForLoadState('load');
  // Zonder de permissie 'tabs' ziet de extensie geen URL's, dus filteren op de
  // testpagina kan niet. Alleen tabs met een content script antwoorden; in de
  // test is dat precies één tab. Het content script start na het laden van de
  // pagina, dus probeer opnieuw tot het antwoordt.
  await expect(async () => {
    const answers = await serviceWorker.evaluate(async () => {
      const api = (globalThis as unknown as { chrome: ChromeApi }).chrome;
      const tabs = await api.tabs.query({});
      const results = await Promise.all(
        tabs.map((tab) =>
          tab.id === undefined
            ? null
            : api.tabs.sendMessage(tab.id, { type: 'TOGGLE_PICK_MODE' }).catch(() => null),
        ),
      );
      return results.filter((r) => r !== null).map((r) => r.active);
    });
    expect(answers).toEqual([true]);
  }).toPass({ timeout: 10_000 });
}

// Het deel van de chrome-API dat startPickMode in de service worker gebruikt.
type ChromeApi = {
  tabs: {
    query(info: object): Promise<{ id?: number }[]>;
    sendMessage(tabId: number, message: unknown): Promise<{ active: boolean }>;
  };
};
