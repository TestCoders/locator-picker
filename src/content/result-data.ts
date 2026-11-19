// Verzamelt alles wat het resultaatpaneel toont voor één gekozen element.

import { generatedClassesOf } from '@/engine/class-heuristic';
import { cssSelector } from '@/engine/css';
import { missingHookWarning, type HookWarning } from '@/engine/hook-warning';
import { buildLocator, type LocatorStrategy } from '@/engine/locator-engine';
import { playwrightSnippet } from '@/engine/snippets/playwright';
import { assessStability } from '@/engine/stability';
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
  /** Gegenereerde classes van het element die de locators vermijden; leeg of afwezig als er geen zijn. */
  ignoredClasses?: string[];
  /** Rekentijd voor alle locators (ms). */
  durationMs: number;
};

const MAX_TEXT = 60;

export type BuildResultOptions = {
  /** Testattributen in volgorde van voorkeur; het gekozen attribuut (optiespagina) staat vooraan. */
  testAttributes?: readonly string[];
  /** Gegenereerde class-namen herkennen en vermijden (optiespagina, #26). Standaard aan. */
  detectGeneratedClasses?: boolean;
  now?: () => number;
};

export function buildResult(element: Element, options: BuildResultOptions = {}): PanelResult {
  const { testAttributes, detectGeneratedClasses } = options;
  const now = options.now ?? (() => performance.now());
  const start = now();
  const root = queryRootOf(element);

  const css = cssSelector(element, { testAttributes, detectGeneratedClasses });
  const xpath = xpathSelector(element, { testAttributes });
  const best = buildLocator(element, { testAttributes });

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
    stability: assessStability(best),
    warning: missingHookWarning(element) ?? undefined,
    ignoredClasses: detectGeneratedClasses === false ? undefined : generatedClassesOf(element),
    durationMs: now() - start,
  };
}
