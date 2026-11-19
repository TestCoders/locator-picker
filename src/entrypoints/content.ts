import { HoverOverlay } from '@/content/hover-overlay';
import { describeElement } from '@/content/picked-element';
import { SelectionHighlight } from '@/content/selection-highlight';
import { buildLocator } from '@/engine/locator-engine';
import { assessStability } from '@/engine/stability';
import {
  isMessage,
  type Message,
  type PickedElementResponse,
  type ToggleResponse,
} from '@/shared/messages';
import { PickMode } from '@/shared/pick-mode';

export default defineContentScript({
  matches: ['<all_urls>'],
  main(ctx) {
    const locatorOf = (el: Element) => buildLocator(el).locator;
    const stabilityOf = (el: Element) => assessStability(buildLocator(el));
    const overlay = new HoverOverlay(locatorOf);
    const selection = new SelectionHighlight();

    // De background kan net herstarten; een gemist bericht is niet erg.
    const send = (message: Message) => browser.runtime.sendMessage(message).catch(() => {});

    const pickMode = new PickMode(window, {
      onPick: (element) => {
        selection.show(element);
        send({ type: 'ELEMENT_PICKED', element: describeElement(element, locatorOf, stabilityOf) });
      },
      onDeactivate: () => {
        overlay.stop();
        send({ type: 'PICK_MODE_CHANGED', active: false });
      },
    });

    browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
      if (!isMessage(message)) return;

      if (message.type === 'TOGGLE_PICK_MODE') {
        const active = pickMode.toggle();
        if (active) {
          // Nieuwe keuze: de vorige highlight verdwijnt.
          selection.clear();
          overlay.start();
        } else {
          overlay.stop();
        }
        const response: ToggleResponse = { active };
        sendResponse(response);
      }

      if (message.type === 'GET_PICKED_ELEMENT') {
        const element = selection.selected;
        const response: PickedElementResponse = {
          element: element?.isConnected ? describeElement(element, locatorOf, stabilityOf) : null,
        };
        sendResponse(response);
      }
    });

    // Extensie herladen of uitgeschakeld: opruimen.
    ctx.onInvalidated(() => {
      pickMode.stop();
      overlay.stop();
      selection.clear();
    });
  },
});
