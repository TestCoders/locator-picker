// @vitest-environment jsdom
// jsdom omdat happy-dom geëscapete selectors niet goed parst.
import { beforeEach, describe, expect, it } from 'vitest';
import { cssSelector, escapeIdentifier, escapeString } from '@/engine/css';

function mount(html: string): void {
  document.body.innerHTML = html;
}

function pick(selector: string, index = 0, root: ParentNode = document): Element {
  const el = root.querySelectorAll(selector)[index];
  if (!el) throw new Error(`fixture mist element: ${selector}`);
  return el;
}

/** De gegenereerde selector moet exact het gekozen element opleveren. */
function expectSelector(el: Element, expected: string): void {
  const selector = cssSelector(el);
  expect(selector).toBe(expected);
  const matches = document.querySelectorAll(selector);
  expect(matches).toHaveLength(1);
  expect(matches[0]).toBe(el);
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('cssSelector: fixtures', () => {
  it('1. data-testid geeft een korte attribuutselector', () => {
    mount('<form><button data-testid="login" id="btn-1" class="btn">Inloggen</button></form>');
    expectSelector(pick('button'), '[data-testid="login"]');
  });

  it('2. testattribuut gaat voor id', () => {
    mount('<input id="email" data-cy="email-input" />');
    expectSelector(pick('input'), '[data-cy="email-input"]');
  });

  it('3. uniek id geeft #id', () => {
    mount('<div><span id="status">ok</span></div>');
    expectSelector(pick('span'), '#status');
  });

  it('4. id met speciale tekens wordt geëscaped', () => {
    mount('<div id="user:42.name [x]">x</div>');
    const el = document.getElementById('user:42.name [x]')!;
    expectSelector(el, '#user\\:42\\.name\\ \\[x\\]');
  });

  it('5. id dat met een cijfer begint wordt geëscaped', () => {
    mount('<p id="1st">x</p>');
    expectSelector(document.getElementById('1st')!, '#\\31 st');
  });

  it('6. attribuutwaarde met aanhalingstekens en backslash wordt geëscaped', () => {
    mount('<button data-testid=\'say "hi" \\ now\'>x</button>');
    expectSelector(pick('button'), '[data-testid="say \\"hi\\" \\\\ now"]');
  });

  it('7. dubbel id valt terug op een stabieler kenmerk', () => {
    mount('<input id="dup" name="first" /><input id="dup" name="last" />');
    expectSelector(pick('[name="last"]'), 'input[name="last"]');
  });

  it('8. name-attribuut als er geen id of testattribuut is', () => {
    mount('<form><input type="text" name="username" /><input type="password" name="password" /></form>');
    expectSelector(pick('[name="password"]'), 'input[name="password"]');
  });

  it('9. unieke class zonder nth-child', () => {
    mount('<nav><a class="link">Home</a><a class="link logout">Uitloggen</a></nav>');
    expectSelector(pick('.logout'), 'a.logout');
  });

  it('10. gegenereerde en status-classes worden overgeslagen', () => {
    mount(
      '<ul><li class="item css-1q2w3e">a</li><li class="item active Item_root__x7Yz2">b</li></ul>' +
        '<section><li class="item">c</li></section>',
    );
    // Geen enkele class is stabiel en uniek, dus positie onder de ul.
    expectSelector(pick('.active'), 'ul > li:nth-of-type(2)');
  });

  it('11. testattribuut op een voorouder als anker, zonder tussenliggende stappen', () => {
    mount(
      '<div data-testid="cart"><div><div><button>Afrekenen</button></div></div></div>' +
        '<div data-testid="wishlist"><button>Afrekenen</button></div>',
    );
    expectSelector(pick('[data-testid="cart"] button'), '[data-testid="cart"] button');
  });

  it('12. lijstitem zonder kenmerken krijgt alleen nth-of-type waar nodig', () => {
    mount('<ul id="menu"><li>a</li><li>b</li><li>c</li></ul><ul><li>x</li></ul>');
    expectSelector(pick('#menu li:nth-child(3)'), '#menu li:nth-of-type(3)');
  });

  it('13. nth-of-type telt alleen siblings met dezelfde tag', () => {
    mount('<main><h2>t</h2><p>a</p><p>b</p></main><aside><p>c</p></aside>');
    expectSelector(pick('main p:last-of-type'), 'main > p:nth-of-type(2)');
  });

  it('14. role en aria-label worden gebruikt', () => {
    mount('<div role="dialog" aria-label="Bevestigen"><button>OK</button></div><div role="dialog"></div>');
    expectSelector(pick('[aria-label]'), 'div[aria-label="Bevestigen"]');
  });

  it('15. dubbele testattribuut-waarde wordt via een anker onderscheiden', () => {
    mount(
      '<table id="orders"><tbody><tr><td data-testid="cell">1</td></tr><tr><td data-testid="cell">2</td></tr></tbody></table>',
    );
    const second = pick('td', 1);
    expectSelector(second, '#orders tr:nth-of-type(2) > [data-testid="cell"]');
  });

  it('16. SVG-element binnen een knop', () => {
    mount('<button data-testid="close"><svg><path d="M0 0"></path></svg></button>');
    expectSelector(pick('path'), '[data-testid="close"] path');
  });

  it('17. element binnen een shadow root krijgt een selector binnen die root', () => {
    mount('<div id="host"></div>');
    const shadow = document.getElementById('host')!.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<span class="label">a</span><span class="label">b</span>';
    const el = pick('span', 1, shadow);
    const selector = cssSelector(el);
    expect(selector).toBe('span:nth-of-type(2)');
    expect(Array.from(shadow.querySelectorAll(selector))).toEqual([el]);
  });

  it('18. eigen testattribuut via opties', () => {
    mount('<button data-automation="pay" data-testid="ignored-dup"></button><i data-testid="ignored-dup"></i>');
    expect(cssSelector(pick('button'), { testAttributes: ['data-automation'] })).toBe('[data-automation="pay"]');
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
