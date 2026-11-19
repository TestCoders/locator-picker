import type { PickedElement } from '@/shared/messages';
import type { LocatorPreview } from './hover-overlay';

const MAX_TEXT = 80;

export function describeElement(element: Element, locator: LocatorPreview): PickedElement {
  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  return {
    tagName: element.tagName.toLowerCase(),
    locator: locator(element),
    text: text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text,
  };
}
