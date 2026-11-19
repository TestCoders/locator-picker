import { isMessage, type PingResponse } from '@/shared/messages';

export default defineBackground(() => {
  console.log('[locator-picker] background gestart', { id: browser.runtime.id });

  browser.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (!isMessage(message)) return;

    if (message.type === 'HELLO') {
      console.log('[locator-picker] hello van content script', sender.tab?.url);
      return;
    }

    if (message.type === 'PING') {
      const response: PingResponse = { type: 'PONG', from: 'background' };
      sendResponse(response);
    }
  });
});
