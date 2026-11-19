// Tijdelijke locator-voorvertoning voor de hover-tooltip (issue #5).
// Wordt vervangen door de echte locator-strategie uit issue #7.

const TEST_ATTRIBUTES = ['data-testid', 'data-test', 'data-cy'];

export function previewLocator(el: Element): string {
  for (const attr of TEST_ATTRIBUTES) {
    const value = el.getAttribute(attr);
    if (value) return `[${attr}="${value}"]`;
  }
  if (el.id) return `#${CSS.escape(el.id)}`;

  const tag = el.tagName.toLowerCase();
  const firstClass = el.classList[0];
  return firstClass ? `${tag}.${CSS.escape(firstClass)}` : tag;
}
