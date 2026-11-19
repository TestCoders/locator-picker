// Herkent class-namen die waarschijnlijk gegenereerd zijn (issue #26).
//
// Een locator op `.css-1q2w3e` breekt bij de volgende build. De heuristiek
// zoekt vier patronen; wat niet in de lijst staat, blijft bruikbaar:
//
//   1. framework-prefix + hash:  sc-bdVaJa, css-1q2w3e, jsx-123456, emotion-0, jss12
//   2. CSS-modules:              Button_root__x7Yz2, button_primary_3xKj9
//   3. lange cijferreeks:        col-1234, item-20240101
//   4. kale hash:                a1b2c3, x7Yz2 (3 of meer wissels tussen cijfer en letter)
//
// Bewust niet herkend, want betekenisvol: btn-primary, col-md-6, fa-2x, grid12, MuiButton-root.
//
// Pure functie: geen DOM- of extensie-API's.

const FRAMEWORK_HASH = /^(sc|css|jsx|emotion|jss|svelte|astro|styled|tw)-?[A-Za-z0-9]{4,}$/;
// `jss12` en `css-0`: prefix zonder streepje is alleen bij cijfers een hash.
const FRAMEWORK_NUMBER = /^(jss|css|jsx|emotion)-?\d+$/;
const CSS_MODULE_SUFFIX = /__[A-Za-z0-9_-]{5,}$/;
const CSS_MODULE_HASH = /^[A-Za-z][\w-]*_[A-Za-z0-9]{5,}_\d*$/;
const LONG_DIGITS = /\d{3,}/;
const BARE_HASH = /^[A-Za-z0-9]{5,16}$/;
const MIN_KIND_CHANGES = 3;

/** Hoe vaak de tekst wisselt tussen cijfers en letters: `x7Yz2` is 4, `grid12` is 1. */
function digitLetterChanges(text: string): number {
  let changes = 0;
  for (let i = 1; i < text.length; i++) {
    const before = /\d/.test(text.charAt(i - 1));
    const now = /\d/.test(text.charAt(i));
    if (before !== now) changes++;
  }
  return changes;
}

/** True als de class op een gegenereerde naam lijkt. Zegt niets over state-classes. */
export function isGeneratedClass(cls: string): boolean {
  if (FRAMEWORK_NUMBER.test(cls)) return true;
  if (/^(sc|css|jsx|emotion|jss|svelte|astro|styled|tw)-/.test(cls) && FRAMEWORK_HASH.test(cls)) {
    // `css-grid` is geen hash: alleen als de rest een cijfer of hoofdletter bevat.
    const rest = cls.replace(/^[a-z]+-/, '');
    if (/\d/.test(rest) || /[A-Z]/.test(rest)) return true;
  }
  if (CSS_MODULE_SUFFIX.test(cls) || CSS_MODULE_HASH.test(cls)) return true;
  if (LONG_DIGITS.test(cls)) return true;
  return BARE_HASH.test(cls) && digitLetterChanges(cls) >= MIN_KIND_CHANGES;
}

// Classes die een toestand beschrijven en per interactie veranderen.
const STATE_CLASSES = new Set([
  'active', 'focus', 'focused', 'hover', 'selected', 'disabled',
  'open', 'opened', 'closed', 'visible', 'hidden', 'show', 'in',
]);

export function isStateClass(cls: string): boolean {
  return STATE_CLASSES.has(cls) || /^(is|has)-/.test(cls);
}

export type ClassHeuristicOptions = {
  /** Gegenereerde namen herkennen. Uit = alleen state-classes worden vermeden (valse positieven). Standaard aan. */
  detectGenerated?: boolean;
};

/** True als de class niet in een locator hoort. */
export function isUnstableClass(cls: string, options: ClassHeuristicOptions = {}): boolean {
  if (isStateClass(cls)) return true;
  return (options.detectGenerated ?? true) && isGeneratedClass(cls);
}

/** De gegenereerde classes van een element, in volgorde van `classList`. */
export function generatedClassesOf(el: Element): string[] {
  return Array.from(el.classList).filter(isGeneratedClass);
}
