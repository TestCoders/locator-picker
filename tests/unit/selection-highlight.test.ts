import { afterEach, describe, expect, it } from 'vitest';
import { SelectionHighlight } from '@/content/selection-highlight';

const hosts = () => document.querySelectorAll('locator-picker-selection');

afterEach(() => {
  document.body.innerHTML = '';
});

describe('SelectionHighlight', () => {
  it('toont één highlight voor het gekozen element', () => {
    document.body.innerHTML = '<p id="a">A</p>';
    const highlight = new SelectionHighlight();

    highlight.show(document.getElementById('a')!);

    expect(hosts()).toHaveLength(1);
    expect(highlight.selected?.id).toBe('a');
    highlight.clear();
  });

  it('vervangt de vorige highlight bij een nieuwe keuze', () => {
    document.body.innerHTML = '<p id="a">A</p><p id="b">B</p>';
    const highlight = new SelectionHighlight();

    highlight.show(document.getElementById('a')!);
    highlight.show(document.getElementById('b')!);

    expect(hosts()).toHaveLength(1);
    expect(highlight.selected?.id).toBe('b');
    highlight.clear();
  });

  it('laat na clear() niets achter', () => {
    document.body.innerHTML = '<p id="a">A</p>';
    const before = document.documentElement.outerHTML;
    const highlight = new SelectionHighlight();

    highlight.show(document.getElementById('a')!);
    highlight.clear();

    expect(document.documentElement.outerHTML).toBe(before);
    expect(highlight.selected).toBeNull();
  });
});
