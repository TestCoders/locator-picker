// @vitest-environment jsdom
// jsdom voor document.evaluate (XPath).
import { beforeEach, describe, expect, it } from 'vitest';
import { buildResult } from '@/content/result-data';
import { testAttributeOrder } from '@/engine/dom';
import { buildLocator } from '@/engine/locator-engine';

beforeEach(() => {
  document.body.innerHTML = '<button data-testid="save" data-cy="opslaan" data-qa="btn-save">Opslaan</button>';
});

const button = () => document.querySelector('button')!;

describe('testAttributeOrder', () => {
  it('zet het gekozen attribuut vooraan en behoudt de rest', () => {
    expect(testAttributeOrder('data-cy')).toEqual(['data-cy', 'data-testid', 'data-test-id', 'data-test', 'data-qa']);
    expect(testAttributeOrder('data-testid')[0]).toBe('data-testid');
  });
});

describe('gekozen testattribuut in de engine', () => {
  it.each([
    ['data-testid', '[data-testid="save"]'],
    ['data-cy', '[data-cy="opslaan"]'],
    ['data-qa', '[data-qa="btn-save"]'],
  ])('%s gaat voor', (attribute, expected) => {
    const testAttributes = testAttributeOrder(attribute);

    expect(buildLocator(button(), { testAttributes }).locator).toBe(expected);
    const css = buildResult(button(), { testAttributes }).entries.find((e) => e.format === 'css');
    expect(css?.value).toBe(expected);
  });

  it('XPath gebruikt ook het gekozen attribuut', () => {
    const result = buildResult(button(), { testAttributes: testAttributeOrder('data-qa') });
    expect(result.entries.find((e) => e.format === 'xpath')?.value).toBe('//button[@data-qa="btn-save"]');
  });

  it('valt terug op een ander testattribuut als het gekozen attribuut ontbreekt', () => {
    document.body.innerHTML = '<button data-testid="save">Opslaan</button>';
    expect(buildLocator(button(), { testAttributes: testAttributeOrder('data-cy') }).locator).toBe(
      '[data-testid="save"]',
    );
  });
});
