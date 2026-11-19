import { describe, expect, it } from 'vitest';
import {
  classNameError,
  fieldNameError,
  suggestClassName,
  suggestFieldName,
  uniqueNames,
} from '@/engine/page-object/naming';

describe('suggestFieldName', () => {
  it.each([
    [{ testValue: 'place-order', role: 'button', tagName: 'button' }, 'placeOrderButton'],
    [{ testValue: 'login-button', role: 'button', tagName: 'button' }, 'loginButton'],
    [{ testValue: 'save-btn', role: 'button', tagName: 'button' }, 'saveBtn'],
    [{ id: 'email', role: 'textbox', tagName: 'input' }, 'emailInput'],
    [{ id: 'userName', role: 'textbox', tagName: 'input' }, 'userNameInput'],
    [{ name: 'Over ons', role: 'link', tagName: 'a' }, 'overOnsLink'],
    [{ name: 'Één keer bestellen', role: 'button', tagName: 'button' }, 'eenKeerBestellenButton'],
    [{ name: 'Dit is een hele lange knoptekst', role: 'button', tagName: 'button' }, 'ditIsEenHeleButton'],
    [{ testValue: '2fa-code', role: 'textbox', tagName: 'input' }, 'field2faCodeInput'],
    [{ tagName: 'span', role: null }, 'span'],
    [{ name: '!!!', tagName: 'div' }, 'div'],
  ])('%j -> %s', (hints, expected) => {
    expect(suggestFieldName(hints)).toBe(expected);
  });

  it('levert altijd een geldige naam op', () => {
    expect(fieldNameError(suggestFieldName({ name: '???', tagName: '' }))).toBeNull();
  });
});

describe('suggestClassName', () => {
  it.each([
    ['Inloggen', 'InloggenPage'],
    ['Mijn account – Webshop', 'MijnAccountWebshopPage'],
    ['Checkout page', 'CheckoutPage'],
    ['', 'Page'],
    ['123 bestellen', 'Page123BestellenPage'],
  ])('%j -> %s', (title, expected) => {
    expect(suggestClassName(title)).toBe(expected);
    expect(classNameError(suggestClassName(title))).toBeNull();
  });
});

describe('uniqueNames', () => {
  it('nummert dubbele namen', () => {
    expect(uniqueNames(['saveButton', 'saveButton', 'link', 'saveButton'])).toEqual([
      'saveButton',
      'saveButton2',
      'link',
      'saveButton3',
    ]);
  });
});

describe('fieldNameError', () => {
  it.each(['emailInput', '_private', '$el', 'field2'])('accepteert %s', (name) => {
    expect(fieldNameError(name)).toBeNull();
  });

  it.each([
    ['', /Vul een naam in/],
    ['2fa', /niet beginnen met een cijfer/],
    ['e-mail', /Alleen letters/],
    ['mijn veld', /Alleen letters/],
    ['class', /gereserveerd/],
    ['page', /bestaat al/],
    ['constructor', /bestaat al/],
  ])('weigert %j', (name, message) => {
    expect(fieldNameError(name)).toMatch(message);
  });
});
