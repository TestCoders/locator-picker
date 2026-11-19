// Resultaatpaneel na een klik: CSS, XPath en snippet, elk met een kopieerknop.
// Staat in de pagina zelf, in een eigen shadow root, zodat het direct na de
// klik verschijnt en de paginastijl er niet op inwerkt.

import type { LocatorStrategy } from '@/engine/locator-engine';
import type { PanelResult, ResultEntry, ResultFormat } from './result-data';

const CONFIRM_MS = 1500;

const STRATEGY_LABELS: Record<LocatorStrategy, string> = {
  'test-attribute': 'testattribuut',
  id: 'id',
  'role-name': 'rol + naam',
  xpath: 'structurele XPath',
};

const STABILITY_ICONS = { green: '●', orange: '▲', red: '■' } as const;
const STABILITY_LABELS = { green: 'Stabiel', orange: 'Matig stabiel', red: 'Instabiel' } as const;

const STYLE = `
  :host { all: initial; }
  .panel {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 2147483647;
    box-sizing: border-box;
    width: min(440px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
    overflow: auto;
    padding: 12px 14px;
    border-radius: 8px;
    background: #fff;
    color: #202124;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
    font: 13px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
  }
  header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  h2 { flex: 1; margin: 0; font-size: 14px; font-weight: 600; }
  .element { margin: 0 0 4px; color: #5f6368; overflow-wrap: anywhere; }
  .context { margin: 0 0 4px; color: #5f6368; font-size: 12px; overflow-wrap: anywhere; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 0 0 10px; color: #5f6368; }
  .stability[data-level='green'] { color: #188038; }
  .stability[data-level='orange'] { color: #b06000; }
  .stability[data-level='red'] { color: #c5221f; }
  .warning { margin: 0 0 10px; padding: 6px 8px; border-radius: 4px; background: #fef7e0; color: #b06000; }
  .row { display: grid; grid-template-columns: 1fr auto; gap: 4px 8px; padding: 8px 0; border-top: 1px solid #e0e0e0; }
  .label { font-weight: 600; }
  .count { color: #5f6368; font-weight: normal; }
  .count.warn { color: #c5221f; }
  code {
    grid-column: 1;
    display: block;
    max-height: 6em;
    overflow: auto;
    padding: 4px 6px;
    border-radius: 4px;
    background: #f1f3f4;
    font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .copy { grid-column: 2; grid-row: 1 / span 2; align-self: center; min-width: 96px; }
  button {
    padding: 6px 10px;
    border: 1px solid #1a73e8;
    border-radius: 4px;
    background: #1a73e8;
    color: #fff;
    font: inherit;
    cursor: pointer;
  }
  button:hover { background: #1765cc; }
  button:focus-visible { outline: 3px solid #fbbc04; outline-offset: 2px; }
  button.copied { border-color: #188038; background: #188038; }
  button.failed { border-color: #c5221f; background: #c5221f; }
  .collect-row { display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0; }
  button.open-collection { border-color: #1a73e8; background: transparent; color: #1a73e8; }
  button.open-collection:hover { background: #e8f0fe; }
  button.close { padding: 2px 8px; border-color: transparent; background: transparent; color: #5f6368; font-size: 16px; }
  button.close:hover { background: #f1f3f4; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  @media (prefers-color-scheme: dark) {
    .panel { background: #202124; color: #e8eaed; }
    .element, .context, .meta, .count { color: #9aa0a6; }
    code { background: #303134; }
    .row { border-color: #3c4043; }
    .warning { background: #3c3118; color: #fdd663; }
    button.close { color: #9aa0a6; }
    button.close:hover { background: #303134; }
  }
`;

/** Acties voor het page object (#21); zonder deze opties toont het paneel de knoppen niet. */
export type CollectActions = {
  /** Voegt het gekozen element toe; geeft terug of het nieuw was en hoeveel er nu verzameld zijn. */
  collect: () => Promise<{ added: boolean; count: number }>;
  /** Opent de exportpagina. */
  openCollection: () => void;
};

export type ResultPanelOptions = {
  /** Kopieert tekst naar het clipboard. */
  copy: (text: string) => Promise<void>;
  /** Na een geslaagde kopie; `ms` is de tijd sinds `show()` kreeg als `pickedAt`. */
  onCopied?: (format: ResultFormat, ms: number) => void;
  now?: () => number;
  /** Alleen voor tests: 'open' maakt de inhoud bereikbaar. */
  shadowMode?: ShadowRootMode;
};

export class ResultPanel {
  private host: HTMLElement | null = null;
  private root: ShadowRoot | null = null;
  private status: HTMLElement | null = null;
  private pickedAt = 0;
  private previousFocus: Element | null = null;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(private readonly options: ResultPanelOptions) {}

  get open(): boolean {
    return this.host !== null;
  }

  /** Alleen voor tests met shadowMode 'open'. */
  get shadowRoot(): ShadowRoot | null {
    return this.root;
  }

