// Blijvende highlight van het gekozen element. Net als de hover-overlay in een
// eigen shadow root met pointer-events: none, zodat de pagina er geen last van heeft.

const STYLE = `
  :host { all: initial; }
  .box {
    position: fixed;
    box-sizing: border-box;
    border: 2px solid #188038;
    background: rgba(24, 128, 56, 0.12);
    pointer-events: none;
  }
`;

export class SelectionHighlight {
  private host: HTMLElement | null = null;
  private box!: HTMLDivElement;
  private element: Element | null = null;
  private controller: AbortController | null = null;
  private frame = 0;

  get selected(): Element | null {
    return this.element;
  }

  show(element: Element): void {
    this.clear();
    this.element = element;

    this.host = document.createElement('locator-picker-selection');
    const root = this.host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    this.box = document.createElement('div');
    this.box.className = 'box';
    root.append(style, this.box);
    document.documentElement.append(this.host);

    this.controller = new AbortController();
    const { signal } = this.controller;
    window.addEventListener('scroll', this.schedule, { capture: true, signal });
    window.addEventListener('resize', this.schedule, { signal });

    this.render();
  }

  clear(): void {
    this.controller?.abort();
    this.controller = null;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.host?.remove();
    this.host = null;
    this.element = null;
  }

  private readonly schedule = (): void => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.render();
    });
  };

  private render(): void {
    const el = this.element;
    if (!this.host || !el) return;
    if (!el.isConnected) {
      this.box.style.display = 'none';
      return;
    }

    const rect = el.getBoundingClientRect();
    Object.assign(this.box.style, {
      display: 'block',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }
}
