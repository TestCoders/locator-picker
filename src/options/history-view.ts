// Historie op de optiespagina: per domein de gekozen locators bekijken,
// kopiëren en wissen (issue #24).

import { copyText } from '@/content/clipboard';
import { clearDomain, clearHistory, watchHistory, type History, type HistoryEntry } from '@/shared/history';

const STATUS_MS = 2000;

const COPY_FORMATS = [
  ['css', 'CSS'],
  ['xpath', 'XPath'],
  ['playwright', 'Playwright'],
] as const;

/** Toont de historie en houdt hem bij. Geeft een functie om te stoppen. */
export function initHistoryView(container: HTMLElement, status: HTMLElement): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const say = (text: string) => {
    status.textContent = text;
    clearTimeout(timer);
    timer = setTimeout(() => (status.textContent = ''), STATUS_MS);
  };

  const render = (history: History) => {
    container.replaceChildren();
    const domains = Object.keys(history)
      .filter((domain) => (history[domain]?.length ?? 0) > 0)
      .sort();

    if (domains.length === 0) {
      container.append(el('p', { class: 'hint' }, 'Nog geen locators gekozen.'));
      return;
    }

    const clearAll = el('button', { type: 'button', class: 'danger' }, 'Alles wissen');
    clearAll.addEventListener('click', async () => {
      await clearHistory();
      say('Historie gewist');
    });
    container.append(clearAll);

    for (const domain of domains) container.append(renderDomain(domain, history[domain] ?? []));
  };

  const renderDomain = (domain: string, entries: HistoryEntry[]): HTMLElement => {
    const clear = el('button', { type: 'button', class: 'danger', 'aria-label': `Wis historie van ${domain}` }, 'Wissen');
    clear.addEventListener('click', async () => {
      await clearDomain(domain);
      say(`Historie van ${domain} gewist`);
    });

    const list = el('ul', { class: 'entries' });
    for (const entry of entries) list.append(renderEntry(entry));

    return el(
      'section',
      { class: 'domain', 'aria-label': domain },
      el('h3', {}, domain, ' ', el('span', { class: 'count' }, `(${entries.length})`)),
      clear,
      list,
    );
  };

  const renderEntry = (entry: HistoryEntry): HTMLElement => {
    const description = entry.text ? `<${entry.tagName}> “${entry.text}”` : `<${entry.tagName}>`;
    const buttons = COPY_FORMATS.map(([format, label]) => {
      const button = el('button', { type: 'button', 'data-format': format, 'aria-label': `Kopieer ${label}` }, label);
      button.addEventListener('click', async () => {
        try {
          await copyText(entry[format]);
          say(`${label} gekopieerd`);
        } catch {
          say('Kopiëren mislukt');
        }
      });
      return button;
    });

    return el(
      'li',
      {},
      el('div', { class: 'what' }, description),
      el('code', {}, entry.css),
      el('div', { class: 'actions' }, ...buttons),
    );
  };

  return watchHistory(render);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}
