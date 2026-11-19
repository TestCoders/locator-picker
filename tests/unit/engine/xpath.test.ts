// @vitest-environment jsdom
// jsdom omdat het, net als de browser, document.evaluate volledig ondersteunt.
import { describe, expect, it } from 'vitest';
import { xpathLiteral, xpathSelector } from '@/engine/xpath';
import { FIXTURES, mountFixture } from './fixtures';

function evaluateAll(expr: string, root: Node): Node[] {
  const result = document.evaluate(expr, root, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  return Array.from({ length: result.snapshotLength }, (_, i) => result.snapshotItem(i)!);
}

describe('xpathSelector: fixtures', () => {
  it.each(FIXTURES)('$name', (fixture) => {
    const { el, root } = mountFixture(fixture);
    const xpath = xpathSelector(el, { testAttributes: fixture.testAttributes });

    expect(xpath).toBe(fixture.xpath);
    // De XPath moet precies het gekozen element opleveren.
    expect(evaluateAll(xpath, root)).toEqual([el]);
  });

  it('kiest structureel alleen als geen attribuut of tekst uniek is', () => {
    document.body.innerHTML = '<div><div><span>x</span></div><div><span>y</span></div></div>';
    const el = document.querySelectorAll('span')[1]!;
    expect(xpathSelector(el)).toBe('//span[normalize-space()="y"]');
  });

  it('gebruikt geen tekst van een container met kind-elementen', () => {
    document.body.innerHTML = '<section><div><p>a</p></div><div><p>b</p></div></section>';
    const el = document.querySelectorAll('div')[1]!;
    expect(xpathSelector(el)).toBe('//section/div[2]');
  });
});

describe('xpathLiteral', () => {
  it.each([
    ['plain', '"plain"'],
    ['say "hi"', `'say "hi"'`],
    ["it's", `"it's"`],
    [`it's "ok"`, `concat("it's ", '"', "ok", '"', "")`],
    ['', '""'],
  ])('%j → %s', (input, expected) => {
    expect(xpathLiteral(input)).toBe(expected);
  });

  it('literal met beide quotes evalueert terug naar de oorspronkelijke tekst', () => {
    const value = `a'b"c'"d`;
    const result = document.evaluate(`string(${xpathLiteral(value)})`, document, null, XPathResult.STRING_TYPE, null);
    expect(result.stringValue).toBe(value);
  });
});
