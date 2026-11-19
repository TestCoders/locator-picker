// Exportpagina voor het page object (issue #21): lijst van verzamelde
// locators met aanpasbare veldnamen, klassenaam en een live voorbeeld.

import { suggestClassName } from '@/engine/page-object/naming';
import {
  generatePlaywrightPageObject,
  validatePageObject,
  type PageObjectError,
} from '@/engine/page-object/playwright';
import {
  clearCollection,
  collectionStorage,
  getCollection,
  removeFromCollection,
  renameInCollection,
  type CollectedLocator,
} from '@/shared/collection';

export type CollectionViewOptions = {
  copy: (text: string) => Promise<void>;
  download: (fileName: string, content: string) => void;
  confirm: (question: string) => boolean;
};

type Row = { item: CollectedLocator; li: HTMLLIElement; input: HTMLInputElement; error: HTMLElement };

const STATUS_MS = 2000;

export class CollectionView {
  private items: CollectedLocator[] = [];
  private readonly rows = new Map<string, Row>();
  /** null zolang de gebruiker de klassenaam niet heeft aangepast: dan volgt hij de paginatitel. */
  private customClassName: string | null = null;
  private statusTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly classInput: HTMLInputElement;
  private readonly classError: HTMLElement;
  private readonly list: HTMLOListElement;
  private readonly empty: HTMLElement;
  private readonly output: HTMLElement;
  private readonly copyButton: HTMLButtonElement;
  private readonly downloadButton: HTMLButtonElement;
  private readonly clearButton: HTMLButtonElement;
  private readonly status: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly options: CollectionViewOptions,
  ) {
    root.innerHTML = `
      <h1>Page object</h1>
      <p class="hint">Locators die je in het resultaatpaneel met <strong>+ Page object</strong> hebt toegevoegd. Pas de namen aan en exporteer een Playwright-klasse in TypeScript.</p>
      <div class="class-name">
        <label for="class-name">Klassenaam</label><br />
        <input type="text" id="class-name" spellcheck="false" autocomplete="off" aria-describedby="class-name-error" />
        <p class="error" id="class-name-error" role="alert"></p>
      </div>
      <h2 id="fields-heading">Velden</h2>
      <p class="hint" id="empty">Nog niets verzameld. Kies een element met de pick-modus en klik in het resultaatpaneel op <strong>+ Page object</strong>.</p>
      <ol class="fields" aria-labelledby="fields-heading"></ol>
      <h2 id="output-heading">Voorbeeld</h2>
      <pre aria-labelledby="output-heading"><code id="output"></code></pre>
      <div class="actions">
        <button type="button" id="copy">Kopieer</button>
        <button type="button" id="download" class="secondary">Download .ts</button>
        <button type="button" id="clear" class="secondary">Lijst leegmaken</button>
      </div>
      <p class="status" role="status" aria-live="polite"></p>
    `;
    this.classInput = root.querySelector('#class-name')!;
    this.classError = root.querySelector('#class-name-error')!;
    this.list = root.querySelector('ol.fields')!;
    this.empty = root.querySelector('#empty')!;
    this.output = root.querySelector('#output')!;
    this.copyButton = root.querySelector('#copy')!;
    this.downloadButton = root.querySelector('#download')!;
    this.clearButton = root.querySelector('#clear')!;
    this.status = root.querySelector('.status')!;

    this.classInput.addEventListener('input', () => {
      this.customClassName = this.classInput.value;
      this.update();
    });
    this.copyButton.addEventListener('click', () => void this.copy());
    this.downloadButton.addEventListener('click', () => {
      const code = this.code();
      if (code) this.options.download(`${this.className()}.ts`, code);
    });
    this.clearButton.addEventListener('click', () => void this.clear());
  }

  /** Laadt de verzameling en volgt wijzigingen uit andere tabs. Geeft een functie om te stoppen. */
  async start(): Promise<() => void> {
    const unwatch = collectionStorage().watch((items) => this.setItems(items ?? []));
    this.setItems(await getCollection());
    return unwatch;
  }

  private setItems(items: CollectedLocator[]): void {
    this.items = items;
    const ids = new Set(items.map((item) => item.id));

    for (const [id, row] of this.rows) {
      if (!ids.has(id)) {
        row.li.remove();
        this.rows.delete(id);
      }
    }
    for (const item of items) {
      const row = this.rows.get(item.id) ?? this.createRow(item);
      row.item = item;
      // Niet overschrijven terwijl de gebruiker in dit veld typt.
      if (document.activeElement !== row.input) row.input.value = item.name;
      this.list.append(row.li); // houdt de volgorde gelijk aan de verzameling
    }
    this.update();
  }

  private createRow(item: CollectedLocator): Row {
    const li = document.createElement('li');
    li.className = 'field';
    const inputId = `field-${item.id}`;
    const errorId = `${inputId}-error`;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = inputId;
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.setAttribute('aria-label', `Veldnaam voor ${item.description}`);
    input.setAttribute('aria-describedby', errorId);
    input.addEventListener('input', () => {
      void renameInCollection(item.id, input.value);
      this.update();
    });

    const description = document.createElement('span');
    description.className = 'description';
    description.textContent = item.description;

    const code = document.createElement('code');
    code.textContent = item.snippet;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.textContent = 'Verwijder';
    remove.setAttribute('aria-label', `Verwijder ${item.description}`);
    remove.addEventListener('click', () => void removeFromCollection(item.id));

    const error = document.createElement('p');
    error.className = 'error';
    error.id = errorId;

    const nameCell = document.createElement('div');
    nameCell.className = 'name';
    nameCell.append(input, error);
    li.append(nameCell, description, code, remove);

    const row: Row = { item, li, input, error };
    this.rows.set(item.id, row);
    return row;
  }

  /** Klassenaam: aangepast door de gebruiker, anders afgeleid van de eerste paginatitel. */
  private className(): string {
    return this.customClassName ?? suggestClassName(this.items[0]?.pageTitle ?? '');
  }

  private pageObject() {
    return {
      className: this.className(),
      fields: this.items.map((item) => ({
        name: this.rows.get(item.id)?.input.value ?? item.name,
        snippet: item.snippet,
      })),
    };
  }

  private errors(): PageObjectError[] {
    return validatePageObject(this.pageObject());
  }

  private code(): string | null {
    if (this.items.length === 0 || this.errors().length > 0) return null;
    return generatePlaywrightPageObject(this.pageObject());
  }

  private update(): void {
    if (this.customClassName === null) this.classInput.value = this.className();

    const errors = this.errors();
    const classError = errors.find((e) => e.field === 'className');
    this.classError.textContent = classError?.message ?? '';
    this.classInput.setAttribute('aria-invalid', String(!!classError));

    this.items.forEach((item, index) => {
      const row = this.rows.get(item.id);
      if (!row) return;
      const error = errors.find((e) => e.field === index);
      row.error.textContent = error?.message ?? '';
      row.input.setAttribute('aria-invalid', String(!!error));
    });

    const empty = this.items.length === 0;
    this.empty.hidden = !empty;
    const code = this.code();
    this.output.textContent =
      code ?? (empty ? '// Nog geen velden.' : '// Los eerst de fouten hierboven op.');
    this.copyButton.disabled = code === null;
    this.downloadButton.disabled = code === null;
    this.clearButton.disabled = empty;
  }

  private async copy(): Promise<void> {
    const code = this.code();
    if (!code) return;
    try {
      await this.options.copy(code);
      this.showStatus('Gekopieerd ✓');
    } catch {
      this.showStatus('Kopiëren mislukt');
    }
  }

  private async clear(): Promise<void> {
    if (!this.options.confirm(`Alle ${this.items.length} verzamelde locators verwijderen?`)) return;
    await clearCollection();
  }

  private showStatus(text: string): void {
    this.status.textContent = text;
    clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => (this.status.textContent = ''), STATUS_MS);
  }
}
