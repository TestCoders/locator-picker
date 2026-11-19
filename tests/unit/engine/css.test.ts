// @vitest-environment jsdom
// jsdom omdat happy-dom geëscapete selectors niet goed parst.
import { describe, expect, it } from 'vitest';
import { cssSelector, escapeIdentifier, escapeString } from '@/engine/css';
import { FIXTURES, mountFixture } from './fixtures';

describe('cssSelector: fixtures', () => {
  it.each(FIXTURES)('$name', (fixture) => {
    const { el, root } = mountFixture(fixture);
    const selector = cssSelector(el, { testAttributes: fixture.testAttributes });

    expect(selector).toBe(fixture.css);
    // De selector moet precies het gekozen element opleveren.
    expect(Array.from(root.querySelectorAll(selector))).toEqual([el]);
  });
});

describe('cssSelector: gegenereerde classes (#26)', () => {
  const html = '<div id="list"><p class="css-1q2w3e">a</p><p>b</p></div>';

  function pick(): Element {
    document.body.innerHTML = html;
    return document.querySelector('p')!;
  }

  it('gebruikt een gegenereerde class niet', () => {
    const el = pick();
    const selector = cssSelector(el);
    expect(selector).not.toContain('css-1q2w3e');
    expect(Array.from(document.querySelectorAll(selector))).toEqual([el]);
  });

  it('gebruikt hem wel als herkenning uit staat', () => {
    const el = pick();
    expect(cssSelector(el, { detectGeneratedClasses: false })).toBe('p.css-1q2w3e');
  });

  it('gebruikt een stabiele class naast een gegenereerde', () => {
    document.body.innerHTML = '<div><p class="css-1q2w3e title">a</p><p>b</p></div>';
    expect(cssSelector(document.querySelector('p')!)).toBe('p.title');
  });

  it('vermijdt state-classes ook als herkenning uit staat', () => {
    document.body.innerHTML = '<div><p class="active">a</p><p>b</p></div>';
    expect(cssSelector(document.querySelector('p')!, { detectGeneratedClasses: false })).not.toContain('active');
  });
});

describe('escapeIdentifier', () => {
  it.each([
    ['simple', 'simple'],
    ['a.b', 'a\\.b'],
    ['1a', '\\31 a'],
    ['-1a', '-\\31 a'],
    ['-', '\\-'],
    ['a b', 'a\\ b'],
    ['é', 'é'],
    ['a\u0000b', 'a�b'],
  ])('%j → %j', (input, expected) => {
    expect(escapeIdentifier(input)).toBe(expected);
  });
});

describe('escapeString', () => {
  it('escapet aanhalingstekens, backslashes en regeleinden', () => {
    expect(escapeString('a"b\\c\nd')).toBe('"a\\"b\\\\c\\a d"');
  });
});
