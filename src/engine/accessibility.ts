// Vereenvoudigde rol en toegankelijke naam, genoeg voor stabiele locators.
// Dit is bewust geen volledige implementatie van de ARIA-spec.

const IMPLICIT_ROLE_BY_TAG: Record<string, string> = {
  a: 'link',
  button: 'button',
  nav: 'navigation',
  main: 'main',
  select: 'combobox',
  textarea: 'textbox',
  img: 'img',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  ul: 'list',
  ol: 'list',
  li: 'listitem',
  table: 'table',
  form: 'form',
};

const INPUT_ROLE_BY_TYPE: Record<string, string> = {
  button: 'button',
  submit: 'button',
  reset: 'button',
  checkbox: 'checkbox',
  radio: 'radio',
  range: 'slider',
  number: 'spinbutton',
  search: 'searchbox',
  email: 'textbox',
  tel: 'textbox',
  text: 'textbox',
  url: 'textbox',
  password: 'textbox',
};

// Rollen waarvan de naam uit de inhoud komt.
const NAME_FROM_CONTENT = new Set(['button', 'link', 'heading', 'listitem']);

export function normalize(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

export function getRole(el: Element): string | null {
  const explicit = normalize(el.getAttribute('role')).split(' ')[0];
  if (explicit) return explicit;

  const tag = el.tagName.toLowerCase();
  if (tag === 'a') return el.hasAttribute('href') ? 'link' : null;
  if (tag === 'input') {
    const type = (el.getAttribute('type') ?? 'text').toLowerCase();
    return INPUT_ROLE_BY_TYPE[type] ?? null;
  }
  return IMPLICIT_ROLE_BY_TAG[tag] ?? null;
}

export function getAccessibleName(el: Element): string {
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => normalize(el.ownerDocument.getElementById(id)?.textContent))
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }

  const ariaLabel = normalize(el.getAttribute('aria-label'));
  if (ariaLabel) return ariaLabel;

  const tag = el.tagName.toLowerCase();
  if (tag === 'img') return normalize(el.getAttribute('alt'));

  if (tag === 'input' || tag === 'select' || tag === 'textarea') {
    const labelText = labelFor(el);
    if (labelText) return labelText;
    if (tag === 'input') {
      const type = (el.getAttribute('type') ?? 'text').toLowerCase();
      if (type === 'button' || type === 'submit' || type === 'reset') {
        return normalize(el.getAttribute('value'));
      }
    }
    return normalize(el.getAttribute('placeholder'));
  }

  const role = getRole(el);
  if (role && NAME_FROM_CONTENT.has(role)) {
    return normalize(el.textContent) || normalize(el.getAttribute('title'));
  }
  return normalize(el.getAttribute('title'));
}

function labelFor(el: Element): string {
  const id = el.getAttribute('id');
  if (id) {
    for (const label of Array.from(el.ownerDocument.getElementsByTagName('label'))) {
      if (label.getAttribute('for') === id) return normalize(label.textContent);
    }
  }
  return normalize(el.closest('label')?.textContent);
}
