// Historie van gekozen locators per domein (issue #24).
//
// Bewaard in browser.storage.local: blijft in de browser en gaat niet mee naar
// andere apparaten, ook niet met synchronisatie aan. Per domein staat het
// nieuwste item vooraan, met een maximum zodat de opslag niet onbeperkt groeit.

import { storage } from 'wxt/utils/storage';
import type { PanelResult } from '@/content/result-data';

/** Maximum aantal items per domein; het oudste valt eruit. */
export const MAX_HISTORY_PER_DOMAIN = 50;

export type HistoryEntry = {
  css: string;
  xpath: string;
  playwright: string;
  tagName: string;
  text: string;
  /** Tijdstip van kiezen, ms sinds 1970. */
  pickedAt: number;
};

export type History = Record<string, HistoryEntry[]>;

const historyItem = storage.defineItem<History>('local:history', { fallback: {} });

/** Pure functie: nieuwste vooraan, zelfde CSS-locator telt als hetzelfde element, maximaal `max` items. */
export function addEntry(
  entries: readonly HistoryEntry[],
  entry: HistoryEntry,
  max: number = MAX_HISTORY_PER_DOMAIN,
): HistoryEntry[] {
  return [entry, ...entries.filter((e) => e.css !== entry.css)].slice(0, max);
}

export function entryFromResult(result: PanelResult, pickedAt: number = Date.now()): HistoryEntry {
  const value = (format: string) => result.entries.find((e) => e.format === format)?.value ?? '';
  return {
    css: value('css'),
    xpath: value('xpath'),
    playwright: value('playwright'),
    tagName: result.tagName,
    text: result.text,
    pickedAt,
  };
}

/** Domein van een pagina; leeg voor pagina's zonder hostnaam (zoals `file://`), die we niet bewaren. */
export function domainOf(location: Pick<Location, 'hostname'>): string {
  return location.hostname;
}

export async function getHistory(): Promise<History> {
  const value = await historyItem.getValue();
  return value && typeof value === 'object' ? value : {};
}

export async function recordPick(domain: string, entry: HistoryEntry): Promise<void> {
  if (!domain) return;
  const history = await getHistory();
  await historyItem.setValue({ ...history, [domain]: addEntry(history[domain] ?? [], entry) });
}

export async function clearDomain(domain: string): Promise<void> {
  const { [domain]: _removed, ...rest } = await getHistory();
  await historyItem.setValue(rest);
}

export async function clearHistory(): Promise<void> {
  await historyItem.setValue({});
}

/** Roept `callback` aan met de huidige historie en bij elke wijziging. Geeft een functie om te stoppen. */
export function watchHistory(callback: (history: History) => void): () => void {
  let stopped = false;
  let changed = false;
  void getHistory().then((history) => {
    if (!stopped && !changed) callback(history);
  });
  const unwatch = historyItem.watch((value) => {
    changed = true;
    callback(value && typeof value === 'object' ? value : {});
  });
  return () => {
    stopped = true;
    unwatch();
  };
}
