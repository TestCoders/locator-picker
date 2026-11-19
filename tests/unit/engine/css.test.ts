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
