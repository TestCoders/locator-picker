import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { PanelResult } from '@/content/result-data';
import {
  MAX_HISTORY_PER_DOMAIN,
  addEntry,
  clearDomain,
  clearHistory,
  domainOf,
  entryFromResult,
  getHistory,
  recordPick,
  watchHistory,
  type History,
  type HistoryEntry,
} from '@/shared/history';

function entry(n: number, overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    css: `#el${n}`,
    xpath: `//*[@id="el${n}"]`,
    playwright: `page.locator('#el${n}')`,
    tagName: 'div',
    text: `Element ${n}`,
    pickedAt: n,
    ...overrides,
  };
}

beforeEach(() => fakeBrowser.reset());

describe('addEntry', () => {
  it('zet het nieuwste item vooraan', () => {
    expect(addEntry([entry(1)], entry(2)).map((e) => e.css)).toEqual(['#el2', '#el1']);
  });

  it('verplaatst een bestaand element naar voren in plaats van het te dubbelen', () => {
    const result = addEntry([entry(2), entry(1)], entry(1, { pickedAt: 99 }));
    expect(result.map((e) => e.css)).toEqual(['#el1', '#el2']);
    expect(result[0]?.pickedAt).toBe(99);
  });

  it('houdt hooguit het maximum aan en laat het oudste vallen', () => {
    let entries: HistoryEntry[] = [];
    for (let i = 1; i <= 5; i++) entries = addEntry(entries, entry(i), 3);
    expect(entries.map((e) => e.css)).toEqual(['#el5', '#el4', '#el3']);
  });

  it('heeft een maximum van 50 items per domein', () => {
    expect(MAX_HISTORY_PER_DOMAIN).toBe(50);
    let entries: HistoryEntry[] = [];
    for (let i = 1; i <= 60; i++) entries = addEntry(entries, entry(i));
    expect(entries).toHaveLength(50);
    expect(entries[0]?.css).toBe('#el60');
  });
});

describe('entryFromResult', () => {
  it('neemt CSS, XPath en snippet over', () => {
    const result: PanelResult = {
      tagName: 'button',
      text: 'Opslaan',
      strategy: 'id',
      entries: [
        { format: 'css', label: 'CSS', value: '#save', matches: 1 },
        { format: 'xpath', label: 'XPath', value: '//button[@id="save"]', matches: 1 },
        { format: 'playwright', label: 'Playwright', value: "page.locator('#save')", matches: 1 },
      ],
      durationMs: 1,
    };
    expect(entryFromResult(result, 42)).toEqual({
      css: '#save',
      xpath: '//button[@id="save"]',
      playwright: "page.locator('#save')",
      tagName: 'button',
      text: 'Opslaan',
      pickedAt: 42,
    });
  });
});

describe('opslag per domein', () => {
  it('bewaart locators per domein, gescheiden', async () => {
    await recordPick('a.nl', entry(1));
    await recordPick('b.nl', entry(2));
    await recordPick('a.nl', entry(3));

    const history = await getHistory();
    expect(history['a.nl']?.map((e) => e.css)).toEqual(['#el3', '#el1']);
    expect(history['b.nl']?.map((e) => e.css)).toEqual(['#el2']);
  });

  it('is leeg als er niets bewaard is', async () => {
    expect(await getHistory()).toEqual({});
  });

  it('bewaart niets zonder domein', async () => {
    await recordPick('', entry(1));
    expect(await getHistory()).toEqual({});
  });

  it('past het maximum per domein toe', async () => {
    for (let i = 1; i <= MAX_HISTORY_PER_DOMAIN + 5; i++) await recordPick('a.nl', entry(i));
    const items = (await getHistory())['a.nl']!;
    expect(items).toHaveLength(MAX_HISTORY_PER_DOMAIN);
    expect(items[0]?.css).toBe(`#el${MAX_HISTORY_PER_DOMAIN + 5}`);
  });

  it('wist één domein en laat de rest staan', async () => {
    await recordPick('a.nl', entry(1));
    await recordPick('b.nl', entry(2));
    await clearDomain('a.nl');
    expect(Object.keys(await getHistory())).toEqual(['b.nl']);
  });

  it('wist alles', async () => {
    await recordPick('a.nl', entry(1));
    await clearHistory();
    expect(await getHistory()).toEqual({});
  });

  it('bewaart in storage.local en niet in storage.sync', async () => {
    await recordPick('a.nl', entry(1));
    expect(Object.keys(await fakeBrowser.storage.local.get(null))).toContain('history');
    expect(Object.keys(await fakeBrowser.storage.sync.get(null))).not.toContain('history');
  });

  it('herstelt van beschadigde opslag', async () => {
    await fakeBrowser.storage.local.set({ history: 'kapot' });
    expect(await getHistory()).toEqual({});
    await recordPick('a.nl', entry(1));
    expect(Object.keys(await getHistory())).toEqual(['a.nl']);
  });
});

describe('watchHistory', () => {
  it('geeft de huidige historie en daarna elke wijziging', async () => {
    await recordPick('a.nl', entry(1));
    const seen: History[] = [];
    const stop = watchHistory((h) => seen.push(h));
    await new Promise((r) => setTimeout(r, 0));
    await recordPick('a.nl', entry(2));
    await new Promise((r) => setTimeout(r, 0));
    stop();

    expect(seen[0]?.['a.nl']).toHaveLength(1);
    expect(seen.at(-1)?.['a.nl']).toHaveLength(2);
  });
});

describe('domainOf', () => {
  it('geeft de hostnaam', () => {
    expect(domainOf({ hostname: 'example.com' })).toBe('example.com');
  });
});
