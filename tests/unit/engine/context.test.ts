// @vitest-environment jsdom
// jsdom voor same-origin iframes (contentDocument, frameElement) en XPath.
import { beforeEach, describe, expect, it } from 'vitest';
import { buildResult } from '@/content/result-data';
import { contextOf, describeContext } from '@/engine/context';
import { buildLocator, structuralXPath } from '@/engine/locator-engine';
import { scopedPlaywrightSnippet } from '@/engine/snippets/playwright';

function shadow(host: Element, html: string): ShadowRoot {
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = html;
  return root;
}

function iframe(id: string, html: string, parent: ParentNode & Node = document.body): Document {
  const frame = document.createElement('iframe');
  frame.id = id;
  (parent as Element).append(frame);
  const doc = frame.contentDocument!;
  doc.body.innerHTML = html;
  return doc;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('contextOf', () => {
  it('is leeg voor een element in het hoofddocument', () => {
    document.body.innerHTML = '<button>OK</button>';
    expect(contextOf(document.querySelector('button')!)).toEqual([]);
  });

  it('geeft de keten van shadow roots, van buiten naar binnen', () => {
    document.body.innerHTML = '<product-card></product-card>';
    const outer = shadow(document.querySelector('product-card')!, '<price-tag></price-tag>');
    const inner = shadow(outer.querySelector('price-tag')!, '<span>€ 10</span>');

    const steps = contextOf(inner.querySelector('span')!);
    expect(steps).toEqual([
      { kind: 'shadow', selector: 'product-card' },
      { kind: 'shadow', selector: 'price-tag' },
    ]);
    expect(describeContext(steps)).toBe('shadow root van product-card › shadow root van price-tag');
  });

  it('geeft iframes en shadow roots door elkaar', () => {
    const doc = iframe('checkout', '<pay-form></pay-form>');
    const root = shadow(doc.querySelector('pay-form')!, '<button data-testid="pay">Betalen</button>');

    expect(contextOf(root.querySelector('button')!)).toEqual([
      { kind: 'frame', selector: '#checkout' },
      { kind: 'shadow', selector: 'pay-form' },
    ]);
  });

  it('geneste iframes', () => {
    const outer = iframe('outer', '');
    const inner = iframe('inner', '<a href="#">x</a>', outer.body);
    expect(contextOf(inner.querySelector('a')!)).toEqual([
      { kind: 'frame', selector: '#outer' },
      { kind: 'frame', selector: '#inner' },
    ]);
  });
});

describe('locator-engine binnen een shadow root', () => {
  it('telt binnen de shadow root, niet in het document', () => {
    document.body.innerHTML = '<product-card></product-card><button data-testid="buy">Elders</button>';
    const root = shadow(document.querySelector('product-card')!, '<button data-testid="buy">Kopen</button>');
    const result = buildLocator(root.querySelector('button')!);
    expect(result).toMatchObject({ strategy: 'test-attribute', locator: '[data-testid="buy"]', matches: 1 });
  });

  it('structurele XPath is relatief vanaf de shadow root', () => {
    document.body.innerHTML = '<x-list></x-list>';
    const root = shadow(document.querySelector('x-list')!, '<div><span>a</span><span>b</span></div>');
    const el = root.querySelectorAll('span')[1]!;
    expect(structuralXPath(el)).toBe('./div/span[2]');
    expect(buildLocator(el)).toMatchObject({ strategy: 'xpath', locator: './div/span[2]', matches: 1 });
  });
});

describe('scopedPlaywrightSnippet', () => {
  const testId = { strategy: 'test-attribute', attribute: 'data-testid', value: 'pay', locator: '[data-testid="pay"]', matches: 1 } as const;

  it('zonder context gelijk aan de gewone snippet', () => {
    expect(scopedPlaywrightSnippet([], testId)).toBe("page.getByTestId('pay')");
  });

  it('iframe via frameLocator, shadow root via locator(host)', () => {
    expect(
      scopedPlaywrightSnippet(
        [
          { kind: 'frame', selector: '#checkout' },
          { kind: 'shadow', selector: 'pay-form' },
        ],
        testId,
      ),
    ).toBe("page.frameLocator('#checkout').locator('pay-form').getByTestId('pay')");
  });

  it('in een shadow root valt een XPath terug op CSS, want XPath gaat niet door shadow roots', () => {
    expect(
      scopedPlaywrightSnippet([{ kind: 'shadow', selector: 'x-list' }], { strategy: 'xpath', locator: './div/span[2]', matches: 1 }, { css: 'div > span:nth-of-type(2)' }),
    ).toBe("page.locator('x-list').locator('div > span:nth-of-type(2)')");
  });

  it('in een iframe blijft een XPath een XPath', () => {
    expect(
      scopedPlaywrightSnippet([{ kind: 'frame', selector: '#f' }], { strategy: 'xpath', locator: '/html/body/div[2]', matches: 1 }),
    ).toBe("page.frameLocator('#f').locator('xpath=/html/body/div[2]')");
  });

  it('selectors met quotes worden geëscaped', () => {
    expect(scopedPlaywrightSnippet([{ kind: 'frame', selector: "iframe[title='Pay']" }], testId)).toBe(
      "page.frameLocator('iframe[title=\\'Pay\\']').getByTestId('pay')",
    );
  });
});

describe('buildResult met context', () => {
  it('geeft de context en een snippet met de hele keten', () => {
    const doc = iframe('checkout', '<pay-form></pay-form>');
    const root = shadow(doc.querySelector('pay-form')!, '<button data-testid="pay">Betalen</button>');

    const result = buildResult(root.querySelector('button')!);
    expect(result.contextLabel).toBe('iframe #checkout › shadow root van pay-form');
    // Geen XPath in een shadow root.
    expect(result.inShadowRoot).toBe(true);
    expect(result.entries.map((e) => [e.format, e.value, e.matches])).toEqual([
      ['css', '[data-testid="pay"]', 1],
      ['playwright', "page.frameLocator('#checkout').locator('pay-form').getByTestId('pay')", 1],
    ]);
  });

  it('zonder context geen contextlabel', () => {
    document.body.innerHTML = '<button data-testid="save">Opslaan</button>';
    const result = buildResult(document.querySelector('button')!);
    expect(result.context).toBeUndefined();
    expect(result.contextLabel).toBeUndefined();
    expect(result.inShadowRoot).toBeUndefined();
  });

  it('in een iframe (zonder shadow root) wel een XPath, binnen dat document', () => {
    const doc = iframe('checkout', '<button data-testid="pay">Betalen</button>');
    const result = buildResult(doc.querySelector('button')!);
    expect(result.entries.find((e) => e.format === 'xpath')).toMatchObject({ value: '//button[@data-testid="pay"]', matches: 1 });
  });
});
