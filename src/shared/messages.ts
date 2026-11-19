// Berichtcontract tussen popup, background en content script.

export type Message =
  | { type: 'PING'; from: 'popup' | 'background' }
  | { type: 'HELLO'; from: 'content' };

export type PingResponse = { type: 'PONG'; from: 'content' | 'background'; url?: string };

export function isMessage(value: unknown): value is Message {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value.type === 'PING' || value.type === 'HELLO')
  );
}
