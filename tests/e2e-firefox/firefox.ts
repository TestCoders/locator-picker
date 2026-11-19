// Firefox met de gebouwde extensie, via Selenium en geckodriver (issue #22).
//
// Playwright kan in Firefox geen extensies laden. Selenium kan dat wel, als
// tijdelijke add-on. Omdat niets een gesloten shadow root of de background van
// buitenaf kan bereiken, gebruikt de test twee wegen:
// - een extensiepagina (options.html) in een eigen tab, met toegang tot de
//   browser-API, om berichten naar het content script te sturen;
// - het toetsenbord om het paneel te bedienen, zoals een toetsenbordgebruiker.

import { readdirSync } from 'node:fs';
import path from 'node:path';
import { Builder, Key, type WebDriver } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { GECKO_ID } from '../../wxt.config';

const OUTPUT = path.resolve(import.meta.dirname, '../../.output');
// Vaste interne UUID, zodat de test de extensiepagina's kan openen.
const EXTENSION_UUID = '3b0c8a52-7f0e-4b8e-9b1e-2f6f9d1c4a10';
export const EXTENSION_ORIGIN = `moz-extension://${EXTENSION_UUID}`;

function firefoxZip(): string {
  const zip = readdirSync(OUTPUT).find((f) => /^locator-picker-.*-firefox\.zip$/.test(f));
  if (!zip) throw new Error('geen Firefox-zip gevonden; draai eerst `npm run zip:firefox`');
  return path.join(OUTPUT, zip);
}

export class FirefoxWithExtension {
  private extensionTab = '';
  private siteTab = '';

  private constructor(readonly driver: WebDriver) {}

  static async start(): Promise<FirefoxWithExtension> {
    const options = new firefox.Options()
      .addArguments('-headless')
      .setPreference('extensions.webextensions.uuids', JSON.stringify({ [GECKO_ID]: EXTENSION_UUID }))
      // Clipboard lezen zonder toestemmingsvraag, alleen voor de test.
      .setPreference('dom.events.testing.asyncClipboard', true);
    // --allow-system-access: alleen om de extensiepagina in een tab te openen (zie hieronder).
    const service = new firefox.ServiceBuilder().addArguments('--allow-system-access');
    const driver = (await new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .setFirefoxService(service)
      .build()) as firefox.Driver;
    await driver.installAddon(firefoxZip(), true);
    const browser = new FirefoxWithExtension(driver);
    browser.siteTab = await driver.getWindowHandle();

    // WebDriver mag niet naar moz-extension://-URL's navigeren. Vanuit de
    // chrome-context van Firefox kan een tab met de optiespagina wel geopend
    // worden; daarna werkt executeScript daar gewoon.
    const before = new Set(await driver.getAllWindowHandles());
    await driver.setContext(firefox.Context.CHROME);
    await driver.executeScript(
      `gBrowser.addTab(arguments[0], {
         triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
       });`,
      `${EXTENSION_ORIGIN}/options.html`,
    );
    await driver.setContext(firefox.Context.CONTENT);
    await browser.waitFor(async () => {
      const added = (await driver.getAllWindowHandles()).find((h) => !before.has(h));
      if (!added) return false;
      browser.extensionTab = added;
      await driver.switchTo().window(added);
      return (await driver.executeScript('return typeof browser?.tabs?.query')) === 'function';
    }, 'optiespagina');
    await driver.switchTo().window(browser.siteTab);
    return browser;
  }

  async quit(): Promise<void> {
    await this.driver.quit();
  }

  /** Opent een URL in de sitetab en wacht tot het content script antwoordt. */
  async open(url: string): Promise<void> {
    await this.driver.switchTo().window(this.siteTab);
    await this.driver.get(url);
    await this.waitFor(async () => (await this.sendToTabs({ type: 'GET_PICKED_ELEMENT' })).length === 1, 'content script');
  }

  /**
   * Stuurt een bericht naar alle tabs vanuit de extensiepagina, zoals de
   * background bij een klik op het icoon. Alleen tabs met een content script
   * antwoorden; in de test is dat de sitetab.
   */
  async sendToTabs<T = unknown>(message: object): Promise<T[]> {
    return this.inExtension<T[]>(
      `const [message, done] = arguments;
       browser.tabs.query({}).then((tabs) =>
         Promise.all(tabs.map((tab) => browser.tabs.sendMessage(tab.id, message).catch(() => null))),
       ).then((answers) => done(answers.filter((a) => a != null)));`,
      message,
    );
  }

  /** Zet de pick-modus aan of uit; geeft de nieuwe stand terug. */
  async togglePickMode(): Promise<boolean> {
    const [answer] = await this.sendToTabs<{ active: boolean }>({ type: 'TOGGLE_PICK_MODE' });
    if (!answer) throw new Error('geen content script bereikt');
    return answer.active;
  }

  /** Voert asynchrone code uit in de extensiepagina; het laatste argument is de callback. */
  async inExtension<T>(script: string, ...args: unknown[]): Promise<T> {
    await this.driver.switchTo().window(this.extensionTab);
    try {
      return await this.driver.executeAsyncScript<T>(script, ...args);
    } finally {
      await this.driver.switchTo().window(this.siteTab);
    }
  }

  /** Voert asynchrone code uit in de sitetab. */
  async inPage<T>(script: string, ...args: unknown[]): Promise<T> {
    return this.driver.executeAsyncScript<T>(script, ...args);
  }

  async pressKeys(...keys: string[]): Promise<void> {
    await this.driver.actions().sendKeys(...keys).perform();
  }

  /** Drukt Enter op de knop met focus en geeft de tekst uit het clipboard terug. */
  async copyFocused(): Promise<string> {
    await this.inPage<void>('arguments[0](navigator.clipboard.writeText(""))');
    await this.pressKeys(Key.ENTER);
    let text = '';
    await this.waitFor(async () => {
      text = await this.inPage<string>('navigator.clipboard.readText().then(arguments[0])');
      return text !== '';
    }, 'clipboard');
    return text;
  }

  async waitFor(condition: () => Promise<boolean>, description: string, timeout = 10_000): Promise<void> {
    const deadline = Date.now() + timeout;
    for (;;) {
      try {
        if (await condition()) return;
      } catch {
        // Nog niet klaar; opnieuw proberen.
      }
      if (Date.now() > deadline) throw new Error(`wachten op ${description} duurde te lang`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

export { Key };
