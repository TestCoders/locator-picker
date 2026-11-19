import { describe, expect, it } from 'vitest';
import { describeElement } from '@/content/picked-element';

describe('describeElement', () => {
  it('geeft tag, locator en ingekorte tekst', () => {
    document.body.innerHTML = `<button id="b">  Nu   ${'x'.repeat(100)} </button>`;
    const result = describeElement(document.getElementById('b')!, () => '#b');

    expect(result.tagName).toBe('button');
    expect(result.locator).toBe('#b');
    expect(result.matchCount).toBe(1);
    expect(result.text.startsWith('Nu xxx')).toBe(true);
    expect(result.text).toHaveLength(80);
    expect(result.text.endsWith('…')).toBe(true);
  });

  it('telt hoeveel elementen de locator vindt', () => {
    document.body.innerHTML = '<p class="x">a</p><p class="x">b</p>';
    const result = describeElement(document.querySelector('p')!, () => 'p.x');
    expect(result.matchCount).toBe(2);
  });
});
