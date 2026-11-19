// Issue #59: de extensie mag geen fouten in de console van de pagina zetten.
// Een tester die in zijn eigen applicatie naar fouten zoekt, ziet die anders.

import type { Page } from '@playwright/test';
import { expect, startPickMode, test } from './fixtures';
import { Panel } from './panel';

/** Verzamelt onafgevangen fouten en console-fouten van de pagina. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    // De testserver heeft geen favicon; die 404 komt van de browser, niet van de extensie.
    if (message.location().url.endsWith('/favicon.ico')) return;
    errors.push(`console: ${message.text()}`);
  });
  return errors;
}

test('geen fouten in de pagina bij laden, kiezen en toevoegen aan het page object', async ({
  page,
  serviceWorker,
  siteUrl,
}) => {
  const errors = collectErrors(page);
  await page.goto(siteUrl);
  const panel = await Panel.attach(page);
  // Het content script laadt bij document_idle; geef het de tijd om te starten.
  await startPickMode(serviceWorker, page);

  await page.getByTestId('login').click();
  await panel.clickCollect();
  await expect.poll(() => panel.collectText()).toContain('1');

  // Een herlaadbeurt start het content script opnieuw.
  await page.reload();
  await startPickMode(serviceWorker, page);

  // Even wachten op asynchrone fouten (zoals een afgewezen promise).
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});
