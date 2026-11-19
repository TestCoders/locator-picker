import { describe, expect, it } from 'vitest';
import type { LocatorResult } from '@/engine/locator-engine';
import {
  assessStability,
  isUnstableId,
  stabilityFor,
  stabilityLevel,
  type StabilityBasis,
  type StabilityLevel,
} from '@/engine/stability';

// Elke rij van de beslistabel in docs/stabiliteit.md: [basis, 1 match, 0 matches, 2+ matches].
const TABLE: [StabilityBasis, StabilityLevel][] = [
  ['test-attribute', 'green'],
  ['stable-id', 'green'],
  ['unstable-id', 'orange'],
  ['role-name', 'green'],
  ['stable-attribute', 'orange'],
  ['stable-class', 'orange'],
  ['text', 'orange'],
  ['unstable-class', 'red'],
  ['position', 'red'],
  ['none', 'red'],
];

describe('beslistabel', () => {
  it.each(TABLE)('%s: 1 match is %s', (basis, level) => {
    expect(stabilityLevel(basis, 1)).toBe(level);
  });

  it.each(TABLE)('%s: 0 matches is rood', (basis) => {
    expect(stabilityLevel(basis, 0)).toBe('red');
  });

  it.each(TABLE)('%s: 2+ matches is rood', (basis) => {
    expect(stabilityLevel(basis, 2)).toBe('red');
    expect(stabilityLevel(basis, 50)).toBe('red');
  });

  it('dekt alle rijen uit het document', () => {
    expect(TABLE).toHaveLength(10);
  });
});

describe('stabilityFor', () => {
  it.each(['green', 'orange', 'red'] as const)('geeft bij %s label, icoon en één zin uitleg', (level) => {
    const basis = TABLE.find(([, l]) => l === level)![0];
    const result = stabilityFor(basis, 1);
    expect(result.level).toBe(level);
    expect(result.label).not.toBe('');
    expect(result.icon).not.toBe('');
    expect(result.explanation.match(/[.!?]/g)).toHaveLength(1);
    expect(result.explanation.endsWith('.')).toBe(true);
  });

  it('gebruikt per kleur een eigen label en icoon, zodat kleur niet het enige signaal is', () => {
    const all = (['green', 'orange', 'red'] as const).map((level) => {
      const basis = TABLE.find(([, l]) => l === level)![0];
      return stabilityFor(basis, 1);
    });
    expect(new Set(all.map((x) => x.label)).size).toBe(3);
    expect(new Set(all.map((x) => x.icon)).size).toBe(3);
  });

  it('toont rood voor een element zonder bruikbare attributen', () => {
    expect(stabilityFor('none', 1).level).toBe('red');
  });
});

describe('isUnstableId', () => {
  it.each(['input-48213', '12345', ':r1a:', 'a3f9c2e81b', '3f2504e0-4f89-11d3-9a0c-0305e82c3301'])(
    'ziet %s als onstabiel',
    (id) => expect(isUnstableId(id)).toBe(true),
  );

  it.each(['step2', 'h1-title', 'main', 'login-form', 'feedback', 'section-12'])('ziet %s als stabiel', (id) =>
    expect(isUnstableId(id)).toBe(false),
  );
});

describe('assessStability', () => {
  it('test-attribute is groen', () => {
    const result: LocatorResult = {
      strategy: 'test-attribute',
      attribute: 'data-testid',
      value: 'x',
      locator: '[data-testid="x"]',
      matches: 1,
    };
    expect(assessStability(result).level).toBe('green');
  });

  it('stabiel id is groen, gegenereerd id is oranje', () => {
    const base = { strategy: 'id', matches: 1 } as const;
    expect(assessStability({ ...base, id: 'main', locator: '#main' }).level).toBe('green');
    expect(assessStability({ ...base, id: 'input-48213', locator: '#input-48213' }).level).toBe('orange');
  });

  it('role-name is groen', () => {
    const result: LocatorResult = {
      strategy: 'role-name',
      role: 'button',
      name: 'Ok',
      locator: 'role=button[name="Ok"]',
      matches: 1,
    };
    expect(assessStability(result).level).toBe('green');
  });

  it('structureel xpath is rood, ook bij 1 match', () => {
    expect(assessStability({ strategy: 'xpath', locator: '/html/body/div/span[2]', matches: 1 }).level).toBe(
      'red',
    );
  });

  it('meer dan één match is rood, ook bij een testattribuut', () => {
    const result: LocatorResult = {
      strategy: 'test-attribute',
      attribute: 'data-testid',
      value: 'x',
      locator: '[data-testid="x"]',
      matches: 2,
    };
    expect(assessStability(result).level).toBe('red');
  });
});
