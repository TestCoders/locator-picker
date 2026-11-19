// Match-validatie in de pagina (issue #10).
//
// Telt hoeveel elementen een locator in de huidige pagina vindt. Alleen een
// locator die precies één element vindt, en dan ook het gekozen element, is
// bruikbaar. De strategie (#7) levert kandidaten op volgorde van voorkeur;
// chooseUniqueLocator neemt de eerste bruikbare.
//
// Pure functie: alleen DOM-API's, geen extensie-API's.

export type LocatorKind = 'css' | 'xpath';

export interface Locator {
  kind: LocatorKind;
  value: string;
}

/**
 * - `unique`: precies één match, en dat is het gekozen element
 * - `ambiguous`: meer dan één match, onbruikbaar
 * - `wrong-element`: precies één match, maar niet het gekozen element
 * - `none`: geen match, een fout
 * - `invalid`: de locator is syntactisch ongeldig, een fout
 */
export type MatchStatus = 'unique' | 'ambiguous' | 'wrong-element' | 'none' | 'invalid';

export interface MatchResult {
  locator: Locator;
  /** Aantal gevonden elementen; 0 bij een ongeldige locator. */
  count: number;
  status: MatchStatus;
  /** Foutmelding bij `none` en `invalid`. */
  error?: string;
}

export interface ChooseOptions {
  /** Stop met nieuwe kandidaten proberen na deze tijd (ms). Ruim binnen de 3 s 'klik tot clipboard'. */
  timeBudgetMs?: number;
  /** Klok, injecteerbaar voor tests. */
  now?: () => number;
}

export interface LocatorChoice {
  /** De eerste kandidaat met status `unique`, of null. */
  chosen: MatchResult | null;
  /** Resultaat per geprobeerde kandidaat, in volgorde. */
  results: MatchResult[];
  /** Gezet als er geen bruikbare locator is gevonden. */
  error?: string;
  /** True als het tijdsbudget op was voordat alle kandidaten geprobeerd zijn. */
  timedOut: boolean;
  durationMs: number;
}

export const DEFAULT_TIME_BUDGET_MS = 1000;

export type QueryRoot = Document | DocumentFragment;

/** Telt de matches van één locator en beoordeelt of hij het gekozen element uniek vindt. */
export function validateLocator(locator: Locator, target: Element, root: QueryRoot = queryRootOf(target)): MatchResult {
  let matches: Node[];
  try {
    matches = findAll(locator, root);
  } catch (error) {
    return {
      locator,
      count: 0,
      status: 'invalid',
      error: `Ongeldige ${locator.kind === 'css' ? 'CSS-selector' : 'XPath'}: ${messageOf(error)}`,
    };
  }

  const count = matches.length;
  if (count === 0) return { locator, count, status: 'none', error: 'Locator vindt geen element in de pagina' };
  if (count > 1) return { locator, count, status: 'ambiguous' };
  return { locator, count, status: matches[0] === target ? 'unique' : 'wrong-element' };
}

/** Telt hoeveel elementen een locator vindt; 0 bij een ongeldige locator. */
export function countMatches(locator: Locator, root: QueryRoot = document): number {
  try {
    return findAll(locator, root).length;
  } catch {
    return 0;
  }
}

/**
 * Probeert kandidaten op volgorde en kiest de eerste die precies het gekozen
 * element vindt. Kandidaten met meer dan één match worden overgeslagen.
 */
export function chooseUniqueLocator(
  candidates: readonly Locator[],
  target: Element,
  options: ChooseOptions = {},
): LocatorChoice {
  const now = options.now ?? (() => performance.now());
  const budget = options.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS;
  const root = queryRootOf(target);
  const start = now();
  const results: MatchResult[] = [];
  let timedOut = false;

  for (const candidate of candidates) {
    if (results.length > 0 && now() - start >= budget) {
      timedOut = true;
      break;
    }
    const result = validateLocator(candidate, target, root);
    results.push(result);
    if (result.status === 'unique') {
      return { chosen: result, results, timedOut, durationMs: now() - start };
    }
  }

  return {
    chosen: null,
    results,
    error: timedOut
      ? 'Geen unieke locator gevonden binnen de tijdslimiet'
      : 'Geen enkele kandidaat vindt het element uniek',
    timedOut,
    durationMs: now() - start,
  };
}

function findAll(locator: Locator, root: QueryRoot): Node[] {
  if (locator.kind === 'css') return Array.from(root.querySelectorAll(locator.value));

  // XPath gaat niet door shadow roots heen; binnen een shadow root (#23) is het
  // resultaat daarom meestal `none`.
  const doc = root.nodeType === Node.DOCUMENT_NODE ? (root as Document) : root.ownerDocument;
  if (!doc) return [];
  const snapshot = doc.evaluate(locator.value, root, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  const nodes: Node[] = [];
  for (let i = 0; i < snapshot.snapshotLength; i++) {
    const node = snapshot.snapshotItem(i);
    if (node) nodes.push(node);
  }
  return nodes;
}

/** Document of shadow root waarin het element zoekbaar is. */
export function queryRootOf(el: Element): QueryRoot {
  const root = el.getRootNode();
  if (root.nodeType === Node.DOCUMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return root as QueryRoot;
  }
  return el.ownerDocument;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
