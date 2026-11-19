import { beforeEach, describe, expect, it } from 'vitest';
import { missingHookWarning, slug } from '@/engine/hook-warning';

function render(html: string): void {
  document.body.innerHTML = html;
}

function $(selector: string): Element {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Fixture mist ${selector}`);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('missingHookWarning: geen waarschuwing bij bruikbare hooks', () => {
  it('testattribuut', () => {
    render('<div data-testid="x"></div>');
    expect(missingHookWarning($('div'))).toBeNull();
  });

  it('id', () => {
    render('<div id="main"></div>');
    expect(missingHookWarning($('div'))).toBeNull();
  });

  it('toegankelijke naam uit tekst', () => {
    render('<button>Opslaan</button>');
    expect(missingHookWarning($('button'))).toBeNull();
  });

  it('toegankelijke naam uit aria-label', () => {
    render('<div aria-label="Sluiten"></div>');
    expect(missingHookWarning($('div'))).toBeNull();
  });

  it('een ander testattribuut uit de opties', () => {
    render('<div data-cy="x"></div>');
    expect(missingHookWarning($('div'), { testAttributes: ['data-cy'] })).toBeNull();
  });
});

describe('missingHookWarning: waarschuwing zonder hooks', () => {
  it('stelt data-testid voor, afgeleid van tekst', () => {
    render('<div>Hallo wereld</div>');
    const warning = missingHookWarning($('div'));
    expect(warning?.attribute).toBe('data-testid');
    expect(warning?.value).toBe('hallo-wereld');
    expect(warning?.suggestion).toBe('data-testid="hallo-wereld"');
    expect(warning?.message).toContain('data-testid="hallo-wereld"');
  });

  it('gebruikt het attribuut uit de opties', () => {
    render('<div>Hallo</div>');
    expect(missingHookWarning($('div'), { testAttributes: ['data-cy', 'data-testid'] })?.suggestion).toBe(
      'data-cy="hallo"',
    );
  });

  it('negeert een testattribuut dat niet in de opties staat', () => {
    render('<div data-testid="x">Hallo</div>');
    expect(missingHookWarning($('div'), { testAttributes: ['data-cy'] })?.attribute).toBe('data-cy');
  });

  it('voegt context toe van een voorouder met id', () => {
    render('<section id="checkout"><div>Totaal</div></section>');
    expect(missingHookWarning($('div'))?.value).toBe('checkout-totaal');
  });

  it('voegt context toe van een landmark-tag', () => {
    render('<form><span class="x"></span></form>');
    expect(missingHookWarning($('span'))?.value).toBe('form-span');
  });

  it('gebruikt het contextlabel van een voorouder met toegankelijke naam', () => {
    render('<nav aria-label="Hoofdmenu"><div></div></nav>');
    expect(missingHookWarning($('div'))?.value).toBe('hoofdmenu-div');
  });

  it('valt zonder tekst terug op name, placeholder of type', () => {
    render('<form><input type="hidden" name="csrf_token"></form>');
    expect(missingHookWarning($('input'))?.value).toBe('form-csrf-token');
  });

  it('valt zonder tekst of attributen terug op de rol, dan de tag', () => {
    render('<div role="separator"></div>');
    expect(missingHookWarning($('div'))?.value).toBe('separator');
    render('<span></span>');
    expect(missingHookWarning($('span'))?.value).toBe('span');
  });

  it('kort lange tekst in tot een paar woorden', () => {
    render('<p>een twee drie vier vijf zes zeven</p>');
    expect(missingHookWarning($('p'))?.value).toBe('een-twee-drie-vier');
  });
});

describe('slug', () => {
  it('maakt kleine letters zonder accenten en leestekens', () => {
    expect(slug('Café  Ünïcode!')).toBe('cafe-unicode');
  });

  it('is leeg bij niets bruikbaars', () => {
    expect(slug('!!!')).toBe('');
    expect(slug(null)).toBe('');
  });

  it('knipt af op 30 tekens zonder eindstreepje', () => {
    expect(slug('a'.repeat(29) + ' b')).toBe('a'.repeat(29));
  });
});
