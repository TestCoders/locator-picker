// Waarschuwing bij ontbrekende testhooks (issue #17).
//
// Een element zonder testattribuut, `id` en toegankelijke naam heeft geen
// stabiele hook. We stellen voor welk attribuut de developer kan toevoegen,
// met een waarde afgeleid van tekst, rol of context van het element.
//
// Pure functie: alleen DOM-API's, geen extensie-API's.

import { getAccessibleName, getRole, normalize } from './accessibility';
import { DEFAULT_TEST_ATTRIBUTES } from './dom';

export type HookWarning = {
  /** Attribuut dat toegevoegd moet worden, bijvoorbeeld `data-testid`. */
  attribute: string;
  /** Voorgestelde waarde, afgeleid van tekst, rol of context. */
  value: string;
  /** Kant-en-klaar voorstel, bijvoorbeeld `data-testid="login-form-submit"`. */
  suggestion: string;
  /** Waarschuwing in één zin. */
  message: string;
};

export type HookWarningOptions = {
  /** Testattributen in volgorde van voorkeur; de eerste wordt voorgesteld (optiespagina, #16). */
  testAttributes?: readonly string[];
};

const MAX_SLUG = 30;
const MAX_WORDS = 4;

// Containers die context geven aan een kaal element.
const LANDMARK_TAGS = new Set(['form', 'nav', 'header', 'footer', 'main', 'aside', 'dialog', 'table', 'ul', 'ol']);

/** `null` als het element een bruikbare hook heeft. */
export function missingHookWarning(el: Element, options: HookWarningOptions = {}): HookWarning | null {
  const testAttributes = options.testAttributes ?? DEFAULT_TEST_ATTRIBUTES;
  if (testAttributes.some((attr) => el.getAttribute(attr))) return null;
  if (el.getAttribute('id')) return null;
  if (getAccessibleName(el)) return null;

  const attribute = testAttributes[0] ?? DEFAULT_TEST_ATTRIBUTES[0]!;
  const value = suggestValue(el, testAttributes);
  return {
    attribute,
    value,
    suggestion: `${attribute}="${value}"`,
    message: `Dit element heeft geen testattribuut, id of toegankelijke naam; voeg ${attribute}="${value}" toe.`,
  };
}

function suggestValue(el: Element, testAttributes: readonly string[]): string {
  const own = ownLabel(el);
  const context = contextLabel(el, testAttributes);
  // Context voorop, tenzij die gelijk is aan het eigen label (`form` in `form`).
  return context && context !== own ? `${context}-${own}` : own;
}

/** Tekst, naam-achtig attribuut, rol of tag van het element zelf. */
function ownLabel(el: Element): string {
  const text = slug(normalize(el.textContent).split(' ').slice(0, MAX_WORDS).join(' '));
  if (text) return text;

  for (const attr of ['name', 'placeholder', 'title', 'alt', 'type']) {
    const value = slug(el.getAttribute(attr));
    if (value) return value;
  }
  return slug(getRole(el)) || slug(el.localName);
}

/** Dichtstbijzijnde voorouder met een eigen hook of een landmark-tag. */
function contextLabel(el: Element, testAttributes: readonly string[]): string {
  for (let node = el.parentElement; node; node = node.parentElement) {
    for (const attr of testAttributes) {
      const value = slug(node.getAttribute(attr));
      if (value) return value;
    }
    const id = slug(node.getAttribute('id'));
    if (id) return id;
    const name = slug(getAccessibleName(node));
    if (name) return name;
    if (LANDMARK_TAGS.has(node.localName)) return slug(node.localName);
  }
  return '';
}

/** Kleine letters, cijfers en koppeltekens; geen accenten. */
export function slug(value: string | null | undefined): string {
  const text = (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return text.slice(0, MAX_SLUG).replace(/-+$/g, '');
}
