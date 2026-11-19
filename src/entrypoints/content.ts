import { HoverOverlay } from '@/content/hover-overlay';
import { copyText } from '@/content/clipboard';
import { describeElement } from '@/content/picked-element';
import { buildResult } from '@/content/result-data';
import { ResultPanel } from '@/content/result-panel';
import { SelectionHighlight } from '@/content/selection-highlight';
import { testAttributeOrder } from '@/engine/dom';
import { getAccessibleName, getRole } from '@/engine/accessibility';
import { buildLocator, type LocatorResult } from '@/engine/locator-engine';
import { suggestFieldName } from '@/engine/page-object/naming';
import { playwrightSnippet } from '@/engine/snippets/playwright';
import { assessStability } from '@/engine/stability';
import {
  isMessage,
  type Message,
  type PickedElementResponse,
  type ToggleResponse,
} from '@/shared/messages';
import { addToCollection } from '@/shared/collection';
import { domainOf, entryFromResult, recordPick } from '@/shared/history';
import { PickMode } from '@/shared/pick-mode';
import { DEFAULT_TEST_ATTRIBUTE, watchTestAttribute } from '@/shared/settings';

export default defineContentScript({
  matches: ['<all_urls>'],
  main(ctx) {
    // Gekozen testattribuut vooraan (optiespagina). Een wijziging geldt direct,
    // zonder de pagina te herladen.
    let testAttributes = testAttributeOrder(DEFAULT_TEST_ATTRIBUTE);
    const unwatchSettings = watchTestAttribute((value) => {
      testAttributes = testAttributeOrder(value);
    });

    const locatorOf = (el: Element) => buildLocator(el, { testAttributes }).locator;
    const stabilityOf = (el: Element) => assessStability(buildLocator(el, { testAttributes }));
    const overlay = new HoverOverlay(locatorOf);
    const selection = new SelectionHighlight();
    const panel = new ResultPanel({
      copy: copyText,
      // Meting voor het doel 'van klik tot clipboard binnen 3 seconden'.
      onCopied: (format, ms) =>
        console.info(`[locator-picker] klik tot clipboard (${format}): ${Math.round(ms)} ms`),
    });

    // De background kan net herstarten; een gemist bericht is niet erg.
    const send = (message: Message) => browser.runtime.sendMessage(message).catch(() => {});

    const pickMode = new PickMode(window, {
      onPick: (element) => {
        const pickedAt = performance.now();
        selection.show(element);
        const result = buildResult(element, { testAttributes });
        const best = buildLocator(element, { testAttributes });
        panel.show(result, pickedAt, {
          collect: () =>
            addToCollection({
              name: suggestFieldName(namingHints(element, best)),
              snippet: playwrightSnippet(best),
              description: result.text ? `<${result.tagName}> “${result.text}”` : `<${result.tagName}>`,
              pageTitle: document.title,
            }),
          openCollection: () => send({ type: 'OPEN_COLLECTION' }),
        });
        // Historie is een extra: een fout (bijvoorbeeld een herladen extensie) mag het paneel niet breken.
        void recordPick(domainOf(window.location), entryFromResult(result)).catch(() => {});
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
          // Nieuwe keuze: de vorige highlight en het paneel verdwijnen.
          selection.clear();
          panel.close();
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
      unwatchSettings();
      pickMode.stop();
      overlay.stop();
      selection.clear();
      panel.close();
    });
  },
});

/** Wat de naamgeving voor een page object-veld van een element nodig heeft. */
function namingHints(element: Element, best: LocatorResult) {
  return {
    testValue: best.strategy === 'test-attribute' ? best.value : undefined,
    id: element.id || undefined,
    role: getRole(element),
    name: getAccessibleName(element),
    tagName: element.localName,
  };
}
