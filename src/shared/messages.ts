import type { Stability } from '@/engine/stability';

// Berichtcontract tussen background, content script en (later) het resultaatpaneel.

// Serialiseerbare samenvatting van het gekozen element. Het Element zelf blijft
// in het content script; het resultaatpaneel (#15) werkt met deze gegevens.
export type PickedElement = {
  tagName: string;
  locator: string;
  /** Aantal elementen dat `locator` in de pagina vindt; 1 betekent uniek. */
  matchCount: number;
  text: string;
  /** Kleur, label, icoon en uitleg volgens docs/stabiliteit.md. */
  stability: Stability;
};

export type Message =
  | { type: 'TOGGLE_PICK_MODE' }
  | { type: 'PICK_MODE_CHANGED'; active: boolean }
  | { type: 'ELEMENT_PICKED'; element: PickedElement }
  | { type: 'GET_PICKED_ELEMENT' }
  | { type: 'OPEN_COLLECTION' };

export type ToggleResponse = { active: boolean };

export type PickedElementResponse = { element: PickedElement | null };

const MESSAGE_TYPES: ReadonlySet<string> = new Set<Message['type']>([
  'TOGGLE_PICK_MODE',
  'PICK_MODE_CHANGED',
  'ELEMENT_PICKED',
  'GET_PICKED_ELEMENT',
  'OPEN_COLLECTION',
]);

export function isMessage(value: unknown): value is Message {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof value.type === 'string' &&
    MESSAGE_TYPES.has(value.type)
  );
}
