// E2E (issue #21): locators verzamelen via het resultaatpaneel, exporteren
// als page object en die klasse ongewijzigd gebruiken in een Playwright-test.

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Locator, Page } from '@playwright/test';
import { expect, startPickMode, test } from './fixtures';
import { Panel } from './panel';

test('verzamelde locators exporteren als page object dat ongewijzigd werkt', async ({
  context,
  page,
  serviceWorker,
  siteUrl,
}) => {
  await page.goto(siteUrl);
  const panel = await Panel.attach(page);

  // Twee elementen verzamelen tijdens de sessie.
  const targets = [page.locator('input[type="email"]'), page.locator('button[type="submit"]')];
  for (const [index, target] of targets.entries()) {
    await startPickMode(serviceWorker, page);
    await target.click();
    await panel.clickCollect();
    await expect.poll(() => panel.collectText()).toBe(`Toegevoegd (${index + 1})`);
  }

  // Exportpagina openen, een veldnaam aanpassen en de klasse uitlezen.
  const extensionId = new URL(serviceWorker.url()).host;
  const exportPage = await context.newPage();
  await exportPage.goto(`chrome-extension://${extensionId}/collection.html`);
  await expect(exportPage.getByRole('textbox', { name: /Veldnaam voor <input>/ })).toHaveValue('emailInput');
  await exportPage.getByRole('textbox', { name: /Veldnaam voor <button>/ }).fill('submitButton');
  await exportPage.getByRole('textbox', { name: 'Klassenaam' }).fill('LoginPage');

  const code = (await exportPage.locator('#output').textContent()) ?? '';
  expect(code).toContain('export class LoginPage {');
  expect(code).toContain('readonly submitButton: Locator;');

  // De export ongewijzigd importeren en gebruiken tegen de testsite.
  const dir = await mkdtemp(path.join(import.meta.dirname, '.generated-'));
  try {
    const file = path.join(dir, 'LoginPage.ts');
    await writeFile(file, code);
    const module = (await import(pathToFileURL(file).href)) as {
      LoginPage: new (page: Page) => { emailInput: Locator; submitButton: Locator };
    };

    const loginPage = new module.LoginPage(page);
    await expect(loginPage.emailInput).toHaveCount(1);
    await expect(loginPage.submitButton).toHaveCount(1);
    await loginPage.emailInput.fill('tester@example.com');
    await expect(page.locator('#email')).toHaveValue('tester@example.com');
    await expect(loginPage.submitButton).toHaveText('Inloggen');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
