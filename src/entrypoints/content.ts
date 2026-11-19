import { isMessage, type Message, type PingResponse } from '@/shared/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('[locator-picker] hello vanuit het content script');

    const hello: Message = { type: 'HELLO', from: 'content' };
    void browser.runtime.sendMessage(hello);

    browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
      if (!isMessage(message) || message.type !== 'PING') return;
      const response: PingResponse = { type: 'PONG', from: 'content', url: location.href };
      sendResponse(response);
    });
  },
});
