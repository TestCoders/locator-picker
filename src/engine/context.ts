// Context van een element (issue #23): de keten van same-origin iframes en open
// shadow roots waar het element in zit, van buiten naar binnen.
//
// Voor <iframe id="checkout"> › <my-card> (shadow root) › <button> is dat
//   [{ kind: 'frame', selector: '#checkout' }, { kind: 'shadow', selector: 'my-card' }]
// Elke selector is een CSS-selector binnen de stap ervoor: de iframe binnen het
// hoofddocument, de host binnen het document van de iframe.
//
// Pure functie: alleen DOM-API's, geen extensie-API's.

import { cssSelector } from './css';

export type ContextStep =
  /** Het element zit in het document van deze iframe. */
  | { kind: 'frame'; selector: string }
  /** Het element zit in de (open) shadow root van deze host. */
  | { kind: 'shadow'; selector: string };

export type ContextOptions = {
  testAttributes?: readonly string[];
};

export function contextOf(el: Element, options: ContextOptions = {}): ContextStep[] {
  const steps: ContextStep[] = [];
  let node: Element = el;
  for (;;) {
    const root = node.getRootNode();
    if (isShadowRoot(root)) {
      steps.unshift({ kind: 'shadow', selector: hostSelector(root.host, options) });
      node = root.host;
      continue;
    }
    // Een document: zit het in een iframe waar we bij kunnen? frameElement is
    // null in het hoofddocument en bij een cross-origin ouder.
    const frame = frameElementOf(node.ownerDocument);
    if (!frame) break;
    steps.unshift({ kind: 'frame', selector: cssSelector(frame, options) });
    node = frame;
  }
  return steps;
}

/**
 * Selector voor een shadow host. Een custom element (naam met een streepje)
 * dat uniek is in zijn root, krijgt alleen zijn tagnaam: `product-card` is
 * stabieler en leesbaarder dan een pad ernaartoe.
 */
function hostSelector(host: Element, options: ContextOptions): string {
  const name = host.localName;
  if (name.includes('-') && /^[a-z][a-z0-9._-]*$/.test(name)) {
    const root = host.getRootNode() as Document | DocumentFragment;
    const matches = root.querySelectorAll(name);
    if (matches.length === 1 && matches[0] === host) return name;
  }
  return cssSelector(host, options);
}

/** Leesbare omschrijving, bijv. `iframe #checkout › shadow root van my-card`. */
export function describeContext(steps: readonly ContextStep[]): string {
  return steps
    .map((step) => (step.kind === 'frame' ? `iframe ${step.selector}` : `shadow root van ${step.selector}`))
    .join(' › ');
}

/** True als het element in een shadow root zit (direct, niet via een iframe erboven). */
export function isInShadowRoot(el: Element): boolean {
  return isShadowRoot(el.getRootNode());
}

// Op nodeType, niet met instanceof: een node uit een iframe komt uit een
// andere realm en is geen instanceof van de Element van het hoofdvenster.
function isShadowRoot(node: Node): node is ShadowRoot {
  return node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && (node as ShadowRoot).host?.nodeType === Node.ELEMENT_NODE;
}

function frameElementOf(doc: Document): Element | null {
  try {
    return doc.defaultView?.frameElement ?? null;
  } catch {
    // Cross-origin ouder: geen toegang.
    return null;
  }
}
