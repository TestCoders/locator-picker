// Verzamelt alles wat het resultaatpaneel toont voor één gekozen element.

import { cssSelector } from '@/engine/css';
import { missingHookWarning, type HookWarning } from '@/engine/hook-warning';
import { buildLocator, type LocatorStrategy } from '@/engine/locator-engine';
import { playwrightSnippet } from '@/engine/snippets/playwright';
import { countMatches, queryRootOf } from '@/engine/validate';
import { xpathSelector } from '@/engine/xpath';

export type ResultFormat = 'css' | 'xpath' | 'playwright';

export type ResultEntry = {
  format: ResultFormat;
  label: string;
  value: string;
  /** Aantal elementen dat deze locator in de pagina vindt; 1 betekent uniek. */
  matches: number;
};

/** Stabiliteitsindicator; de beslistabel komt uit #13, de weergave uit #14. */
export type Stability = {
  level: 'green' | 'orange' | 'red';
  explanation: string;
};

export type PanelResult = {
  tagName: string;
  text: string;
  strategy: LocatorStrategy;
  entries: ResultEntry[];
  stability?: Stability;
  /** Gezet als het element geen testattribuut, id of toegankelijke naam heeft. */
  warning?: HookWarning;
  /** Rekentijd voor alle locators (ms). */
  durationMs: number;
};

const MAX_TEXT = 60;

export function buildResult(element: Element, now: () => number = () => performance.now()): PanelResult {
  const start = now();
  const root = queryRootOf(element);

  const css = cssSelector(element);
  const xpath = xpathSelector(element);
  const best = buildLocator(element);

  const entries: ResultEntry[] = [
    { format: 'css', label: 'CSS', value: css, matches: countMatches({ kind: 'css', value: css }, root) },
    { format: 'xpath', label: 'XPath', value: xpath, matches: countMatches({ kind: 'xpath', value: xpath }, root) },
    { format: 'playwright', label: 'Playwright', value: playwrightSnippet(best), matches: best.matches },
  ];

  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  return {
    tagName: element.tagName.toLowerCase(),
    text: text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text,
    strategy: best.strategy,
    entries,
    warning: missingHookWarning(element) ?? undefined,
    durationMs: now() - start,
  };
}
