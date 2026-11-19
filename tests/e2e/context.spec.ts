// E2E (issue #23): elementen in open shadow roots en same-origin iframes
// worden gehighlight en gekozen, en de snippet met context draait ongewijzigd.

import type { Locator, Page } from '@playwright/test';
import { expect, startPickMode, test } from './fixtures';
import { Panel } from './panel';

function runSnippet(snippet: string, page: Page): Locator {
  const locator: unknown = new Function('page', `return (${snippet});`)(page);
  if (!locator || typeof (locator as Locator).count !== 'function') {
    throw new Error(`snippet levert geen Playwright-locator op: ${snippet}`);
  }
  return locator as Locator;
}

const CASES = [
  {
    name: 'open shadow root',
    target: (p: Page) => p.locator('product-card').getByRole('button', { name: 'Kopen', exact: true }),
    snippet: "page.locator('product-card').getByTestId('buy')",
    context: 'In shadow root van product-card',
  },
  {
    name: 'geneste shadow root zonder attributen (CSS in plaats van XPath)',
    target: (p: Page) => p.locator('price-tag span').nth(1),
    snippet: "page.locator('product-card').locator('price-tag').locator('div > span:nth-of-type(2)')",
    context: 'In shadow root van product-card › shadow root van price-tag',
  },
  {
    name: 'same-origin iframe',
    target: (p: Page) => p.frameLocator('#checkout').getByTestId('pay'),
    snippet: "page.frameLocator('#checkout').getByTestId('pay')",
    context: 'In iframe #checkout',
  },
  {
    name: 'shadow root in een iframe',
    target: (p: Page) => p.frameLocator('#checkout').locator('input[name="iban"]'),
    snippet: "page.frameLocator('#checkout').locator('pay-form').getByRole('textbox', { name: 'IBAN', exact: true })",
    context: 'In iframe #checkout › shadow root van pay-form',
  },
  {
    name: 'geneste iframe',
    target: (p: Page) => p.frameLocator('#checkout').frameLocator('#inner').getByRole('link'),
    snippet: "page.frameLocator('#checkout').frameLocator('#inner').getByRole('link', { name: 'Voorwaarden', exact: true })",
    context: 'In iframe #checkout › iframe #inner',
  },
];

for (const { name, target, snippet: expected, context } of CASES) {
  test(`${name}: highlight, kiezen en snippet met context`, async ({ page, serviceWorker, siteUrl }) => {
    await page.goto(`${siteUrl}context.html`);
    await expect(page.frameLocator('#checkout').frameLocator('#inner').getByRole('link')).toBeVisible();
    const panel = await Panel.attach(page);
    const element = await target(page).elementHandle();
    const box = (await target(page).boundingBox())!;

    await startPickMode(serviceWorker, page);

    // Hover: de highlight valt over het element, ook in een iframe.
    await target(page).hover();
    await expect.poll(() => panel.overlayBox()).toEqual(
      expect.objectContaining({
        x: expect.closeTo(box.x, 0),
        y: expect.closeTo(box.y, 0),
        width: expect.closeTo(box.width, 0),
        height: expect.closeTo(box.height, 0),
      }),
    );

    // Kiezen en de snippet uit het clipboard halen.
    await target(page).click();
    await panel.clickCopy('playwright');
    const snippet = await page.evaluate(() => navigator.clipboard.readText());
    expect(snippet).toBe(expected);
    const shown = await panel.read();
    expect(shown.contextText).toBe(context);
    // Binnen een shadow root geen XPath (werkt daar niet); in een iframe wel.
    expect('xpath' in shown.values).toBe(!context.includes('shadow root'));

    // Ongewijzigd uitvoeren: precies het gekozen element.
    const locator = runSnippet(snippet, page);
    await expect(locator).toHaveCount(1);
    expect(await locator.evaluate((el, picked) => el === picked, element)).toBe(true);
  });
}

test('zonder context zou de snippet twee knoppen vinden; met context één', async ({ page, siteUrl }) => {
  await page.goto(`${siteUrl}context.html`);
  // Playwright gaat met getByTestId door open shadow roots heen.
  await expect(page.getByTestId('buy')).toHaveCount(2);
  await expect(page.locator('product-card').getByTestId('buy')).toHaveCount(1);
});

test('gesloten shadow root: alleen de host is te kiezen', async ({ page, serviceWorker, siteUrl }) => {
  await page.goto(`${siteUrl}context.html`);
  const panel = await Panel.attach(page);
  const host = page.locator('secret-box');
  const element = await host.elementHandle();

  await startPickMode(serviceWorker, page);
  await host.click();
  await panel.clickCopy('playwright');
  const snippet = await page.evaluate(() => navigator.clipboard.readText());

  const locator = runSnippet(snippet, page);
  await expect(locator).toHaveCount(1);
  expect(await locator.evaluate((el, picked) => el === picked, element)).toBe(true);
  expect((await panel.read()).contextText).toBeNull();
});

test('cross-origin iframe: de klik gaat naar de iframe en de pick-modus blijft aan', async ({
  page,
  serviceWorker,
  siteUrl,
}) => {
  await page.goto(`${siteUrl}context.html`);
  await startPickMode(serviceWorker, page);

  const extern = page.locator('#extern');
  await extern.scrollIntoViewIfNeeded();
  const box = (await extern.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  // Nog aan: opnieuw schakelen zet hem uit.
  const answers = await serviceWorker.evaluate(async () => {
    const api = (globalThis as unknown as { chrome: { tabs: { query(i: object): Promise<{ id?: number }[]>; sendMessage(id: number, m: unknown): Promise<{ active: boolean }> } } }).chrome;
    const tabs = await api.tabs.query({});
    const results = await Promise.all(
      tabs.map((t) => (t.id === undefined ? null : api.tabs.sendMessage(t.id, { type: 'TOGGLE_PICK_MODE' }).catch(() => null))),
    );
    return results.filter((r) => r !== null).map((r) => r.active);
  });
  expect(answers).toEqual([false]);
});
