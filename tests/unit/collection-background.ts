// Testhulp: koppelt runtime.sendMessage in fakeBrowser aan dezelfde
// afhandeling van de verzameling als de background.

import { fakeBrowser } from 'wxt/testing/fake-browser';
import { handleCollectionMessage } from '@/shared/collection';

export function installCollectionBackground(): void {
  fakeBrowser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) =>
    handleCollectionMessage(message, sendResponse),
  );
}
