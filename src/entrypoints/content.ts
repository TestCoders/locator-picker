import { HoverOverlay } from '@/content/hover-overlay';
import { buildLocator } from '@/engine/locator-engine';
import { isMessage, type Message, type ToggleResponse } from '@/shared/messages';
import { PickMode } from '@/shared/pick-mode';

export default defineContentScript({
  matches: ['<all_urls>'],
  main(ctx) {
    const overlay = new HoverOverlay((el) => buildLocator(el).locator);

    const pickMode = new PickMode(window, {
      onDeactivate: () => {
        overlay.stop();
        const message: Message = { type: 'PICK_MODE_CHANGED', active: false };
        // De background kan net herstarten; een gemist bericht is niet erg.
        browser.runtime.sendMessage(message).catch(() => {});
      },
    });

    browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
      if (!isMessage(message) || message.type !== 'TOGGLE_PICK_MODE') return;
      const active = pickMode.toggle();
      if (active) overlay.start();
      else overlay.stop();
      const response: ToggleResponse = { active };
      sendResponse(response);
    });

    // Extensie herladen of uitgeschakeld: opruimen.
    ctx.onInvalidated(() => {
      pickMode.stop();
      overlay.stop();
    });
  },
});
