// Genereert een leesbare, stabiele CSS-selector voor één element (issue #8).
//
// Volgorde van voorkeur:
//   1. testattribuut (data-testid, ...) dat uniek is in het document
//   2. id dat uniek is
//   3. één stap op het element zelf die uniek is (tag + attribuut of class)
//   4. een pad omhoog tot een uniek anker, met :nth-of-type alleen waar
//      broers en zussen niet anders te onderscheiden zijn
//
// Pure functie: alleen DOM-API's, geen extensie-API's.

export interface CssSelectorOptions {
  /** Testattributen in volgorde van voorkeur. */
  testAttributes?: readonly string[];
}

export const DEFAULT_TEST_ATTRIBUTES: readonly string[] = [
  'data-testid',
  'data-test-id',
  'data-test',
  'data-cy',
  'data-qa',
];

// Attributen die meestal betekenis hebben en niet per render veranderen.
const STABLE_ATTRIBUTES = ['name', 'role', 'aria-label', 'placeholder', 'title', 'alt', 'for', 'type'];

type QueryRoot = Document | DocumentFragment;

export function cssSelector(el: Element, options: CssSelectorOptions = {}): string {
  const testAttributes = options.testAttributes ?? DEFAULT_TEST_ATTRIBUTES;
  const root = queryRootOf(el);

  // 1 en 2: een uniek anker op het element zelf.
  const anchor = uniqueAnchor(el, root, testAttributes);
  if (anchor) return anchor;

  // 3: een enkele stap die het element al uniek maakt. Een kale tag telt
  // niet: `button` is uniek tot de pagina een tweede knop krijgt.
  const tag = escapeIdentifier(el.localName);
  for (const candidate of stepCandidates(el, testAttributes)) {
    if (candidate === tag && !DOCUMENT_TAGS.has(el.localName)) continue;
    if (matchesOnly(root, candidate, el)) return candidate;
  }

  // 4: pad omhoog. Elke stap onderscheidt het element van zijn siblings.
  // Een uniek anker op een voorouder heeft voorrang; zonder anker nemen we
  // het kortste pad dat uniek is.
  const path = [siblingStep(el, testAttributes)];
  let fallback: string | null = null;
  for (let node = el.parentElement; node; node = node.parentElement) {
    const ancestorAnchor = uniqueAnchor(node, root, testAttributes);
    if (ancestorAnchor) {
      // Kortste staart van het pad eerst: `#form button`, dan `#form li > button`, ...
      for (let k = 1; k <= path.length; k++) {
        const selector = `${ancestorAnchor} ${path.slice(-k).join(' > ')}`;
        if (matchesOnly(root, selector, el)) return selector;
      }
    }

    path.unshift(siblingStep(node, testAttributes));
    const selector = path.join(' > ');
    if (!fallback && matchesOnly(root, selector, el)) fallback = selector;
  }

  // Een pad vanaf de wortel is altijd uniek; dit is een vangnet.
  return fallback ?? path.join(' > ');
}

// Tags die per document maar één keer voorkomen.
const DOCUMENT_TAGS = new Set(['html', 'head', 'body']);

/** Testattribuut of id waarmee het element in z'n eentje uniek is. */
function uniqueAnchor(el: Element, root: QueryRoot, testAttributes: readonly string[]): string | null {
  for (const attr of testAttributes) {
    const value = el.getAttribute(attr);
    if (!value) continue;
    const selector = attributeSelector(attr, value);
    if (matchesOnly(root, selector, el)) return selector;
  }
  if (el.id) {
    const selector = `#${escapeIdentifier(el.id)}`;
    if (matchesOnly(root, selector, el)) return selector;
  }
  return null;
}

/** Selectors voor één stap, van meest naar minst stabiel. */
function stepCandidates(el: Element, testAttributes: readonly string[]): string[] {
  const tag = escapeIdentifier(el.localName);
  const candidates: string[] = [];

  for (const attr of testAttributes) {
    const value = el.getAttribute(attr);
    if (value) candidates.push(attributeSelector(attr, value));
  }
  if (el.id) candidates.push(`${tag}#${escapeIdentifier(el.id)}`);
  for (const attr of STABLE_ATTRIBUTES) {
    const value = el.getAttribute(attr);
    if (value) candidates.push(`${tag}${attributeSelector(attr, value)}`);
  }

  const classes = stableClasses(el);
  for (const cls of classes) candidates.push(`${tag}.${escapeIdentifier(cls)}`);
  const [first, second] = classes;
  if (first && second) {
    candidates.push(`${tag}.${escapeIdentifier(first)}.${escapeIdentifier(second)}`);
  }

  candidates.push(tag);
  return candidates;
}

