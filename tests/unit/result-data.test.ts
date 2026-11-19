// @vitest-environment jsdom
// jsdom voor document.evaluate (XPath).
import { beforeEach, describe, expect, it } from 'vitest';
import { buildResult } from '@/content/result-data';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('buildResult', () => {
  it('geeft CSS, XPath en Playwright met het aantal matches', () => {
    document.body.innerHTML = '<form><button data-testid="save">  Opslaan  </button><button>Terug</button></form>';
    const result = buildResult(document.querySelector('button')!);

    expect(result.tagName).toBe('button');
    expect(result.text).toBe('Opslaan');
    expect(result.strategy).toBe('test-attribute');
    expect(result.entries.map((e) => [e.format, e.value, e.matches])).toEqual([
      ['css', '[data-testid="save"]', 1],
      ['xpath', '//button[@data-testid="save"]', 1],
      ['playwright', "page.getByTestId('save')", 1],
    ]);
  });

  it('elke locator vindt het element uniek, ook zonder attributen', () => {
    document.body.innerHTML = '<ul><li><span>a</span></li><li><span>b</span></li></ul>';
    const result = buildResult(document.querySelectorAll('span')[1]!);

    for (const entry of result.entries) expect(entry.matches, entry.format).toBe(1);
  });

  it('meet de rekentijd', () => {
    document.body.innerHTML = '<p id="x">x</p>';
    let t = 0;
    const result = buildResult(document.querySelector('p')!, { now: () => (t += 5) });
    expect(result.durationMs).toBe(5);
  });
});

describe('buildResult: testhook-waarschuwing', () => {
  it('waarschuwt bij een element zonder testattribuut, id en naam', () => {
    document.body.innerHTML = '<form><div class="x">Totaal</div></form>';
    const result = buildResult(document.querySelector('div')!);
    expect(result.warning?.suggestion).toBe('data-testid="form-totaal"');
  });

  it('waarschuwt niet bij een element met testattribuut', () => {
    document.body.innerHTML = '<div data-testid="total">Totaal</div>';
    expect(buildResult(document.querySelector('div')!).warning).toBeUndefined();
  });
});

