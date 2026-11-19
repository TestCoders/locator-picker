import { HoverOverlay } from '@/content/hover-overlay';
import { previewLocator } from '@/engine/preview-locator';
import { isMessage, type Message, type PingResponse } from '@/shared/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('[locator-picker] hello vanuit het content script');

    const overlay = new HoverOverlay(previewLocator);

    const hello: Message = { type: 'HELLO', from: 'content' };
    void browser.runtime.sendMessage(hello);

    browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
      if (!isMessage(message)) return;

      if (message.type === 'PICK_MODE') {
        if (message.enabled) overlay.start();
        else overlay.stop();
        return;
      }

      if (message.type === 'PING') {
        const response: PingResponse = { type: 'PONG', from: 'content', url: location.href };
        sendResponse(response);
      }
    });
  },
});
