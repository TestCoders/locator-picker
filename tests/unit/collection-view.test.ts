import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { installCollectionBackground } from './collection-background';
import { CollectionView, type CollectionViewOptions } from '@/collection/collection-view';
import { addToCollection, getCollection } from '@/shared/collection';

let app: HTMLElement;
let stop: (() => void) | undefined;
let options: CollectionViewOptions;

const q = <T extends Element>(selector: string) => app.querySelector<T>(selector)!;
const nameInputs = () => Array.from(app.querySelectorAll<HTMLInputElement>('ol.fields input'));
const output = () => q('#output').textContent;

function type(input: HTMLInputElement, value: string): void {
  input.focus();
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function seed(): Promise<void> {
  await addToCollection({ name: 'loginButton', snippet: "page.getByTestId('login')", description: '<button> “Inloggen”', pageTitle: 'Inloggen' });
  await addToCollection({ name: 'emailInput', snippet: "page.locator('#email')", description: '<input>', pageTitle: 'Inloggen' });
}

async function startView(): Promise<CollectionView> {
  const view = new CollectionView(app, options);
  stop = await view.start();
  return view;
}

beforeEach(() => {
  fakeBrowser.reset();
  installCollectionBackground();
  document.body.innerHTML = '<main id="app"></main>';
  app = document.getElementById('app')!;
  options = { copy: vi.fn().mockResolvedValue(undefined), download: vi.fn(), confirm: vi.fn(() => true) };
});

afterEach(() => {
  stop?.();
  stop = undefined;
});

describe('exportpagina', () => {
  it('toont de verzamelde velden en een klasse met de voorgestelde namen', async () => {
    await seed();
    await startView();

    expect(nameInputs().map((i) => i.value)).toEqual(['loginButton', 'emailInput']);
    expect(q<HTMLInputElement>('#class-name').value).toBe('InloggenPage');
    expect(output()).toContain('export class InloggenPage {');
    expect(output()).toContain("    this.loginButton = page.getByTestId('login');");
    expect(output()).toContain("    this.emailInput = page.locator('#email');");
  });

  it('veldnamen en klassenaam zijn aanpasbaar vóór export, en de naam wordt bewaard', async () => {
    await seed();
    await startView();

    type(nameInputs()[0]!, 'submitButton');
    type(q<HTMLInputElement>('#class-name'), 'LoginPage');

    expect(output()).toContain('export class LoginPage {');
    expect(output()).toContain('readonly submitButton: Locator;');
    await vi.waitFor(async () => expect((await getCollection())[0]!.name).toBe('submitButton'));
  });

  it('toont een fout bij een ongeldige naam en blokkeert de export', async () => {
    await seed();
    await startView();

    type(nameInputs()[1]!, 'e-mail');

    const input = nameInputs()[1]!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(input.getAttribute('aria-describedby')!)!.textContent).toMatch(/Alleen letters/);
    expect(output()).toBe('// Los eerst de fouten hierboven op.');
    expect(q<HTMLButtonElement>('#copy').disabled).toBe(true);
    expect(q<HTMLButtonElement>('#download').disabled).toBe(true);
  });

  it('meldt dubbele namen', async () => {
    await seed();
    await startView();

    type(nameInputs()[1]!, 'loginButton');

    expect(app.querySelectorAll('.error')[2]!.textContent).toBe("'loginButton' komt al eerder voor.");
  });

  it('kopieert en downloadt de klasse', async () => {
    await seed();
    await startView();

    q<HTMLButtonElement>('#copy').click();
    await vi.waitFor(() => expect(q('.status').textContent).toBe('Gekopieerd ✓'));
    expect(options.copy).toHaveBeenCalledWith(output());

    q<HTMLButtonElement>('#download').click();
    expect(options.download).toHaveBeenCalledWith('InloggenPage.ts', output());
  });

  it('volgt toevoegingen uit een andere tab zonder te herladen', async () => {
    await startView();
    expect(q<HTMLElement>('#empty').hidden).toBe(false);
    expect(q<HTMLButtonElement>('#copy').disabled).toBe(true);

    await seed();

    await vi.waitFor(() => expect(nameInputs()).toHaveLength(2));
    expect(q<HTMLElement>('#empty').hidden).toBe(true);
  });

  it('overschrijft een veld niet terwijl de gebruiker typt', async () => {
    await seed();
    await startView();
    const input = nameInputs()[0]!;
    type(input, 'halfGety');

    await addToCollection({ name: 'derde', snippet: "page.getByTestId('c')", description: '<a>', pageTitle: 'Inloggen' });

    await vi.waitFor(() => expect(nameInputs()).toHaveLength(3));
    expect(input.value).toBe('halfGety');
  });

  it('verwijdert een veld en maakt de lijst leeg na bevestiging', async () => {
    await seed();
    await startView();

    app.querySelector<HTMLButtonElement>('button.remove')!.click();
    await vi.waitFor(() => expect(nameInputs().map((i) => i.value)).toEqual(['emailInput']));

    q<HTMLButtonElement>('#clear').click();
    expect(options.confirm).toHaveBeenCalledWith('Alle 1 verzamelde locators verwijderen?');
    await vi.waitFor(() => expect(nameInputs()).toHaveLength(0));
  });
});

