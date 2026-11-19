import type { Message, PingResponse } from '@/shared/messages';

function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

async function pingBackground(): Promise<void> {
  const message: Message = { type: 'PING', from: 'popup' };
  const response = (await browser.runtime.sendMessage(message)) as PingResponse | undefined;
  setText('background-status', response ? `Background: ${response.type}` : 'Background: geen antwoord');
}

async function pingContentScript(): Promise<void> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) {
    setText('content-status', 'Content script: geen actieve tab');
    return;
  }
  try {
    const message: Message = { type: 'PING', from: 'popup' };
    const response = (await browser.tabs.sendMessage(tab.id, message)) as PingResponse | undefined;
    setText('content-status', response ? `Content script: ${response.type}` : 'Content script: geen antwoord');
  } catch {
    // Op chrome://- en store-pagina's draait geen content script.
    setText('content-status', 'Content script: niet beschikbaar op deze pagina');
  }
}

void pingBackground();
void pingContentScript();
