// Pick-modus in de pagina. Houdt alle listeners bij zodat stop() niets achterlaat.
// Werkt ook in same-origin iframes (#23): de listeners staan in elk bereikbaar frame.

import { isElement, watchFrames } from '@/content/frames';

export type PickModeOptions = {
  // Wordt aangeroepen met het element onder de muis bij een linkerklik.
  onPick?: (element: Element) => void;
  // Wordt aangeroepen als de modus van binnenuit uitgaat (klik, Esc, pagina verlaten).
  onDeactivate?: () => void;
};

// Alle muis-events van een klik. Ze worden in de capture-fase op window
// tegengehouden, vóór de listeners van de pagina, zodat links, knoppen en
// formulieren niet reageren en frameworks die op mousedown werken ook niet.
const BLOCKED_EVENTS = [
  'pointerdown',
  'pointerup',
  'mousedown',
  'mouseup',
  'click',
  'auxclick',
  'dblclick',
] as const;

export class PickMode {
  private controller: AbortController | null = null;

  constructor(
    private readonly win: Window,
    private readonly options: PickModeOptions = {},
  ) {}

  get active(): boolean {
    return this.controller !== null;
  }

  start(): void {
    if (this.controller) return;
    this.controller = new AbortController();
    const { signal } = this.controller;

    watchFrames(
      this.win,
      (win) => {
        win.addEventListener(
          'keydown',
          (event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            this.deactivate();
          },
          { capture: true, signal },
        );
        for (const type of BLOCKED_EVENTS) {
          win.addEventListener(type, this.onMouseEvent, { capture: true, signal });
        }
      },
      signal,
    );

    // Navigeren of de pagina in de bfcache zetten: modus uit, zodat een
    // teruggezette pagina niet ongemerkt nog in pick-modus staat.
    this.win.addEventListener('pagehide', () => this.deactivate(), { signal });
  }

  stop(): void {
    this.controller?.abort();
    this.controller = null;
  }

  toggle(): boolean {
    if (this.active) this.stop();
    else this.start();
    return this.active;
  }

  private readonly onMouseEvent = (event: Event): void => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.type !== 'click' || (event as MouseEvent).button !== 0) return;

    // composedPath()[0] is het echte doel, ook binnen een open shadow root.
    // isElement in plaats van instanceof: een element uit een iframe komt uit
    // een andere realm.
    const [target] = event.composedPath();
    const element = isElement(target) ? target : event.target;
    if (!isElement(element)) return;

    this.options.onPick?.(element);
    this.deactivate();
  };

  private deactivate(): void {
    if (!this.active) return;
    this.stop();
    this.options.onDeactivate?.();
  }
}
