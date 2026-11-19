// Selenium-snippets in Java en C# (issue #12).
//
// Taalkeuze: beide. Java is de meest gebruikte Selenium-taal, C# is gangbaar
// bij .NET-teams. De snippet is één regel die direct in een test past:
//
//   Java: driver.findElement(By.cssSelector("[data-testid=\"login\"]"))
//   C#:   driver.FindElement(By.CssSelector("[data-testid=\"login\"]"))
//
// Pure functies: geen DOM- of extensie-API's.

import type { LocatorResult } from '../locator-engine';

export type SeleniumLanguage = 'java' | 'csharp';

/** Locator in de vorm die Selenium kent. */
export type SeleniumLocator =
  | { strategy: 'test-attribute' | 'css'; selector: string }
  | { strategy: 'id'; id: string }
  | { strategy: 'xpath'; expression: string };

type ByMethod = 'css' | 'id' | 'xpath';

const BY_METHODS: Record<SeleniumLanguage, Record<ByMethod, string>> = {
  java: { css: 'By.cssSelector', id: 'By.id', xpath: 'By.xpath' },
  csharp: { css: 'By.CssSelector', id: 'By.Id', xpath: 'By.XPath' },
};

const FIND_ELEMENT: Record<SeleniumLanguage, string> = {
  java: 'driver.findElement',
  csharp: 'driver.FindElement',
};

/** Alleen de `By`-expressie, bijv. `By.id("login")`. */
export function seleniumBy(locator: SeleniumLocator, language: SeleniumLanguage): string {
  const methods = BY_METHODS[language];
  const literal = language === 'java' ? javaString : csharpString;
  switch (locator.strategy) {
    case 'test-attribute':
    case 'css':
      return `${methods.css}(${literal(locator.selector)})`;
    case 'id':
      return `${methods.id}(${literal(locator.id)})`;
    case 'xpath':
      return `${methods.xpath}(${literal(locator.expression)})`;
  }
}

/** Complete snippet, bijv. `driver.findElement(By.id("login"))`. */
export function seleniumSnippet(locator: SeleniumLocator, language: SeleniumLanguage): string {
  return `${FIND_ELEMENT[language]}(${seleniumBy(locator, language)})`;
}

/**
 * Zet de uitkomst van de locator-engine om naar een Selenium-locator.
 * Geeft null voor rol + naam: Selenium heeft daar geen `By` voor. Gebruik
 * dan een CSS-selector of XPath van hetzelfde element.
 */
export function toSeleniumLocator(result: LocatorResult): SeleniumLocator | null {
  switch (result.strategy) {
    case 'test-attribute':
      return { strategy: 'test-attribute', selector: result.locator };
    case 'id': {
      const id = idFromSelector(result.locator);
      // Onbekende vorm: de selector werkt hoe dan ook als CSS.
      return id === null ? { strategy: 'css', selector: result.locator } : { strategy: 'id', id };
    }
    case 'xpath':
      return { strategy: 'xpath', expression: result.locator };
    case 'role-name':
      return null;
  }
}

/** Haalt de ruwe id uit `#login` of `[id="a\"b"]`, de vormen die de engine maakt. */
function idFromSelector(selector: string): string | null {
  const simple = /^#([A-Za-z_][\w-]*)$/.exec(selector);
  if (simple) return simple[1] ?? null;
  const quoted = /^\[id="((?:[^"\\]|\\.)*)"\]$/.exec(selector);
  if (quoted) return (quoted[1] ?? '').replace(/\\(.)/g, '$1');
  return null;
}

/** Java-stringliteral tussen dubbele quotes. */
export function javaString(value: string): string {
  let result = '';
  for (const ch of value) {
    switch (ch) {
      case '\\': result += '\\\\'; break;
      case '"': result += '\\"'; break;
      case '\n': result += '\\n'; break;
      case '\r': result += '\\r'; break;
      case '\t': result += '\\t'; break;
      case '\b': result += '\\b'; break;
      case '\f': result += '\\f'; break;
      default: result += isControl(ch) ? unicodeEscape(ch) : ch;
    }
  }
  return `"${result}"`;
}

/** C#-stringliteral tussen dubbele quotes (geen verbatim string). */
export function csharpString(value: string): string {
  let result = '';
  for (const ch of value) {
    switch (ch) {
      case '\\': result += '\\\\'; break;
      case '"': result += '\\"'; break;
      case '\0': result += '\\0'; break;
      case '\n': result += '\\n'; break;
      case '\r': result += '\\r'; break;
      case '\t': result += '\\t'; break;
      case '\b': result += '\\b'; break;
      case '\f': result += '\\f'; break;
      case '\v': result += '\\v'; break;
      default: result += isControl(ch) ? unicodeEscape(ch) : ch;
    }
  }
  return `"${result}"`;
}

// C0- en C1-besturingstekens en de regelscheiders die beide talen als
// regeleinde in een literal weigeren.
function isControl(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code < 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029 || code === 0x85;
}

function unicodeEscape(ch: string): string {
  return `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`;
}
