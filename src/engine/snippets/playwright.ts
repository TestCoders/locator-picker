// Playwright-snippet voor een gekozen locator (issue #11).
//
// Taal: TypeScript/JavaScript. De gegenereerde expressie (`page.getByTestId('...')`)
// is in beide talen gelijk, dus één generator dekt de Playwright Test-runner en
// losse JS/TS-scripts. Python, Java en .NET volgen eventueel later.
//
// Pure functie: geen DOM- of extensie-API's.

import type { LocatorResult } from '../locator-engine';

export type PlaywrightSnippetOptions = {
  /**
   * Het attribuut dat `getByTestId` gebruikt; in Playwright standaard `data-testid`,
   * aan te passen met `selectors.setTestIdAttribute()`. Andere testattributen
   * worden een `page.locator()` met CSS.
   */
  testIdAttribute?: string;
};

export const DEFAULT_TEST_ID_ATTRIBUTE = 'data-testid';

export function playwrightSnippet(result: LocatorResult, options: PlaywrightSnippetOptions = {}): string {
  switch (result.strategy) {
    case 'test-attribute':
      if (result.attribute === (options.testIdAttribute ?? DEFAULT_TEST_ID_ATTRIBUTE)) {
        return `page.getByTestId(${jsString(result.value)})`;
      }
      return `page.locator(${jsString(result.locator)})`;

    case 'role-name':
      // exact: zonder deze optie matcht Playwright de naam hoofdletterongevoelig
      // als deeltekst, zodat 'Opslaan' ook 'Opslaan als' vindt. De engine heeft
      // uniciteit gecontroleerd op de exacte naam.
      return `page.getByRole(${jsString(result.role)}, { name: ${jsString(result.name)}, exact: true })`;

    case 'id':
      return `page.locator(${jsString(result.locator)})`;

    case 'xpath':
      // Playwright herkent alleen `//...` automatisch als XPath; het prefix
      // werkt ook voor absolute paden als `/html/body/...`.
      return `page.locator(${jsString(`xpath=${result.locator}`)})`;
  }
}

/** JavaScript-stringliteral tussen enkele aanhalingstekens. */
export function jsString(value: string): string {
  let result = "'";
  for (const ch of value) {
    switch (ch) {
      case '\\': result += '\\\\'; break;
      case "'": result += "\\'"; break;
      case '\n': result += '\\n'; break;
      case '\r': result += '\\r'; break;
      case '\t': result += '\\t'; break;
      case ' ': result += '\\u2028'; break;
      case ' ': result += '\\u2029'; break;
      default: {
        const code = ch.charCodeAt(0);
        result += code < 0x20 || code === 0x7f ? `\\u${code.toString(16).padStart(4, '0')}` : ch;
      }
    }
  }
  return `${result}'`;
}
