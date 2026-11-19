// Namen voor velden en klassen in een gegenereerd page object (issue #21).
//
// Pure functies: geen DOM- of extensie-API's.

export type NamingHints = {
  /** Waarde van het testattribuut, bijv. 'place-order'. */
  testValue?: string;
  id?: string;
  role?: string | null;
  /** Toegankelijke naam of zichtbare tekst. */
  name?: string;
  tagName: string;
};

// Achtervoegsel per rol (of tag), zodat de naam zegt wat voor element het is.
const SUFFIX_BY_ROLE: Record<string, string> = {
  button: 'Button',
  link: 'Link',
  textbox: 'Input',
  searchbox: 'Input',
  checkbox: 'Checkbox',
  radio: 'Radio',
  combobox: 'Select',
  listbox: 'Select',
  heading: 'Heading',
  img: 'Image',
  tab: 'Tab',
  dialog: 'Dialog',
};

const MAX_WORDS = 4;

/** Stelt een veldnaam voor, bijv. `placeOrderButton` of `emailInput`. */
export function suggestFieldName(hints: NamingHints): string {
  // De eerste bron die bruikbare woorden oplevert; '!!!' als naam valt af.
  const sources = [hints.testValue, hints.id, hints.name, hints.tagName];
  const words = (sources.map((source) => toWords(source ?? '')).find((w) => w.length > 0) ?? []).slice(0, MAX_WORDS);
  const suffix = hints.role ? SUFFIX_BY_ROLE[hints.role] : undefined;
  if (suffix && !endsWithSuffix(words, suffix)) words.push(suffix);
  return toIdentifier(words, 'camel') || 'element';
}

/** Stelt een klassenaam voor op basis van de paginatitel, bijv. `CheckoutPage`. */
export function suggestClassName(pageTitle: string): string {
  const words = toWords(pageTitle).slice(0, MAX_WORDS);
  if (words.at(-1)?.toLowerCase() !== 'page') words.push('Page');
  return toIdentifier(words, 'pascal');
}

/** Maakt namen uniek door een volgnummer toe te voegen: `saveButton`, `saveButton2`. */
export function uniqueNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  return names.map((name) => {
    let candidate = name;
    for (let n = 2; seen.has(candidate); n++) candidate = `${name}${n}`;
    seen.add(candidate);
    return candidate;
  });
}

// Gereserveerde woorden van TypeScript/JavaScript, plus namen die al in de
// gegenereerde klasse staan.
const RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
  'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in',
  'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
  'var', 'void', 'while', 'with', 'implements', 'interface', 'let', 'package', 'private', 'protected',
  'public', 'static', 'yield', 'await', 'async',
]);
const CLASS_MEMBERS = new Set(['page', 'constructor']);

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** Foutmelding voor een veldnaam, of null als de naam geldig is. */
export function fieldNameError(name: string): string | null {
  if (!name) return 'Vul een naam in.';
  if (!IDENTIFIER.test(name)) return 'Alleen letters, cijfers, _ en $; niet beginnen met een cijfer.';
  if (RESERVED.has(name)) return `'${name}' is een gereserveerd woord.`;
  if (CLASS_MEMBERS.has(name)) return `'${name}' bestaat al in de klasse.`;
  return null;
}

/** Foutmelding voor een klassenaam, of null als de naam geldig is. */
export function classNameError(name: string): string | null {
  if (!name) return 'Vul een klassenaam in.';
  if (!IDENTIFIER.test(name)) return 'Alleen letters, cijfers, _ en $; niet beginnen met een cijfer.';
  if (RESERVED.has(name)) return `'${name}' is een gereserveerd woord.`;
  return null;
}

/** Splitst tekst in woorden: 'place-order', 'placeOrder' en 'Place order' geven ['place', 'order']. */
function toWords(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accenten weg: 'één' -> 'een'
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase splitsen
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

function endsWithSuffix(words: string[], suffix: string): boolean {
  const last = words.at(-1)?.toLowerCase();
  return last === suffix.toLowerCase() || (suffix === 'Button' && last === 'btn');
}

function toIdentifier(words: string[], style: 'camel' | 'pascal'): string {
  const parts = words.map((word, i) => {
    const lower = word.toLowerCase();
    return i === 0 && style === 'camel' ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
  });
  const identifier = parts.join('');
  // Een identifier mag niet met een cijfer beginnen.
  return /^\d/.test(identifier) ? `${style === 'camel' ? 'field' : 'Page'}${identifier}` : identifier;
}
