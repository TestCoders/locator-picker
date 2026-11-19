// E2E (issue #24): een gekozen element komt in de historie van het domein,
// in storage.local van de browser.

import { expect, startPickMode, test } from './fixtures';

type StoredEntry = { css: string; xpath: string; playwright: string; tagName: string };

test('een gekozen element komt in de historie van het domein', async ({ page, serviceWorker, siteUrl }) => {
  await page.goto(siteUrl);
  await startPickMode(serviceWorker, page);
  await page.locator('button[type="submit"]').click();

  const hostname = new URL(siteUrl).hostname;
  await expect
    .poll(async () => {
      const stored = await serviceWorker.evaluate(async () => {
        const chromeApi = (globalThis as unknown as { chrome: { storage: { local: { get(key: string): Promise<Record<string, unknown>> } } } }).chrome;
        return (await chromeApi.storage.local.get('history')).history;
      });
      return (stored as Record<string, StoredEntry[]> | undefined)?.[hostname]?.[0]?.tagName;
    })
    .toBe('button');
});
