import { countMatches, queryRootOf } from '@/engine/validate';
import type { Stability } from '@/engine/stability';
import type { PickedElement } from '@/shared/messages';
import type { LocatorPreview } from './hover-overlay';

const MAX_TEXT = 80;

export function describeElement(
  element: Element,
  locator: LocatorPreview,
  stabilityOf: (element: Element) => Stability,
): PickedElement {
  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  const value = locator(element);
  return {
    tagName: element.tagName.toLowerCase(),
    locator: value,
    matchCount: countMatches({ kind: 'css', value }, queryRootOf(element)),
    stability: stabilityOf(element),
    text: text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text,
  };
}
