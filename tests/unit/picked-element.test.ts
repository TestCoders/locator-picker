import { describe, expect, it } from 'vitest';
import { describeElement } from '@/content/picked-element';

describe('describeElement', () => {
  it('geeft tag, locator en ingekorte tekst', () => {
    document.body.innerHTML = `<button id="b">  Nu   ${'x'.repeat(100)} </button>`;
    const result = describeElement(document.getElementById('b')!, () => '#b');

    expect(result.tagName).toBe('button');
    expect(result.locator).toBe('#b');
    expect(result.text.startsWith('Nu xxx')).toBe(true);
    expect(result.text).toHaveLength(80);
    expect(result.text.endsWith('…')).toBe(true);
  });
});
