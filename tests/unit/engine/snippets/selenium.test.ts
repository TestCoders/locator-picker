// @vitest-environment jsdom
// jsdom omdat happy-dom geëscapete selectors niet goed parst.
import { describe, expect, it } from 'vitest';
import {
  csharpString,
  javaString,
  seleniumBy,
  seleniumSnippet,
  toSeleniumLocator,
  type SeleniumLocator,
} from '@/engine/snippets/selenium';

describe('seleniumSnippet per strategie', () => {
  const cases: { name: string; locator: SeleniumLocator; java: string; csharp: string }[] = [
    {
      name: 'testattribuut',
      locator: { strategy: 'test-attribute', selector: '[data-testid="login"]' },
      java: 'driver.findElement(By.cssSelector("[data-testid=\\"login\\"]"))',
      csharp: 'driver.FindElement(By.CssSelector("[data-testid=\\"login\\"]"))',
    },
    {
      name: 'id',
      locator: { strategy: 'id', id: 'email' },
      java: 'driver.findElement(By.id("email"))',
      csharp: 'driver.FindElement(By.Id("email"))',
    },
    {
      name: 'CSS',
      locator: { strategy: 'css', selector: 'nav > a.logout' },
      java: 'driver.findElement(By.cssSelector("nav > a.logout"))',
      csharp: 'driver.FindElement(By.CssSelector("nav > a.logout"))',
    },
    {
      name: 'XPath',
      locator: { strategy: 'xpath', expression: '//div[@data-testid="cart"]//button' },
      java: 'driver.findElement(By.xpath("//div[@data-testid=\\"cart\\"]//button"))',
      csharp: 'driver.FindElement(By.XPath("//div[@data-testid=\\"cart\\"]//button"))',
    },
  ];

  it.each(cases)('Java: $name', ({ locator, java }) => {
    expect(seleniumSnippet(locator, 'java')).toBe(java);
  });

  it.each(cases)('C#: $name', ({ locator, csharp }) => {
    expect(seleniumSnippet(locator, 'csharp')).toBe(csharp);
  });

  it('seleniumBy geeft alleen de By-expressie', () => {
    expect(seleniumBy({ strategy: 'id', id: 'email' }, 'java')).toBe('By.id("email")');
    expect(seleniumBy({ strategy: 'id', id: 'email' }, 'csharp')).toBe('By.Id("email")');
  });
});

describe('escaping', () => {
  it('CSS-selector met escapes houdt zijn backslashes', () => {
    const locator: SeleniumLocator = { strategy: 'css', selector: '#user\\:42\\.name' };
    expect(seleniumSnippet(locator, 'java')).toBe('driver.findElement(By.cssSelector("#user\\\\:42\\\\.name"))');
    expect(seleniumSnippet(locator, 'csharp')).toBe('driver.FindElement(By.CssSelector("#user\\\\:42\\\\.name"))');
  });

  it('XPath met concat() en beide soorten quotes', () => {
    const expression = `//button[normalize-space()=concat("It's ", '"', "ok")]`;
    expect(seleniumBy({ strategy: 'xpath', expression }, 'java')).toBe(
      `By.xpath("//button[normalize-space()=concat(\\"It's \\", '\\"', \\"ok\\")]")`,
    );
  });

  it.each([
    ['plain', '"plain"', '"plain"'],
    ['a"b', '"a\\"b"', '"a\\"b"'],
    ['a\\b', '"a\\\\b"', '"a\\\\b"'],
    ['a\nb\r\tc', '"a\\nb\\r\\tc"', '"a\\nb\\r\\tc"'],
    ['nul\u0000', '"nul\\u0000"', '"nul\\0"'],
    ['vt\u000b', '"vt\\u000b"', '"vt\\v"'],
    ['ls ', '"ls\\u2028"', '"ls\\u2028"'],
    ['é ✓ 😀', '"é ✓ 😀"', '"é ✓ 😀"'],
    ['\\u0041', '"\\\\u0041"', '"\\\\u0041"'],
  ])('%j', (input, java, csharp) => {
    expect(javaString(input)).toBe(java);
    expect(csharpString(input)).toBe(csharp);
  });
});

describe('toSeleniumLocator', () => {
  it('testattribuut blijft een CSS-selector', () => {
    expect(
      toSeleniumLocator({
        strategy: 'test-attribute',
        attribute: 'data-testid',
        value: 'x',
        locator: '[data-testid="x"]',
        matches: 1,
      }),
    ).toEqual({
      strategy: 'test-attribute',
      selector: '[data-testid="x"]',
    });
  });

  it('id wordt By.id met de ruwe id, niet de selector', () => {
    expect(toSeleniumLocator({ strategy: 'id', id: 'a"b c', locator: '[id="a\\"b c"]', matches: 1 })).toEqual({
      strategy: 'id',
      id: 'a"b c',
    });
  });

  it('XPath blijft XPath', () => {
    expect(toSeleniumLocator({ strategy: 'xpath', locator: '/html/body/div[2]', matches: 1 })).toEqual({
      strategy: 'xpath',
      expression: '/html/body/div[2]',
    });
  });

  it('rol + naam heeft geen Selenium-equivalent', () => {
    expect(toSeleniumLocator({ strategy: 'role-name', role: 'button', name: 'OK', locator: 'role=button[name="OK"]', matches: 1 })).toBeNull();
  });
});

describe('samen met de locator-engine', () => {
  it('id met quotes en backslash komt ongeschonden in By.id', async () => {
    const { buildLocator } = await import('@/engine/locator-engine');
    document.body.innerHTML = '<input id=\'a"b\\c\' />';
    const result = buildLocator(document.querySelector('input')!);
    expect(result.strategy).toBe('id');
    const locator = toSeleniumLocator(result);
    expect(locator).toEqual({ strategy: 'id', id: 'a"b\\c' });
    expect(seleniumSnippet(locator!, 'java')).toBe('driver.findElement(By.id("a\\"b\\\\c"))');
  });
});
