// @vitest-environment jsdom
// jsdom omdat buildLocator voor de XPath-terugval document.evaluate nodig heeft.
import { beforeEach, describe, expect, it } from 'vitest';
import { buildLocator, type LocatorResult } from '@/engine/locator-engine';
import { jsString, playwrightSnippet } from '@/engine/snippets/playwright';

/** Leest een gegenereerde stringliteral terug zoals JavaScript dat doet. */
function evalString(literal: string): string {
  return new Function(`return ${literal};`)() as string;
}

function snippetFor(html: string, selector: string): string {
  document.body.innerHTML = html;
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Fixture mist ${selector}`);
  return playwrightSnippet(buildLocator(el));
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('playwrightSnippet per strategie', () => {
  it('testattribuut geeft getByTestId', () => {
    expect(snippetFor('<button data-testid="save-btn">Opslaan</button>', 'button')).toBe(
      "page.getByTestId('save-btn')",
    );
  });

  it('ander testattribuut geeft page.locator met CSS', () => {
    const result: LocatorResult = {
      strategy: 'test-attribute',
      attribute: 'data-cy',
      value: 'go',
      locator: '[data-cy="go"]',
      matches: 1,
    };
    expect(playwrightSnippet(result)).toBe(`page.locator('[data-cy="go"]')`);
  });

  it('getByTestId volgt een ingesteld testIdAttribute', () => {
    const result: LocatorResult = {
      strategy: 'test-attribute',
      attribute: 'data-cy',
      value: 'go',
      locator: '[data-cy="go"]',
      matches: 1,
    };
    expect(playwrightSnippet(result, { testIdAttribute: 'data-cy' })).toBe("page.getByTestId('go')");
  });

  it('rol en naam geeft getByRole met exacte naam', () => {
    expect(snippetFor('<button>Opslaan</button><button>Opslaan als</button>', 'button')).toBe(
      "page.getByRole('button', { name: 'Opslaan', exact: true })",
    );
  });

  it('id geeft page.locator', () => {
    expect(snippetFor('<div id="main"></div>', 'div')).toBe("page.locator('#main')");
  });

  it('id met speciale tekens blijft een geldige selector', () => {
    expect(snippetFor('<div id="1:a.b"></div>', 'div')).toBe(`page.locator('[id="1:a.b"]')`);
  });

  it('XPath krijgt het xpath=-prefix', () => {
    expect(snippetFor('<div><span></span><span></span></div>', 'span:nth-child(2)')).toBe(
      "page.locator('xpath=/html/body/div/span[2]')",
    );
  });
});

describe('escaping van het argument', () => {
  it("escapet enkele aanhalingstekens in de naam", () => {
    const snippet = snippetFor(`<button>Don't save</button>`, 'button');
    expect(snippet).toBe("page.getByRole('button', { name: 'Don\\'t save', exact: true })");
  });

  it('escapet backslashes en aanhalingstekens in een testattribuut', () => {
    const snippet = snippetFor(`<button data-testid="a\\b'c">X</button>`, 'button');
    expect(snippet).toBe("page.getByTestId('a\\\\b\\'c')");
  });

  it('XPath met aanhalingstekens blijft geldig', () => {
    const result: LocatorResult = { strategy: 'xpath', locator: `//a[text()="it's"]`, matches: 1 };
    expect(playwrightSnippet(result)).toBe(`page.locator('xpath=//a[text()="it\\'s"]')`);
  });

  it.each([
    'gewoon',
    "it's",
    'back\\slash',
    'regel\nnieuwe regel',
    'tab\there',
    'quote "dubbel"',
    'scheiding lijn',
    'nul\u0000teken',
    'émoji 🎉',
    '${template}',
  ])('jsString leest terug als het origineel: %j', (value) => {
    expect(evalString(jsString(value))).toBe(value);
  });
});
