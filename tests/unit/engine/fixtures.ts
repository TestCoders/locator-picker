// Gedeelde fixtures voor de CSS- en XPath-generator (issues #8 en #9).
// Elke fixture beschrijft een stukje DOM, het gekozen element en de
// verwachte locator in beide formaten.

export interface LocatorFixture {
  name: string;
  html: string;
  /** Kiest het doelelement; root is het document of de shadow root. */
  target: (root: ParentNode) => Element;
  css: string;
  xpath: string;
  /** Inhoud van een open shadow root op #host; het doel staat daarin. */
  shadowHtml?: string;
  testAttributes?: readonly string[];
}

function nth(selector: string, index = 0): (root: ParentNode) => Element {
  return (root) => {
    const el = root.querySelectorAll(selector)[index];
    if (!el) throw new Error(`fixture mist element: ${selector}[${index}]`);
    return el;
  };
}

export const FIXTURES: readonly LocatorFixture[] = [
  {
    name: '1. data-testid geeft een korte attribuutselector',
    html: '<form><button data-testid="login" id="btn-1" class="btn">Inloggen</button></form>',
    target: nth('button'),
    css: '[data-testid="login"]',
    xpath: '//button[@data-testid="login"]',
  },
  {
    name: '2. testattribuut gaat voor id',
    html: '<input id="email" data-cy="email-input" />',
    target: nth('input'),
    css: '[data-cy="email-input"]',
    xpath: '//input[@data-cy="email-input"]',
  },
  {
    name: '3. uniek id',
    html: '<div><span id="status">ok</span></div>',
    target: nth('span'),
    css: '#status',
    xpath: '//span[@id="status"]',
  },
  {
    name: '4. id met speciale tekens',
    html: '<div id="user:42.name [x]">x</div>',
    target: nth('div'),
    css: '#user\\:42\\.name\\ \\[x\\]',
    xpath: '//div[@id="user:42.name [x]"]',
  },
  {
    name: '5. id dat met een cijfer begint',
    html: '<p id="1st">x</p>',
    target: nth('p'),
    css: '#\\31 st',
    xpath: '//p[@id="1st"]',
  },
  {
    name: '6. attribuutwaarde met dubbele quotes en backslash',
    html: '<button data-testid=\'say "hi" \\ now\'>x</button>',
    target: nth('button'),
    css: '[data-testid="say \\"hi\\" \\\\ now"]',
    xpath: `//button[@data-testid='say "hi" \\ now']`,
  },
  {
    name: '7. dubbel id valt terug op een stabieler kenmerk',
    html: '<input id="dup" name="first" /><input id="dup" name="last" />',
    target: nth('input', 1),
    css: 'input[name="last"]',
    xpath: '//input[@name="last"]',
  },
  {
    name: '8. name-attribuut zonder id of testattribuut',
    html: '<form><input type="text" name="username" /><input type="password" name="password" /></form>',
    target: nth('input', 1),
    css: 'input[name="password"]',
    xpath: '//input[@name="password"]',
  },
  {
    name: '9. unieke class (CSS) of zichtbare tekst (XPath)',
    html: '<nav><a class="link">Home</a><a class="link logout">Uitloggen</a></nav>',
    target: nth('a', 1),
    css: 'a.logout',
    xpath: '//a[normalize-space()="Uitloggen"]',
  },
  {
    name: '10. gegenereerde en status-classes worden overgeslagen',
    html:
      '<ul><li class="item css-1q2w3e">a</li><li class="item active Item_root__x7Yz2">b</li></ul>' +
      '<section><li class="item">c</li></section>',
    target: nth('li', 1),
    css: 'ul > li:nth-of-type(2)',
    xpath: '//li[normalize-space()="b"]',
  },
  {
    name: '11. testattribuut op een voorouder als anker',
    html:
      '<div data-testid="cart"><div><div><button>Afrekenen</button></div></div></div>' +
      '<div data-testid="wishlist"><button>Afrekenen</button></div>',
    target: nth('button'),
    css: '[data-testid="cart"] button',
    xpath: '//div[@data-testid="cart"]//button',
  },
  {
    name: '12. lijstitem zonder kenmerken onder een id-anker',
    html: '<ul id="menu"><li>a</li><li>b</li><li>c</li></ul><ul><li>c</li></ul>',
    target: nth('li', 2),
    css: '#menu li:nth-of-type(3)',
    xpath: '//ul[@id="menu"]//li[normalize-space()="c"]',
  },
  {
    name: '13. positie telt alleen siblings met dezelfde tag',
    html: '<main><h2>t</h2><p>a</p><p>a</p></main><aside><p>a</p></aside>',
    target: nth('p', 1),
    css: 'main > p:nth-of-type(2)',
    xpath: '//main/p[2]',
  },
  {
    name: '14. role en aria-label',
    html: '<div role="dialog" aria-label="Bevestigen"><button>OK</button></div><div role="dialog"></div>',
    target: nth('[aria-label]'),
    css: 'div[aria-label="Bevestigen"]',
    xpath: '//div[@aria-label="Bevestigen"]',
  },
  {
    name: '15. dubbele testattribuut-waarde via een anker onderscheiden',
    html:
      '<table id="orders"><tbody><tr><td data-testid="cell">1</td></tr>' +
      '<tr><td data-testid="cell">2</td></tr></tbody></table>',
    target: nth('td', 1),
    css: '#orders tr:nth-of-type(2) > [data-testid="cell"]',
    xpath: '//td[normalize-space()="2"]',
  },
  {
    name: '16. SVG-element binnen een knop',
    html: '<button data-testid="close"><svg><path d="M0 0"></path></svg></button>',
    target: nth('path'),
    css: '[data-testid="close"] path',
    xpath: '//button[@data-testid="close"]//*[local-name(.)="path"]',
  },
  {
    name: '17. element binnen een shadow root',
    html: '<div id="host"></div>',
    shadowHtml: '<span class="label">a</span><span class="label">a</span>',
    target: nth('span', 1),
    css: 'span:nth-of-type(2)',
    xpath: './/span[2]',
  },
  {
    name: '18. eigen testattribuut via opties',
    html: '<button data-automation="pay" data-testid="dup"></button><i data-testid="dup"></i>',
    target: nth('button'),
    testAttributes: ['data-automation'],
    css: '[data-automation="pay"]',
    xpath: '//button[@data-automation="pay"]',
  },
  {
    name: '19. tekst met enkele én dubbele quotes',
    html: `<ul><li><button>Klik "hier" a.u.b.</button></li><li><button>It's "ok"</button></li></ul>`,
    target: nth('button', 1),
    css: 'li:nth-of-type(2) > button',
    xpath: `//button[normalize-space()=concat("It's ", '"', "ok", '"', "")]`,
  },
  {
    name: '20. structureel als niets anders uniek is',
    html: '<div><div><span>x</span></div><div><span>x</span></div></div>',
    target: nth('span', 1),
    css: 'div:nth-of-type(2) > span',
    xpath: '//div[2]/span',
  },
];

/** Zet de fixture in het document en geeft het doelelement terug. */
export function mountFixture(fixture: LocatorFixture): { el: Element; root: Document | ShadowRoot } {
  document.body.innerHTML = fixture.html;
  if (fixture.shadowHtml === undefined) {
    return { el: fixture.target(document), root: document };
  }
  const host = document.getElementById('host');
  if (!host) throw new Error('shadow-fixture mist #host');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = fixture.shadowHtml;
  return { el: fixture.target(shadow), root: shadow };
}
