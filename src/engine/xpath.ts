// Genereert een leesbare XPath voor één element (issue #9).
//
// Volgorde van voorkeur:
//   1. één stap op het element zelf die uniek is: testattribuut, id, stabiel
//      attribuut of zichtbare tekst, bijv. //button[@data-testid="login"]
//      of //a[normalize-space()="Uitloggen"]
//   2. een uniek anker op een voorouder plus de kortste staart,
//      bijv. //div[@data-testid="cart"]//button
//   3. structureel, alleen als niets anders uniek is: het kortste unieke
//      pad met posities (//ul/li[2]), en anders het absolute pad
//
// Pure functie: alleen DOM-API's, geen extensie-API's.

import {
  DEFAULT_TEST_ATTRIBUTES,
  STABLE_ATTRIBUTES,
  queryRootOf,
  siblingsOf,
  type QueryRoot,
} from './dom';

export interface XPathOptions {
  /** Testattributen in volgorde van voorkeur. */
  testAttributes?: readonly string[];
}

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const ORDERED_NODE_SNAPSHOT_TYPE = 7; // XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
const MAX_TEXT_LENGTH = 60;

// Elementen waarvan de tekst ook met iconen of opmaak erin een goed label is.
const TEXT_ELEMENTS = new Set([
  'a', 'button', 'label', 'legend', 'summary', 'option', 'caption',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'dt',
]);

export function xpathSelector(el: Element, options: XPathOptions = {}): string {
  const testAttributes = options.testAttributes ?? DEFAULT_TEST_ATTRIBUTES;
  const root = queryRootOf(el);
  // In een shadow root werkt `//` vanaf het document; daar relatief zoeken.
  const prefix = root.nodeType === Node.DOCUMENT_NODE ? '//' : './/';

  // 1: één stap op het element zelf. Een kale tag telt niet.
  const name = nameTest(el);
  for (const step of stepCandidates(el, testAttributes)) {
    if (step === name) continue;
    const expr = prefix + step;
    if (matchesOnly(root, expr, el)) return expr;
  }

  // 2: pad omhoog naar een uniek anker op een voorouder.
  const path = [siblingStep(el, testAttributes)];
  // Een losse stap als structureel pad alleen zonder parent-element (direct
  // onder een shadow root); anders is //p[2] te los van zijn context.
  const leafOnly = prefix + path.join('/');
  let structural = !el.parentElement && matchesOnly(root, leafOnly, el) ? leafOnly : null;
  for (let node = el.parentElement; node; node = node.parentElement) {
    const anchor = uniqueAnchor(node, root, prefix, testAttributes);
    if (anchor) {
      for (let k = 1; k <= path.length; k++) {
        const expr = `${anchor}//${path.slice(-k).join('/')}`;
        if (matchesOnly(root, expr, el)) return expr;
      }
    }

    path.unshift(siblingStep(node, testAttributes));
    const expr = prefix + path.join('/');
    if (!structural && matchesOnly(root, expr, el)) structural = expr;
  }

  // 3: structureel. Het absolute pad vanaf de wortel is altijd uniek.
  return structural ?? (prefix === '//' ? '/' : './') + path.join('/');
}

/** Testattribuut of id waarmee een voorouder in z'n eentje uniek is. */
function uniqueAnchor(
  el: Element,
  root: QueryRoot,
  prefix: string,
  testAttributes: readonly string[],
): string | null {
  const name = nameTest(el);
  const attrs = [...testAttributes, 'id'];
  for (const attr of attrs) {
    const value = el.getAttribute(attr);
    if (!value) continue;
    const expr = `${prefix}${name}[@${attr}=${xpathLiteral(value)}]`;
    if (matchesOnly(root, expr, el)) return expr;
  }
  return null;
}

/** XPath-stappen voor het element, van meest naar minst stabiel. */
function stepCandidates(el: Element, testAttributes: readonly string[]): string[] {
  const name = nameTest(el);
  const candidates: string[] = [];

  for (const attr of [...testAttributes, 'id', ...STABLE_ATTRIBUTES]) {
    const value = el.getAttribute(attr);
    if (value) candidates.push(`${name}[@${attr}=${xpathLiteral(value)}]`);
  }

  const text = labelText(el);
  if (text) candidates.push(`${name}[normalize-space()=${xpathLiteral(text)}]`);

  candidates.push(name);
  return candidates;
}

/** Kortste stap die het element onderscheidt van zijn siblings. */
function siblingStep(el: Element, testAttributes: readonly string[]): string {
  const siblings = siblingsOf(el);
  // Binnen een pad is de kale naam leesbaarder en stabieler dan tekst.
  const name = nameTest(el);
  const candidates = stepCandidates(el, testAttributes).filter((c) => c !== name);
  const textIndex = candidates.findIndex((c) => c.startsWith(`${name}[normalize-space()=`));
  candidates.splice(textIndex === -1 ? candidates.length : textIndex, 0, name);
  for (const candidate of candidates) {
    const matching = siblings.filter((s) => evaluate(`self::${candidate}`, s).snapshotLength === 1);
    if (matching.length === 1) return candidate;
  }

  // Niets onderscheidt het element: positie onder siblings met dezelfde naam.
  const sameName = siblings.filter(
    (s) => s.localName === el.localName && s.namespaceURI === el.namespaceURI,
  );
  return `${nameTest(el)}[${sameName.indexOf(el) + 1}]`;
}

/**
 * Naamtest voor de stap. HTML-elementen bij naam; SVG, MathML en andere
 * namespaces via local-name(), omdat een kale naam daar niet matcht.
 */
function nameTest(el: Element): string {
  if (el.namespaceURI === HTML_NAMESPACE && /^[A-Za-z_][\w.-]*$/.test(el.localName)) {
    return el.localName;
  }
  // local-name(.) is gelijk aan local-name(); de expliciete vorm omdat jsdom
  // (gebruikt in de unit tests) local-name() zonder argument niet aankan.
  return `*[local-name(.)=${xpathLiteral(el.localName)}]`;
}

/** Zichtbare tekst die als label kan dienen, of null. */
function labelText(el: Element): string | null {
  const hasElementChildren = el.children.length > 0;
  if (hasElementChildren && !TEXT_ELEMENTS.has(el.localName)) return null;
  const text = normalizeSpace(el.textContent ?? '');
  if (!text || text.length > MAX_TEXT_LENGTH) return null;
  return text;
}

/** Zelfde normalisatie als XPath normalize-space(). */
function normalizeSpace(value: string): string {
  return value.replace(/[\t\n\r ]+/g, ' ').trim();
}

function evaluate(expr: string, context: Node): XPathResult {
  const doc = context.ownerDocument ?? (context as Document);
  return doc.evaluate(expr, context, null, ORDERED_NODE_SNAPSHOT_TYPE, null);
}

function matchesOnly(root: QueryRoot, expr: string, el: Element): boolean {
  const result = evaluate(expr, root);
  return result.snapshotLength === 1 && result.snapshotItem(0) === el;
}

/**
 * XPath 1.0-literal. XPath kent geen escapes: kies het aanhalingsteken dat
 * niet in de waarde staat, en gebruik concat() als ze er allebei in staan.
 */
export function xpathLiteral(value: string): string {
  if (!value.includes('"')) return `"${value}"`;
  if (!value.includes("'")) return `'${value}'`;
  const parts = value.split('"').map((part) => `"${part}"`);
  return `concat(${parts.join(`, '"', `)})`;
}