  show(result: PanelResult, pickedAt: number = this.now(), actions?: CollectActions): void {
    this.close();
    this.pickedAt = pickedAt;
    this.previousFocus = document.activeElement;

    this.host = document.createElement('locator-picker-panel');
    this.root = this.host.attachShadow({ mode: this.options.shadowMode ?? 'closed' });

    const style = document.createElement('style');
    style.textContent = STYLE;
    this.root.append(style, this.render(result, actions));
    document.documentElement.append(this.host);

    // Toetsenbord: direct op de eerste kopieerknop, Tab naar de volgende.
    this.root.querySelector<HTMLButtonElement>('button.copy')?.focus();
  }

  close(): void {
    if (!this.host) return;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();

    const hadFocus = this.root?.activeElement != null;
    this.host.remove();
    this.host = null;
    this.root = null;
    this.status = null;
    if (hadFocus && this.previousFocus instanceof HTMLElement) this.previousFocus.focus();
    this.previousFocus = null;
  }

  private render(result: PanelResult, actions?: CollectActions): HTMLElement {
    const panel = el('section', { class: 'panel', role: 'dialog', 'aria-label': 'Locator Picker: resultaat' });
    panel.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      this.close();
    });

    const close = el('button', { class: 'close', type: 'button', 'aria-label': 'Paneel sluiten' }, '×');
    close.addEventListener('click', () => this.close());
    panel.append(el('header', {}, el('h2', {}, 'Locator Picker'), close));

    const description = result.text ? `<${result.tagName}> “${result.text}”` : `<${result.tagName}>`;
    panel.append(el('p', { class: 'element' }, description));
    if (result.contextLabel) {
      // CSS en XPath gelden binnen deze context; de Playwright-snippet bevat hem al.
      panel.append(el('p', { class: 'context' }, `In ${result.contextLabel}`));
    }
    if (result.inShadowRoot) {
      panel.append(el('p', { class: 'context note' }, 'Geen XPath: XPath werkt niet binnen een shadow root.'));
    }

    const meta = el('p', { class: 'meta' });
    meta.append(el('span', {}, `Strategie: ${STRATEGY_LABELS[result.strategy]}`));
    if (result.stability) {
      const { level, explanation } = result.stability;
      // Kleur is niet het enige signaal: ook een vorm en tekst.
      meta.append(
        el(
          'span',
          { class: 'stability', 'data-level': level },
          `${STABILITY_ICONS[level]} ${STABILITY_LABELS[level]}: ${explanation}`,
        ),
      );
    }
    panel.append(meta);

    if (result.warning) {
      // Tekst en icoon, niet alleen kleur; role=note zodat een screenreader het voorleest.
      panel.append(
        el('p', { class: 'warning', role: 'note' }, `⚠ Testhook ontbreekt: ${result.warning.message}`),
      );
    }

    for (const entry of result.entries) panel.append(this.renderEntry(entry));
    if (actions) panel.append(this.renderCollect(actions));

    this.status = el('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    panel.append(this.status);
    return panel;
  }

  private renderCollect(actions: CollectActions): HTMLElement {
    const add = el('button', { class: 'collect', type: 'button' }, '+ Page object');
    const open = el('button', { class: 'open-collection', type: 'button' }, 'Exporteren');
    add.addEventListener('click', async () => {
      try {
        const { added, count } = await actions.collect();
        const text = added ? `Toegevoegd (${count})` : `Staat al in de lijst (${count})`;
        add.textContent = text;
        if (this.status) this.status.textContent = `Page object: ${text.toLowerCase()}`;
      } catch {
        add.textContent = 'Toevoegen mislukt';
      }
    });
    open.addEventListener('click', () => actions.openCollection());
    return el('div', { class: 'collect-row' }, add, open);
  }

  private renderEntry(entry: ResultEntry): HTMLElement {
    const unique = entry.matches === 1;
    const countText =
      entry.matches === 0 ? '⚠ geen match' : unique ? '1 match' : `⚠ ${entry.matches} matches`;

    const id = `value-${entry.format}`;
    const button = el(
      'button',
      { class: 'copy', type: 'button', 'aria-describedby': id, 'data-format': entry.format },
      'Kopieer',
    );
    button.setAttribute('aria-label', `Kopieer ${entry.label}`);
    button.addEventListener('click', () => void this.copy(entry, button));

    return el(
      'div',
      { class: 'row' },
      el(
        'span',
        { class: 'label' },
        `${entry.label} `,
        el('span', { class: unique ? 'count' : 'count warn' }, `(${countText})`),
      ),
      button,
      el('code', { id }, entry.value),
    );
  }

  private async copy(entry: ResultEntry, button: HTMLButtonElement): Promise<void> {
    let text: string;
    try {
      await this.options.copy(entry.value);
      text = 'Gekopieerd ✓';
      button.className = 'copy copied';
      this.options.onCopied?.(entry.format, this.now() - this.pickedAt);
    } catch {
      text = 'Mislukt';
      button.className = 'copy failed';
    }
    if (!this.open) return;

    button.textContent = text;
    if (this.status) this.status.textContent = `${entry.label}: ${text.toLowerCase()}`;

    const timer = setTimeout(() => {
      this.timers.delete(timer);
      button.textContent = 'Kopieer';
      button.className = 'copy';
    }, CONFIRM_MS);
    this.timers.add(timer);
  }

  private now(): number {
    return (this.options.now ?? (() => performance.now()))();
  }
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