/** Kortste stap die het element onderscheidt van zijn siblings. */
function siblingStep(el: Element, testAttributes: readonly string[]): string {
  // parentNode, niet parentElement: direct onder een shadow root is er geen
  // parent-element, maar wel siblings.
  const parent = el.parentNode as ParentNode | null;
  const siblings = parent ? Array.from(parent.children) : [el];
  const candidates = stepCandidates(el, testAttributes);

  for (const candidate of candidates) {
    if (siblings.filter((s) => s.matches(candidate)).length === 1) return candidate;
  }

  // Niets onderscheidt het element: positie onder siblings met dezelfde tag.
  const tag = escapeIdentifier(el.localName);
  const sameTag = siblings.filter((s) => s.localName === el.localName);
  return `${tag}:nth-of-type(${sameTag.indexOf(el) + 1})`;
}

/** Classes die waarschijnlijk niet per build of per interactie veranderen. */
function stableClasses(el: Element): string[] {
  return Array.from(el.classList).filter((cls) => !isUnstableClass(cls));
}

const STATE_CLASSES = new Set([
  'active', 'focus', 'focused', 'hover', 'selected', 'disabled',
  'open', 'opened', 'closed', 'visible', 'hidden', 'show', 'in',
]);

function isUnstableClass(cls: string): boolean {
  if (STATE_CLASSES.has(cls) || /^(is|has)-/.test(cls)) return true;
  // Gegenereerde namen: CSS-modules (Button_root__x7Yz2), styled-components
  // (sc-abc123, css-1q2w3e) of lange cijferreeksen.
  if (/__[A-Za-z0-9_-]{5,}$/.test(cls)) return true;
  if (/^(sc|css|jsx|emotion)-[A-Za-z0-9]+$/.test(cls)) return true;
  if (/\d{3,}/.test(cls)) return true;
  return false;
}

function matchesOnly(root: QueryRoot, selector: string, el: Element): boolean {
  const matches = root.querySelectorAll(selector);
  return matches.length === 1 && matches[0] === el;
}

function queryRootOf(el: Element): QueryRoot {
  // Document of shadow root; een los (niet gekoppeld) element valt terug op
  // het document zelf.
  const root = el.getRootNode();
  if (root.nodeType === Node.DOCUMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return root as QueryRoot;
  }
  return el.ownerDocument;
}

export function attributeSelector(attr: string, value: string): string {
  return `[${escapeIdentifier(attr)}=${escapeString(value)}]`;
}

/**
 * Escapet een CSS-identifier volgens CSSOM `CSS.escape()`. Eigen implementatie
 * zodat de engine ook zonder `CSS`-global (bijvoorbeeld in tests) werkt.
 */
export function escapeIdentifier(value: string): string {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value.charAt(i);
    const code = value.charCodeAt(i);

    if (code === 0) {
      result += '�';
    } else if (
      (code >= 0x01 && code <= 0x1f) ||
      code === 0x7f ||
      (i === 0 && code >= 0x30 && code <= 0x39) ||
      (i === 1 && code >= 0x30 && code <= 0x39 && value.charCodeAt(0) === 0x2d)
    ) {
      result += `\\${code.toString(16)} `;
    } else if (i === 0 && value.length === 1 && code === 0x2d) {
      result += `\\${ch}`;
    } else if (code >= 0x80 || ch === '-' || ch === '_' || /[0-9A-Za-z]/.test(ch)) {
      result += ch;
    } else {
      result += `\\${ch}`;
    }
  }
  return result;
}

/** Zet een waarde tussen dubbele aanhalingstekens als CSS-string. */
export function escapeString(value: string): string {
  let result = '"';
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (code === 0) result += '�';
    else if ((code >= 0x01 && code <= 0x1f) || code === 0x7f) result += `\\${code.toString(16)} `;
    else if (ch === '"' || ch === '\\') result += `\\${ch}`;
    else result += ch;
  }
  return `${result}"`;
}
