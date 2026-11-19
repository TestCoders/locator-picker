// Gedeelde hulpmiddelen voor de locator-generators (CSS en XPath).

export const DEFAULT_TEST_ATTRIBUTES: readonly string[] = [
  'data-testid',
  'data-test-id',
  'data-test',
  'data-cy',
  'data-qa',
];

// Attributen die meestal betekenis hebben en niet per render veranderen.
export const STABLE_ATTRIBUTES: readonly string[] = [
  'name',
  'role',
  'aria-label',
  'placeholder',
  'title',
  'alt',
  'for',
  'type',
];

export type QueryRoot = Document | DocumentFragment;

/**
 * Document of shadow root waarin het element leeft. Een los (niet gekoppeld)
 * element valt terug op het document zelf.
 */
export function queryRootOf(el: Element): QueryRoot {
  const root = el.getRootNode();
  if (root.nodeType === Node.DOCUMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return root as QueryRoot;
  }
  return el.ownerDocument;
}

/**
 * Element-siblings inclusief het element zelf. Via parentNode, niet
 * parentElement: direct onder een shadow root is er geen parent-element.
 */
export function siblingsOf(el: Element): Element[] {
  const parent = el.parentNode as ParentNode | null;
  return parent ? Array.from(parent.children) : [el];
}
