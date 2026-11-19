// E2E in Firefox (issue #22): de MVP-functies werken ook in Firefox.
// Draai met `npm run test:e2e:firefox`; dat bouwt eerst de Firefox-zip.

import { expect, test } from '@playwright/test';
import { By, type WebElement } from 'selenium-webdriver';
import { startSiteServer } from '../e2e/site-server';
import { FirefoxWithExtension, Key } from './firefox';

type PickedElementResponse = { element: { locator: string; stability: { level: string } } | null };

let firefox: FirefoxWithExtension;
let site: Awaited<ReturnType<typeof startSiteServer>>;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  site = await startSiteServer();
  firefox = await FirefoxWithExtension.start();
});

test.afterAll(async () => {
  await firefox?.quit();
  await site?.close();
});

async function find(css: string, index = 0): Promise<WebElement> {
  const elements = await firefox.driver.findElements(By.css(css));
  const el = elements[index];
  if (!el) throw new Error(`niet gevonden: ${css}[${index}]`);
  return el;
}

/** Locator die Firefox zelf uitvoert; moet precies het gekozen element vinden. */
async function findsOnly(kind: 'css' | 'xpath', locator: string, el: WebElement): Promise<boolean> {
  return firefox.inPage<boolean>(
    `const [kind, locator, el, done] = arguments;
     const found = kind === 'css'
       ? Array.from(document.querySelectorAll(locator))
       : (() => {
           const r = document.evaluate(locator, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
           return Array.from({ length: r.snapshotLength }, (_, i) => r.snapshotItem(i));
         })();
     done(found.length === 1 && found[0] === el);`,
    kind,
    locator,
    el,
  );
}

/** Pick-modus aan, element kiezen, en CSS, XPath en Playwright kopiëren met het toetsenbord. */
async function pickAndCopyAll(el: WebElement): Promise<{ css: string; xpath: string; playwright: string }> {
  expect(await firefox.togglePickMode()).toBe(true);
  await el.click();
  await firefox.waitFor(
    async () => firefox.inPage<boolean>('arguments[0](!!document.querySelector("locator-picker-panel"))'),
    'resultaatpaneel',
  );
  // Het paneel zet de focus op de eerste kopieerknop (CSS); Tab gaat naar de volgende.
  const css = await firefox.copyFocused();
  await firefox.pressKeys(Key.TAB);
  const xpath = await firefox.copyFocused();
  await firefox.pressKeys(Key.TAB);
  const playwright = await firefox.copyFocused();
  return { css, xpath, playwright };
}

async function pickedStability(): Promise<string | undefined> {
  const [answer] = await firefox.sendToTabs<PickedElementResponse>({ type: 'GET_PICKED_ELEMENT' });
  return answer?.element?.stability.level;
}

test('testattribuut: CSS, XPath en snippet via het paneel, indicator groen', async () => {
  await firefox.open(site.url);
  const button = await find('button[type="submit"]');

  const copied = await pickAndCopyAll(button);

  expect(copied).toEqual({
    css: '[data-testid="login"]',
    xpath: '//button[@data-testid="login"]',
    playwright: "page.getByTestId('login')",
  });
  expect(await findsOnly('css', copied.css, button)).toBe(true);
  expect(await findsOnly('xpath', copied.xpath, button)).toBe(true);
  expect(await pickedStability()).toBe('green');
});

test('de klik in pick-modus bereikt de pagina niet', async () => {
  await firefox.open(site.url);
  const link = await find('nav a', 1);

  const copied = await pickAndCopyAll(link);

  expect(copied.playwright).toBe("page.getByRole('link', { name: 'Over ons', exact: true })");
  expect(await findsOnly('css', copied.css, link)).toBe(true);
  expect(await findsOnly('xpath', copied.xpath, link)).toBe(true);
  // De link wijst naar #over; de klik is tegengehouden, dus de hash is leeg.
  expect(await firefox.inPage<string>('arguments[0](location.hash)')).toBe('');
});

test('element zonder bruikbare attributen: locators werken, indicator rood', async () => {
  await firefox.open(site.url);
  const tile = await find('span.tile', 1);

  const copied = await pickAndCopyAll(tile);

  expect(copied.playwright).toMatch(/^page\.locator\('xpath=\/html\/body\//);
  expect(await findsOnly('css', copied.css, tile)).toBe(true);
  expect(await findsOnly('xpath', copied.xpath, tile)).toBe(true);
  expect(await pickedStability()).toBe('red');
});

test('hover toont de highlight; Esc zet de pick-modus uit', async () => {
  await firefox.open(site.url);
  const link = await find('nav a', 1);

  expect(await firefox.togglePickMode()).toBe(true);
  await firefox.driver.actions().move({ origin: link }).perform();
  await firefox.waitFor(
    async () => firefox.inPage<boolean>('arguments[0](!!document.querySelector("locator-picker-overlay"))'),
    'hover-highlight',
  );

  await firefox.pressKeys(Key.ESCAPE);
  // Uit: de klik gaat nu gewoon naar de pagina.
  await link.click();
  expect(await firefox.inPage<string>('arguments[0](location.hash)')).toBe('#over');
});

test('optiespagina: een ander testattribuut geldt direct', async () => {
  await firefox.open(site.url);
  // Kies data-cy op de optiespagina (storage.sync; vereist het add-on-ID).
  await firefox.inExtension<void>(
    `const done = arguments[0];
     const radio = document.querySelector('input[value="data-cy"]');
     radio.click();
     const check = () => browser.storage.sync.get('testAttribute').then((v) =>
       v.testAttribute === 'data-cy' ? done() : setTimeout(check, 50));
     check();`,
  );

  const button = await find('button[data-cy]');
  const copied = await pickAndCopyAll(button);
  expect(copied.css).toBe('[data-cy="zoek"]');
  expect(await findsOnly('css', copied.css, button)).toBe(true);

  // Terug naar de standaard voor eventuele volgende tests.
  await firefox.inExtension<void>(
    `const done = arguments[0];
     document.querySelector('input[value="data-testid"]').click();
     setTimeout(done, 100);`,
  );
});
