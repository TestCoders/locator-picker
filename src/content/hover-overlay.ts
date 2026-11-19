// Highlight en tooltip tijdens de pick-modus.
// Alles staat in een eigen shadow root met pointer-events: none, zodat de
// paginastijl niet verandert en de overlay zelf nooit het gekozen element is.

const MARGIN = 8;
const OFFSET = 12;

const STYLE = `
  :host { all: initial; }
  .box {
    position: fixed;
    box-sizing: border-box;
    border: 2px solid #1a73e8;
    background: rgba(26, 115, 232, 0.12);
    pointer-events: none;
    display: none;
  }
  .tip {
    position: fixed;
    max-width: 480px;
    padding: 4px 8px;
    border-radius: 4px;
    background: #202124;
    color: #fff;
    font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: pre-wrap;
    word-break: break-all;
    pointer-events: none;
    display: none;
  }
`;

export type LocatorPreview = (el: Element) => string;

export class HoverOverlay {
  private host: HTMLElement | null = null;
  private box!: HTMLDivElement;
  private tip!: HTMLDivElement;
  private current: Element | null = null;
  private mouse = { x: 0, y: 0 };
  private frame = 0;

  constructor(private readonly preview: LocatorPreview) {}

  get active(): boolean {
    return this.host !== null;
  }

  start(): void {
    if (this.host) return;

    this.host = document.createElement('locator-picker-overlay');
    const root = this.host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    this.box = document.createElement('div');
    this.box.className = 'box';
    this.tip = document.createElement('div');
    this.tip.className = 'tip';
    root.append(style, this.box, this.tip);
    document.documentElement.append(this.host);

    document.addEventListener('mousemove', this.onMouseMove, true);
    document.addEventListener('mouseleave', this.onMouseLeave, true);
    window.addEventListener('scroll', this.schedule, true);
    window.addEventListener('resize', this.schedule);
  }

  stop(): void {
    if (!this.host) return;

    document.removeEventListener('mousemove', this.onMouseMove, true);
    document.removeEventListener('mouseleave', this.onMouseLeave, true);
    window.removeEventListener('scroll', this.schedule, true);
    window.removeEventListener('resize', this.schedule);
    cancelAnimationFrame(this.frame);
    this.host.remove();
    this.host = null;
    this.current = null;
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    this.mouse = { x: event.clientX, y: event.clientY };
    const target = event.target;
    if (target instanceof Element && target !== this.host) {
      this.current = target;
    }
    this.schedule();
  };

  private readonly onMouseLeave = (event: Event): void => {
    // Alleen verbergen als de muis het hele document verlaat.
    if (event.target === document.documentElement) {
      this.current = null;
      this.schedule();
    }
  };

  private readonly schedule = (): void => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.render();
    });
  };

  private render(): void {
    const el = this.current;
    if (!this.host || !el || !el.isConnected) {
      this.box.style.display = 'none';
      this.tip.style.display = 'none';
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

    this.tip.textContent = this.preview(el);
    this.tip.style.display = 'block';
    this.placeTooltip();
  }

  // Zet de tooltip naast de muis en houdt hem binnen het zichtbare venster.
  private placeTooltip(): void {
    const { clientWidth: vw, clientHeight: vh } = document.documentElement;
    const { width, height } = this.tip.getBoundingClientRect();

    let left = this.mouse.x + OFFSET;
    let top = this.mouse.y + OFFSET;
    if (left + width > vw - MARGIN) left = this.mouse.x - OFFSET - width;
    if (top + height > vh - MARGIN) top = this.mouse.y - OFFSET - height;

    left = Math.max(MARGIN, Math.min(left, vw - width - MARGIN));
    top = Math.max(MARGIN, Math.min(top, vh - height - MARGIN));

    this.tip.style.left = `${left}px`;
    this.tip.style.top = `${top}px`;
  }
}