describe('exportpagina: AI-suggestie (#25)', () => {
  const hints = { tagName: 'button', role: 'button', name: 'Inloggen', pageTitle: 'Inloggen' };
  let setAi: (enabled: boolean) => void;

  async function seedWithHints(): Promise<void> {
    await addToCollection({ name: 'loginButton', snippet: "page.getByTestId('login')", description: '<button> “Inloggen”', pageTitle: 'Inloggen', hints });
    await addToCollection({ name: 'oud', snippet: "page.locator('#oud')", description: '<p>', pageTitle: 'Inloggen' });
  }

  beforeEach(() => {
    options.suggestName = vi.fn().mockResolvedValue({ name: 'submitLoginButton', source: 'ai' });
    options.watchAiEnabled = (callback) => {
      setAi = callback;
      callback(false);
      return () => {};
    };
  });

  const suggestButtons = () => Array.from(app.querySelectorAll<HTMLButtonElement>('button.suggest'));

  it('toont de knop alleen als AI aan staat', async () => {
    await seedWithHints();
    await startView();
    expect(suggestButtons().every((b) => b.hidden)).toBe(true);

    setAi(true);

    expect(suggestButtons().map((b) => b.hidden)).toEqual([false, false]);
    // Items zonder gegevens voor een suggestie (van vóór #25) kunnen niet.
    expect(suggestButtons().map((b) => b.disabled)).toEqual([false, true]);
  });

  it('vult de suggestie in; die blijft aanpasbaar en wordt bewaard', async () => {
    await seedWithHints();
    await startView();
    setAi(true);

    suggestButtons()[0]!.click();

    await vi.waitFor(() => expect(nameInputs()[0]!.value).toBe('submitLoginButton'));
    expect(options.suggestName).toHaveBeenCalledWith(hints);
    expect(q('.status').textContent).toBe('AI-suggestie: submitLoginButton');
    expect(output()).toContain('readonly submitLoginButton: Locator;');
    await vi.waitFor(async () => expect((await getCollection())[0]!.name).toBe('submitLoginButton'));

    type(nameInputs()[0]!, 'loginKnop');
    expect(output()).toContain('readonly loginKnop: Locator;');
  });

  it('meldt het als er een regelgebaseerde naam terugkomt', async () => {
    options.suggestName = vi.fn().mockResolvedValue({ name: 'inloggenButton', source: 'rules', reason: 'AI niet bereikbaar' });
    await seedWithHints();
    await startView();
    setAi(true);

    suggestButtons()[0]!.click();

    await vi.waitFor(() => expect(q('.status').textContent).toBe('AI niet bereikbaar; regelgebaseerde naam: inloggenButton'));
    expect(nameInputs()[0]!.value).toBe('inloggenButton');
  });
});
