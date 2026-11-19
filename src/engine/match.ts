// Telt hoeveel elementen een locator in een document oplevert.
// Ondersteunt alleen de formaten die locator-engine zelf maakt.

import { getAccessibleName, getRole } from './accessibility';

// Waarde van XPathResult.ORDERED_NODE_SNAPSHOT_TYPE; de global ontbreekt in happy-dom.
const ORDERED_NODE_SNAPSHOT_TYPE = 7;

export type MatchableLocator =
  | { kind: 'css'; selector: string }
  | { kind: 'role'; role: string; name: string }
  | { kind: 'xpath'; expression: string };

/**
 * Telt binnen `root`: een document, of een shadow root (#23). Een shadow root
 * zoekt alleen in die root, zoals Playwright een locator op de host scoped.
 */
export function countMatches(root: Document | DocumentFragment, locator: MatchableLocator): number {
  switch (locator.kind) {
    case 'css':
      return root.querySelectorAll(locator.selector).length;
    case 'role':
      return Array.from(root.querySelectorAll('*')).filter(
        (el) => getRole(el) === locator.role && getAccessibleName(el) === locator.name,
      ).length;
    case 'xpath': {
      const doc = root.nodeType === Node.DOCUMENT_NODE ? (root as Document) : root.ownerDocument!;
      const result = doc.evaluate(locator.expression, root, null, ORDERED_NODE_SNAPSHOT_TYPE, null);
      return result.snapshotLength;
    }
  }
}
