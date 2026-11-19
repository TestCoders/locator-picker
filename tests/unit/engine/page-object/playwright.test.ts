import { describe, expect, it } from 'vitest';
import { generatePlaywrightPageObject, validatePageObject } from '@/engine/page-object/playwright';

const LOGIN = {
  className: 'LoginPage',
  fields: [
    { name: 'emailInput', snippet: "page.locator('#email')" },
    { name: 'loginButton', snippet: "page.getByTestId('login')" },
    { name: 'overOnsLink', snippet: "page.getByRole('link', { name: 'Over ons', exact: true })" },
  ],
};

describe('generatePlaywrightPageObject', () => {
  it('maakt een klasse met een Locator-veld per snippet', () => {
    expect(generatePlaywrightPageObject(LOGIN)).toBe(`import type { Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly loginButton: Locator;
  readonly overOnsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#email');
    this.loginButton = page.getByTestId('login');
    this.overOnsLink = page.getByRole('link', { name: 'Over ons', exact: true });
  }
}
`);
  });

  it('weigert ongeldige namen', () => {
    expect(() => generatePlaywrightPageObject({ ...LOGIN, className: '1Page' })).toThrow(/Ongeldig page object/);
  });
});

describe('validatePageObject', () => {
  it('geeft geen fouten voor een geldig page object', () => {
    expect(validatePageObject(LOGIN)).toEqual([]);
  });

  it('meldt per veld wat er mis is, ook dubbele namen', () => {
    const errors = validatePageObject({
      className: 'class',
      fields: [
        { name: 'saveButton', snippet: "page.getByTestId('a')" },
        { name: 'saveButton', snippet: "page.getByTestId('b')" },
        { name: 'e-mail', snippet: "page.locator('#e')" },
      ],
    });
    expect(errors).toEqual([
      { field: 'className', message: "'class' is een gereserveerd woord." },
      { field: 1, message: "'saveButton' komt al eerder voor." },
      { field: 2, message: 'Alleen letters, cijfers, _ en $; niet beginnen met een cijfer.' },
    ]);
  });
});
