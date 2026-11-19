// Pick-modus in de pagina. Houdt alle listeners bij zodat stop() niets achterlaat.

export type PickModeOptions = {
  // Wordt aangeroepen als de modus van binnenuit uitgaat (Esc, pagina verlaten).
  onDeactivate?: () => void;
};

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

    this.win.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        this.deactivate();
      },
      { capture: true, signal },
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

  private deactivate(): void {
    if (!this.active) return;
    this.stop();
    this.options.onDeactivate?.();
  }
}
