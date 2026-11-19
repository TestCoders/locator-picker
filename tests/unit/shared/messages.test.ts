import { describe, expect, it } from 'vitest';
import { isMessage } from '@/shared/messages';

describe('isMessage', () => {
  it('accepteert bekende berichttypes', () => {
    expect(isMessage({ type: 'PING', from: 'popup' })).toBe(true);
    expect(isMessage({ type: 'HELLO', from: 'content' })).toBe(true);
  });

  it.each([null, undefined, 'PING', 42, {}, { type: 'ONBEKEND' }])(
    'weigert %j',
    (value) => {
      expect(isMessage(value)).toBe(false);
    },
  );
});
