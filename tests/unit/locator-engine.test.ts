// @vitest-environment jsdom
// happy-dom heeft geen document.evaluate; de XPath-validatie vraagt jsdom.
import { beforeEach, describe, expect, it } from 'vitest';
import { buildLocator } from '@/engine/locator-engine';

function render(html: string): void {
  document.body.innerHTML = html;
}

function $(selector: string): Element {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Fixture mist ${selector}`);
  return el;
}

function nth(selector: string, index: number): Element {
  const el = document.querySelectorAll(selector)[index];
  if (!el) throw new Error(`Fixture mist ${selector}[${index}]`);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('buildLocator: testattribuut', () => {
  it('kiest data-testid boven id en rol', () => {
    render('<button id="save" data-testid="save-btn">Opslaan</button>');
    expect(buildLocator($('button'))).toEqual({
      strategy: 'test-attribute',
      locator: '[data-testid="save-btn"]',
      matches: 1,
    });
  });

  it('gebruikt een instelbaar testattribuut', () => {
    render('<button data-cy="go">Go</button>');
    const result = buildLocator($('button'), { testAttributes: ['data-cy'] });
    expect(result.locator).toBe('[data-cy="go"]');
  });

  it('escapet aanhalingstekens in de waarde', () => {
    render('<button data-testid=\'a"b\'>X</button>');
    expect(buildLocator($('button')).locator).toBe('[data-testid="a\\"b"]');
  });

  it('slaat een niet-uniek testattribuut over en valt terug op id', () => {
    render('<button id="a" data-testid="dup">A</button><button data-testid="dup">B</button>');
    const result = buildLocator($('#a'));
    expect(result).toEqual({ strategy: 'id', locator: '#a', matches: 1 });
  });
});

describe('buildLocator: id', () => {
  it('gebruikt id als er geen testattribuut is', () => {
    render('<div id="main"><span>x</span></div>');
    expect(buildLocator($('#main'))).toEqual({ strategy: 'id', locator: '#main', matches: 1 });
  });

  it('gebruikt een attribuutselector voor ids met speciale tekens', () => {
    render('<div id="1:a.b"></div>');
    const result = buildLocator($('div'));
    expect(result.strategy).toBe('id');
    expect(result.locator).toBe('[id="1:a.b"]');
    expect(document.querySelectorAll(result.locator)).toHaveLength(1);
  });

  it('slaat een dubbel id over en valt terug op rol + naam', () => {
    render('<button id="x">Eerste</button><button id="x">Tweede</button>');
    const result = buildLocator(nth('button', 1));
    expect(result).toEqual({ strategy: 'role-name', locator: 'role=button[name="Tweede"]', matches: 1 });
  });
});

describe('buildLocator: rol + naam', () => {
  it('gebruikt de tekst van een knop', () => {
    render('<button>Opslaan</button><button>Annuleren</button>');
    expect(buildLocator(nth('button', 1))).toEqual({
      strategy: 'role-name',
      locator: 'role=button[name="Annuleren"]',
      matches: 1,
    });
  });

  it('gebruikt aria-label', () => {
    render('<a href="/x" aria-label="Sluiten">×</a>');
    expect(buildLocator($('a')).locator).toBe('role=link[name="Sluiten"]');
  });

  it('gebruikt het label van een invoerveld', () => {
    render('<label>E-mail <input type="email"></label>');
    expect(buildLocator($('input')).locator).toBe('role=textbox[name="E-mail"]');
  });

  it('gebruikt een expliciete role met aria-label', () => {
    render('<div role="tab" aria-label="Overzicht"></div>');
    expect(buildLocator($('div')).locator).toBe('role=tab[name="Overzicht"]');
  });

  it('slaat over bij dubbele rol + naam en valt terug op XPath', () => {
    render('<button>Ok</button><button>Ok</button>');
    expect(buildLocator(nth('button', 0)).strategy).toBe('xpath');
  });

  it('slaat over als het element geen naam heeft', () => {
    render('<button></button>');
    expect(buildLocator($('button')).strategy).toBe('xpath');
  });
});

describe('buildLocator: structurele XPath', () => {
  it('geeft een uniek pad met posities voor gelijke zusters', () => {
    render('<div><span></span><span></span></div>');
    const second = nth('span', 1);
    const result = buildLocator(second);
    expect(result).toEqual({
      strategy: 'xpath',
      locator: '/html/body/div/span[2]',
      matches: 1,
    });
  });

  it('laat de index weg bij een enige zuster', () => {
    render('<section><p></p></section>');
    expect(buildLocator($('p')).locator).toBe('/html/body/section/p');
  });
});
