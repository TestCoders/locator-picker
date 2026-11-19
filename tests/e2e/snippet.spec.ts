// E2E (issue #19): de extensie kiest een element op een testsite, de tester
// kopieert de Playwright-snippet, en die snippet draait ongewijzigd in een
// Playwright-test en vindt precies dat element.

import type { Locator, Page } from '@playwright/test';
import { expect, startPickMode, test } from './fixtures';
import { Panel } from './panel';

/**
 * Voert de snippet ongewijzigd uit, met `page` in scope, zoals hij in een
 * Playwright-test zou staan: `await expect(<snippet>).toBeVisible()`.
 */
function runSnippet(snippet: string, page: Page): Locator {
  const locator: unknown = new Function('page', `return (${snippet});`)(page);
  if (!locator || typeof (locator as Locator).count !== 'function') {
    throw new Error(`snippet levert geen Playwright-locator op: ${snippet}`);
  }
  return locator as Locator;
}

/** Kiest het element met de extensie en geeft de snippet uit het clipboard terug. */
async function pickAndCopySnippet(page: Page, target: Locator, panel: Panel): Promise<string> {
  await target.click();
  await panel.clickCopy('playwright');
  return page.evaluate(() => navigator.clipboard.readText());
}

const CASES = [
  { name: 'testattribuut', target: (p: Page) => p.locator('button[type="submit"]'), snippet: "page.getByTestId('login')" },
  { name: 'id', target: (p: Page) => p.locator('input[type="email"]'), snippet: "page.locator('#email')" },
  {
    name: 'rol + naam',
    target: (p: Page) => p.locator('nav a').nth(1),
    snippet: "page.getByRole('link', { name: 'Over ons', exact: true })",
  },
];

for (const { name, target, snippet: expected } of CASES) {
  test(`snippet voor ${name} draait ongewijzigd en vindt het gekozen element`, async ({ page, serviceWorker, siteUrl }) => {
    await page.goto(siteUrl);
    const panel = await Panel.attach(page);
    const element = await target(page).elementHandle();

    await startPickMode(serviceWorker, page);
    const snippet = await pickAndCopySnippet(page, target(page), panel);

    // Eerst de echte eis: ongewijzigd uitvoeren vindt precies het gekozen element.
    const locator = runSnippet(snippet, page);
    await expect(locator, `snippet ${snippet}`).toHaveCount(1);
    expect(await locator.evaluate((el, picked) => el === picked, element)).toBe(true);

    // Wat in het clipboard staat, is wat het paneel toont.
    expect(snippet).toBe((await panel.read()).values.playwright);
    expect(snippet).toBe(expected);

    expect((await panel.read()).stabilityLevel).toBe('green');
  });
}

test('element zonder bruikbare attributen: snippet werkt en de indicator is rood', async ({
  page,
  serviceWorker,
  siteUrl,
}) => {
  await page.goto(siteUrl);
  const panel = await Panel.attach(page);
  const target = page.locator('span.tile').nth(1);
  const element = await target.elementHandle();

  await startPickMode(serviceWorker, page);
  const snippet = await pickAndCopySnippet(page, target, panel);

  expect(snippet).toMatch(/^page\.locator\('xpath=\/html\/body\//);
  const locator = runSnippet(snippet, page);
  await expect(locator, `snippet ${snippet}`).toHaveCount(1);
  expect(await locator.evaluate((el, picked) => el === picked, element)).toBe(true);

  const result = await panel.read();
  expect(result.stabilityLevel).toBe('red');
  expect(result.stabilityText).toContain('Instabiel');
  expect(result.warningText).toContain('Testhook ontbreekt');
});

test('de klik in pick-modus verstuurt het formulier niet; de snippet als actie wel', async ({
  page,
  serviceWorker,
  siteUrl,
}) => {
  await page.goto(siteUrl);
  const title = await page.title();
  const panel = await Panel.attach(page);

  await startPickMode(serviceWorker, page);
  const snippet = await pickAndCopySnippet(page, page.locator('button[type="submit"]'), panel);

  // De klik koos het element; de pagina reageerde niet.
  await expect(page).toHaveTitle(title);

  // In een echte test is de snippet ook een actie: hij klikt de echte knop.
  await runSnippet(snippet, page).click();
  await expect(page).toHaveTitle('verstuurd');
});
