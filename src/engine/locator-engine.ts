// Kiest voor een element de meest stabiele locator die precies één element oplevert.
// Volgorde: testattribuut, id, rol + toegankelijke naam, structurele XPath.

import { getAccessibleName, getRole } from './accessibility';
import { queryRootOf } from './dom';
import { countMatches, type MatchableLocator } from './match';

export type LocatorStrategy = 'test-attribute' | 'id' | 'role-name' | 'xpath';

export type LocatorResult = {
  /** CSS-selector, Playwright-rolselector (`role=button[name="..."]`) of XPath. */
  locator: string;
  /** Aantal elementen dat de locator in het document oplevert. */
  matches: number;
} & LocatorDetails;

/** De onderdelen van de locator, zodat snippet-generators geen string hoeven te parsen. */
export type LocatorDetails =
  | { strategy: 'test-attribute'; attribute: string; value: string }
  | { strategy: 'id'; id: string }
  | { strategy: 'role-name'; role: string; name: string }
  | { strategy: 'xpath' };

export type LocatorOptions = {
  /** Attributen die als testhook gelden, in volgorde van voorkeur. */
  testAttributes?: readonly string[];
};

export const DEFAULT_TEST_ATTRIBUTES = ['data-testid'];

function quote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function xpathLiteral(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"')) return `"${value}"`;
  return `concat(${value.split("'").map((part) => `'${part}'`).join(`, "'", `)})`;
}

const SIMPLE_IDENT = /^[A-Za-z_][\w-]*$/;

function idSelector(id: string): string {
  return SIMPLE_IDENT.test(id) ? `#${id}` : `[id=${quote(id)}]`;
}

type Candidate = LocatorDetails & { locator: string; matchable: MatchableLocator };

function* candidates(el: Element, options: LocatorOptions): Generator<Candidate> {
  for (const attr of options.testAttributes ?? DEFAULT_TEST_ATTRIBUTES) {
    const value = el.getAttribute(attr);
    if (value) {
      const selector = `[${attr}=${quote(value)}]`;
      yield {
        strategy: 'test-attribute',
        attribute: attr,
        value,
        locator: selector,
        matchable: { kind: 'css', selector },
      };
    }
  }

  const id = el.getAttribute('id');
  if (id) {
    const selector = idSelector(id);
    yield { strategy: 'id', id, locator: selector, matchable: { kind: 'css', selector } };
  }

  const role = getRole(el);
  const name = getAccessibleName(el);
  if (role && name) {
    yield {
      strategy: 'role-name',
      role,
      name,
      locator: `role=${role}[name=${quote(name)}]`,
      matchable: { kind: 'role', role, name },
    };
  }
}

/**
 * Absolute pad vanaf de root; een index alleen als er meerdere zusters met
 * dezelfde tag zijn. In een shadow root (#23) relatief vanaf die root:
 * `./div/span`, want `/` is daar het document.
 */
export function structuralXPath(el: Element): string {
  const parts: string[] = [];
  for (let node: Element | null = el; node; node = node.parentElement) {
    const tag = node.tagName.toLowerCase();
    // parentNode, niet parentElement: direct onder een shadow root zijn er ook zusters.
    const siblings = Array.from((node.parentNode as ParentNode | null)?.children ?? []);
    const sameTag = siblings.filter((s) => s.tagName === node!.tagName);
    parts.unshift(sameTag.length > 1 ? `${tag}[${sameTag.indexOf(node) + 1}]` : tag);
  }
  const inShadowRoot = el.getRootNode().nodeType === Node.DOCUMENT_FRAGMENT_NODE;
  return `${inShadowRoot ? './' : '/'}${parts.join('/')}`;
}

export function buildLocator(el: Element, options: LocatorOptions = {}): LocatorResult {
  // Het document, of de shadow root waar het element in zit (#23).
  const doc = queryRootOf(el);

  for (const candidate of candidates(el, options)) {
    const matches = countMatches(doc, candidate.matchable);
    if (matches === 1) {
      const { matchable: _, ...result } = candidate;
      return { ...result, matches };
    }
  }

  // Terugval: structureel pad, uniek omdat het elke positie vastlegt.
  const locator = structuralXPath(el);
  // Browsers evalueren geen XPath met een shadow root als context; het pad
  // komt van het element zelf en is dus per constructie uniek.
  const matches =
    doc.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? 1 : countMatches(doc, { kind: 'xpath', expression: locator });
  return { strategy: 'xpath', locator, matches };
}
