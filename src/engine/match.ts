// Telt hoeveel elementen een locator in een document oplevert.
// Ondersteunt alleen de formaten die locator-engine zelf maakt.

import { getAccessibleName, getRole } from './accessibility';

// Waarde van XPathResult.ORDERED_NODE_SNAPSHOT_TYPE; de global ontbreekt in happy-dom.
const ORDERED_NODE_SNAPSHOT_TYPE = 7;

export type MatchableLocator =
  | { kind: 'css'; selector: string }
  | { kind: 'role'; role: string; name: string }
  | { kind: 'xpath'; expression: string };

export function countMatches(doc: Document, locator: MatchableLocator): number {
  switch (locator.kind) {
    case 'css':
      return doc.querySelectorAll(locator.selector).length;
    case 'role':
      return Array.from(doc.querySelectorAll('*')).filter(
        (el) => getRole(el) === locator.role && getAccessibleName(el) === locator.name,
      ).length;
    case 'xpath': {
      const result = doc.evaluate(locator.expression, doc, null, ORDERED_NODE_SNAPSHOT_TYPE, null);
      return result.snapshotLength;
    }
  }
}
