// Verzamelt alles wat het resultaatpaneel toont voor één gekozen element.

import { contextOf, describeContext, isInShadowRoot, type ContextStep } from '@/engine/context';
import { cssSelector } from '@/engine/css';
import { missingHookWarning, type HookWarning } from '@/engine/hook-warning';
import { buildLocator, type LocatorStrategy } from '@/engine/locator-engine';
import { scopedPlaywrightSnippet } from '@/engine/snippets/playwright';
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
  /** Rekentijd voor alle locators (ms). */
  durationMs: number;
  /**
   * Iframes en shadow roots rond het element, van buiten naar binnen (#23).
   * CSS en XPath gelden binnen de binnenste stap; de Playwright-snippet bevat
   * de hele keten.
   */
  context?: ContextStep[];
  /** Leesbare omschrijving van `context`, bijv. `iframe #checkout › shadow root van my-card`. */
  contextLabel?: string;
  /** True als het element in een shadow root zit; er is dan geen XPath. */
  inShadowRoot?: boolean;
};

const MAX_TEXT = 60;

export type BuildResultOptions = {
  /** Testattributen in volgorde van voorkeur; het gekozen attribuut (optiespagina) staat vooraan. */
  testAttributes?: readonly string[];
  now?: () => number;
};

export function buildResult(element: Element, options: BuildResultOptions = {}): PanelResult {
  const { testAttributes } = options;
  const now = options.now ?? (() => performance.now());
  const start = now();
  const root = queryRootOf(element);

  const css = cssSelector(element, { testAttributes });
  // XPath werkt niet binnen een shadow root: browsers evalueren het daar niet,
  // en Playwright en Selenium gaan er met XPath niet doorheen (#23).
  const inShadowRoot = isInShadowRoot(element);
  const xpath = inShadowRoot ? null : xpathSelector(element, { testAttributes });
  const best = buildLocator(element, { testAttributes });

  const context = contextOf(element, { testAttributes });
  const playwright = scopedPlaywrightSnippet(context, best, { css });
  // In een shadow root gebruikt de snippet CSS in plaats van XPath; tel dan die.
  const cssMatches = countMatches({ kind: 'css', value: css }, root);
  const playwrightMatches = inShadowRoot && best.strategy === 'xpath' ? cssMatches : best.matches;

  const entries: ResultEntry[] = [
    { format: 'css', label: 'CSS', value: css, matches: cssMatches },
    ...(xpath === null
      ? []
      : [{ format: 'xpath' as const, label: 'XPath', value: xpath, matches: countMatches({ kind: 'xpath', value: xpath }, root) }]),
    { format: 'playwright', label: 'Playwright', value: playwright, matches: playwrightMatches },
  ];

  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  return {
    tagName: element.tagName.toLowerCase(),
    text: text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text,
    strategy: best.strategy,
    entries,
    stability: assessStability(best),
    warning: missingHookWarning(element) ?? undefined,
    durationMs: now() - start,
    ...(context.length > 0 && { context, contextLabel: describeContext(context) }),
    ...(inShadowRoot && { inShadowRoot }),
  };
}
