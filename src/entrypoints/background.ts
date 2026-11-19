import { isMessage, type Message, type ToggleResponse } from '@/shared/messages';

// De background bewaart zelf geen status: het content script is de bron van
// waarheid, de badge volgt. Zo overleeft het een herstart van de service worker.

async function showState(tabId: number, active: boolean): Promise<void> {
  await Promise.all([
    browser.action.setBadgeText({ tabId, text: active ? 'AAN' : '' }),
    browser.action.setTitle({
      tabId,
      title: active ? 'Locator Picker: pick-modus aan (Esc om te stoppen)' : 'Locator Picker',
    }),
  ]);
}

export default defineBackground(() => {
  void browser.action.setBadgeBackgroundColor({ color: '#1d76db' });

  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id === undefined) return;
    try {
      const message: Message = { type: 'TOGGLE_PICK_MODE' };
      const response = (await browser.tabs.sendMessage(tab.id, message)) as ToggleResponse;
      await showState(tab.id, response.active);
    } catch {
      // Geen content script op deze pagina (chrome://, Web Store, of een tab
      // die al open stond voordat de extensie geladen werd).
      await showState(tab.id, false);
    }
  });

  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (!isMessage(message)) return;
    const tabId = sender.tab?.id;
    if (tabId === undefined) return;

    if (message.type === 'PICK_MODE_CHANGED') void showState(tabId, message.active);

    // Het resultaatpaneel staat in de pagina (content script); hier alleen
    // zichtbaar in de devtools van de service worker.
    if (message.type === 'ELEMENT_PICKED') {
      console.log('[locator-picker] element gekozen', message.element);
    }
  });

  // Nieuwe pagina in de tab: het nieuwe content script start altijd uit.
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') void showState(tabId, false);
  });
});
