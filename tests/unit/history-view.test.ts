import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { initHistoryView } from '@/options/history-view';
import { getHistory, recordPick, type HistoryEntry } from '@/shared/history';

function entry(n: number): HistoryEntry {
  return {
    css: `#el${n}`,
    xpath: `//*[@id="el${n}"]`,
    playwright: `page.locator('#el${n}')`,
    tagName: 'div',
    text: `Element ${n}`,
    pickedAt: n,
  };
}

let container: HTMLElement;
let status: HTMLElement;
let stop: (() => void) | undefined;
let written: string[];

const settle = () => new Promise((r) => setTimeout(r, 0));
const buttons = (label: string) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('button')).filter((b) => b.textContent === label);

beforeEach(() => {
  fakeBrowser.reset();
  document.body.innerHTML = '<div id="history"></div><p id="status"></p>';
  container = document.getElementById('history')!;
  status = document.getElementById('status')!;
  written = [];
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(async (text: string) => void written.push(text)) },
  });
});

afterEach(() => {
  stop?.();
  stop = undefined;
});

describe('historie op de optiespagina', () => {
  it('meldt dat er nog niets is', async () => {
    stop = initHistoryView(container, status);
    await settle();
    expect(container.textContent).toContain('Nog geen locators gekozen');
  });

  it('toont de locators per domein', async () => {
    await recordPick('a.nl', entry(1));
    await recordPick('a.nl', entry(2));
    await recordPick('b.nl', entry(3));
    stop = initHistoryView(container, status);
    await settle();

    const domains = Array.from(container.querySelectorAll('section.domain h3')).map((h) => h.textContent);
    expect(domains).toEqual(['a.nl (2)', 'b.nl (1)']);
    const codes = Array.from(container.querySelectorAll('section[aria-label="a.nl"] code')).map((c) => c.textContent);
    expect(codes).toEqual(['#el2', '#el1']);
  });

  it('kopieert CSS, XPath en Playwright', async () => {
    await recordPick('a.nl', entry(1));
    stop = initHistoryView(container, status);
    await settle();

    buttons('CSS')[0]!.click();
    buttons('XPath')[0]!.click();
    buttons('Playwright')[0]!.click();
    await settle();

    expect(written).toEqual(['#el1', '//*[@id="el1"]', "page.locator('#el1')"]);
    expect(status.textContent).toBe('Playwright gekopieerd');
  });

  it('meldt als kopiëren mislukt', async () => {
    await recordPick('a.nl', entry(1));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('geweigerd')) },
    });
    document.execCommand = vi.fn(() => false);
    stop = initHistoryView(container, status);
    await settle();

    buttons('CSS')[0]!.click();
    await settle();
    expect(status.textContent).toBe('Kopiëren mislukt');
  });

  it('wist één domein', async () => {
    await recordPick('a.nl', entry(1));
    await recordPick('b.nl', entry(2));
    stop = initHistoryView(container, status);
    await settle();

    container.querySelector<HTMLButtonElement>('button[aria-label="Wis historie van a.nl"]')!.click();
    await settle();

    expect(Object.keys(await getHistory())).toEqual(['b.nl']);
    expect(container.querySelector('section[aria-label="a.nl"]')).toBeNull();
    expect(status.textContent).toBe('Historie van a.nl gewist');
  });

  it('wist alles', async () => {
    await recordPick('a.nl', entry(1));
    stop = initHistoryView(container, status);
    await settle();

    buttons('Alles wissen')[0]!.click();
    await settle();

    expect(await getHistory()).toEqual({});
    expect(container.textContent).toContain('Nog geen locators gekozen');
  });

  it('werkt bij als een andere tab een locator toevoegt', async () => {
    stop = initHistoryView(container, status);
    await settle();
    await recordPick('a.nl', entry(1));
    await settle();
    expect(container.querySelector('section[aria-label="a.nl"]')).not.toBeNull();
  });
});
