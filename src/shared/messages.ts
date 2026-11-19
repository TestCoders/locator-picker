// Berichtcontract tussen background en content script.

export type Message =
  | { type: 'TOGGLE_PICK_MODE' }
  | { type: 'PICK_MODE_CHANGED'; active: boolean };

export type ToggleResponse = { active: boolean };

export function isMessage(value: unknown): value is Message {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value.type === 'TOGGLE_PICK_MODE' || value.type === 'PICK_MODE_CHANGED')
  );
}
