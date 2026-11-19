import { describe, expect, it } from 'vitest';
import { generatedClassesOf, isGeneratedClass, isStateClass, isUnstableClass } from '@/engine/class-heuristic';

// De voorbeelden hier staan ook in docs/gegenereerde-classes.md.
const GENERATED = [
  // 1. framework-prefix + hash
  'css-1q2w3e',
  'sc-bdVaJa',
  'jsx-123456',
  'emotion-0',
  'jss12',
  'svelte-1a2b3c',
  // 2. CSS-modules
  'Button_root__x7Yz2',
  'button_primary__3xKj9',
  'Button_root_x7Yz2_1',
  // 3. lange cijferreeks
  'col-1234',
  'item-20240101',
  // 4. kale hash
  'a1b2c3',
  'x7Yz2',
];

const STABLE = [
  'btn-primary',
  'col-md-6',
  'fa-2x',
  'grid12',
  'MuiButton-root',
  'navbar',
  'radius',
  'large-6',
  'ng-star-inserted',
  'css-grid',
  'tw-container',
  'sc-title',
  'h1',
  'mb-24',
];

describe('isGeneratedClass', () => {
  it.each(GENERATED)('%s is gegenereerd', (cls) => expect(isGeneratedClass(cls)).toBe(true));
  it.each(STABLE)('%s is bruikbaar', (cls) => expect(isGeneratedClass(cls)).toBe(false));
});

describe('state-classes', () => {
  it.each(['active', 'is-open', 'has-error', 'hidden'])('%s is een state-class', (cls) =>
    expect(isStateClass(cls)).toBe(true),
  );
  it('btn is geen state-class', () => expect(isStateClass('btn')).toBe(false));
});

describe('isUnstableClass', () => {
  it('vermijdt gegenereerde en state-classes', () => {
    expect(isUnstableClass('css-1q2w3e')).toBe(true);
    expect(isUnstableClass('active')).toBe(true);
    expect(isUnstableClass('btn-primary')).toBe(false);
  });

  it('laat met detectGenerated uit gegenereerde classes toe, maar vermijdt state-classes nog', () => {
    expect(isUnstableClass('css-1q2w3e', { detectGenerated: false })).toBe(false);
    expect(isUnstableClass('grid12', { detectGenerated: false })).toBe(false);
    expect(isUnstableClass('active', { detectGenerated: false })).toBe(true);
  });
});

describe('generatedClassesOf', () => {
  it('geeft alleen de gegenereerde classes van het element', () => {
    const el = document.createElement('div');
    el.className = 'btn css-1q2w3e primary x7Yz2';
    expect(generatedClassesOf(el)).toEqual(['css-1q2w3e', 'x7Yz2']);
  });
});
