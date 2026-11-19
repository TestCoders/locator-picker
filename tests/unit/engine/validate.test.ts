// @vitest-environment jsdom
// jsdom omdat happy-dom geen document.evaluate (XPath) heeft.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  chooseUniqueLocator,
  countMatches,
  validateLocator,
  type Locator,
} from '@/engine/validate';

const css = (value: string): Locator => ({ kind: 'css', value });
const xpath = (value: string): Locator => ({ kind: 'xpath', value });

function byId(id: string): Element {
  const el = document.getElementById(id);
  if (!el) throw new Error(`fixture mist element: #${id}`);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = `
    <form id="login">
      <input name="user" id="user">
      <button class="btn" id="submit">Inloggen</button>
      <button class="btn" id="cancel">Annuleren</button>
    </form>
  `;
});

describe('validateLocator', () => {
  it('telt één match op het gekozen element als uniek', () => {
    expect(validateLocator(css('#submit'), byId('submit'))).toEqual({
      locator: css('#submit'),
      count: 1,
      status: 'unique',
    });
  });

  it('meldt meer dan één match als ambigu', () => {
    const result = validateLocator(css('button.btn'), byId('submit'));
    expect(result.count).toBe(2);
    expect(result.status).toBe('ambiguous');
  });

  it('meldt nul matches als fout', () => {
    const result = validateLocator(css('[data-testid="weg"]'), byId('submit'));
    expect(result.count).toBe(0);
    expect(result.status).toBe('none');
    expect(result.error).toMatch(/geen element/);
  });

  it('herkent een unieke locator die een ander element vindt', () => {
    const result = validateLocator(css('#cancel'), byId('submit'));
    expect(result.count).toBe(1);
    expect(result.status).toBe('wrong-element');
  });

  it('meldt een ongeldige selector als fout in plaats van te crashen', () => {
    const result = validateLocator(css('button[['), byId('submit'));
    expect(result.status).toBe('invalid');
    expect(result.error).toMatch(/Ongeldige CSS-selector/);
  });

  it('telt XPath-matches', () => {
    expect(validateLocator(xpath('//button[text()="Inloggen"]'), byId('submit')).status).toBe('unique');
    expect(validateLocator(xpath('//button'), byId('submit')).count).toBe(2);
    expect(validateLocator(xpath('//a'), byId('submit')).status).toBe('none');
    expect(validateLocator(xpath('//button[['), byId('submit')).status).toBe('invalid');
  });

  it('zoekt binnen de shadow root van het element', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<button id="submit">In shadow</button>';
    const inner = shadow.querySelector('button')!;

    // Het document heeft ook een #submit, maar binnen de shadow root is hij uniek.
    expect(validateLocator(css('#submit'), inner).status).toBe('unique');
  });
});

describe('countMatches', () => {
  it('geeft het aantal matches, en 0 bij een ongeldige locator', () => {
    expect(countMatches(css('button'))).toBe(2);
    expect(countMatches(xpath('//input'))).toBe(1);
    expect(countMatches(css(':::'))).toBe(0);
  });
});

describe('chooseUniqueLocator', () => {
  it('slaat ambigue kandidaten over en kiest de volgende strategie', () => {
    const choice = chooseUniqueLocator(
      [css('button.btn'), css('#login button:first-of-type'), css('#submit')],
      byId('submit'),
    );

    expect(choice.chosen?.locator).toEqual(css('#login button:first-of-type'));
    expect(choice.results.map((r) => [r.count, r.status])).toEqual([
      [2, 'ambiguous'],
      [1, 'unique'],
    ]);
    expect(choice.error).toBeUndefined();
  });

  it('kiest nooit een kandidaat die een ander element vindt', () => {
    const choice = chooseUniqueLocator([css('#cancel'), xpath('//*[@id="submit"]')], byId('submit'));
    expect(choice.chosen?.locator).toEqual(xpath('//*[@id="submit"]'));
  });

  it('geeft een fout als geen enkele kandidaat bruikbaar is, met de telling per kandidaat', () => {
    const choice = chooseUniqueLocator([css('button'), css('.bestaat-niet')], byId('submit'));

    expect(choice.chosen).toBeNull();
    expect(choice.error).toMatch(/Geen enkele kandidaat/);
    expect(choice.results.map((r) => r.status)).toEqual(['ambiguous', 'none']);
    expect(choice.timedOut).toBe(false);
  });

  it('stopt als het tijdsbudget op is', () => {
    // Klok in ms: start, check vóór kandidaat 2, check vóór kandidaat 3, einde.
    const clock = [0, 400, 1100, 1100];
    const choice = chooseUniqueLocator([css('button'), css('button.btn'), css('#submit')], byId('submit'), {
      timeBudgetMs: 1000,
      now: () => clock.shift() ?? 1100,
    });

    expect(choice.timedOut).toBe(true);
    expect(choice.chosen).toBeNull();
    expect(choice.results.map((r) => r.locator)).toEqual([css('button'), css('button.btn')]);
    expect(choice.error).toMatch(/tijdslimiet/);
  });

  // Alleen CSS: de XPath-implementatie van jsdom is traag (~2 s voor deze
  // pagina), in de browser is document.evaluate native en snel.
  it('valideert snel genoeg op een grote pagina', () => {
    const rows = Array.from(
      { length: 5000 },
      (_, i) => `<li class="row"><span class="label">Item ${i}</span><button class="btn">Kies</button></li>`,
    );
    document.body.innerHTML = `<ul id="list">${rows.join('')}</ul>`;
    const target = document.querySelectorAll('button')[4321]!;
    const candidates = [
      css('button.btn'),
      css('li.row > button'),
      css('#list > li:nth-of-type(4322) > button'),
    ];

    const choice = chooseUniqueLocator(candidates, target);

    expect(choice.chosen?.locator).toEqual(candidates[2]);
    expect(choice.results.map((r) => r.count)).toEqual([5000, 5000, 1]);
    // Ruim onder de 3 s 'klik tot clipboard', ook in jsdom.
    expect(choice.durationMs).toBeLessThan(1000);
  });
});
