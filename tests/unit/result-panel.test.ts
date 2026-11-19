// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PanelResult } from '@/content/result-data';
import { ResultPanel, type ResultPanelOptions } from '@/content/result-panel';

const RESULT: PanelResult = {
  tagName: 'button',
  text: 'Opslaan',
  strategy: 'test-attribute',
  entries: [
    { format: 'css', label: 'CSS', value: '[data-testid="save"]', matches: 1 },
    { format: 'xpath', label: 'XPath', value: '//button[@data-testid="save"]', matches: 1 },
    { format: 'playwright', label: 'Playwright', value: "page.getByTestId('save')", matches: 1 },
  ],
  durationMs: 3,
};

let panel: ResultPanel;

function createPanel(options: Partial<ResultPanelOptions> = {}): ResultPanel {
  panel = new ResultPanel({ copy: vi.fn().mockResolvedValue(undefined), shadowMode: 'open', ...options });
  return panel;
}

function root(): ShadowRoot {
  const r = panel.shadowRoot;
  if (!r) throw new Error('paneel is niet open');
  return r;
}

const copyButton = (format: string) => root().querySelector<HTMLButtonElement>(`button[data-format="${format}"]`)!;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<button id="page-button">Pagina</button>';
});

afterEach(() => {
  panel?.close();
  vi.useRealTimers();
});

describe('ResultPanel: testhook-waarschuwing', () => {
  const warning = {
    attribute: 'data-testid',
    value: 'totaal',
    suggestion: 'data-testid="totaal"',
    message: 'Dit element heeft geen testattribuut, id of toegankelijke naam; voeg data-testid="totaal" toe.',
  };

  it('toont de waarschuwing met het voorgestelde attribuut', () => {
    createPanel().show({ ...RESULT, warning });
    const note = root().querySelector('.warning');
    expect(note?.getAttribute('role')).toBe('note');
    expect(note?.textContent).toContain('Testhook ontbreekt');
    expect(note?.textContent).toContain('data-testid="totaal"');
  });

  it('toont niets zonder waarschuwing', () => {
    createPanel().show(RESULT);
    expect(root().querySelector('.warning')).toBeNull();
  });
});

describe('ResultPanel: gegenereerde classes', () => {
  it('meldt overgeslagen gegenereerde classes', () => {
    createPanel().show({ ...RESULT, ignoredClasses: ['css-1q2w3e', 'x7Yz2'] });
    expect(root().querySelector('.note')?.textContent).toBe('Gegenereerde classes overgeslagen: css-1q2w3e, x7Yz2');
  });

  it('toont niets zonder gegenereerde classes', () => {
    createPanel().show({ ...RESULT, ignoredClasses: [] });
    expect(root().querySelector('.note')).toBeNull();
  });
});

describe('ResultPanel: inhoud', () => {
  it('toont CSS, XPath en snippet, elk met een eigen kopieerknop', () => {
    createPanel().show(RESULT);

    const codes = Array.from(root().querySelectorAll('code')).map((c) => c.textContent);
    expect(codes).toEqual(RESULT.entries.map((e) => e.value));
    const labels = Array.from(root().querySelectorAll('button.copy')).map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual(['Kopieer CSS', 'Kopieer XPath', 'Kopieer Playwright']);
  });

  it('toont het aantal matches en waarschuwt bij meer of nul', () => {
    createPanel().show({
      ...RESULT,
      entries: [
        { ...RESULT.entries[0]!, matches: 1 },
        { ...RESULT.entries[1]!, matches: 3 },
        { ...RESULT.entries[2]!, matches: 0 },
      ],
    });

    const counts = Array.from(root().querySelectorAll('.count')).map((c) => [c.textContent, c.classList.contains('warn')]);
    expect(counts).toEqual([
      ['(1 match)', false],
      ['(⚠ 3 matches)', true],
      ['(⚠ geen match)', true],
    ]);
  });

  it('toont de strategie en, indien aanwezig, de stabiliteit met tekst en icoon', () => {
    createPanel().show({ ...RESULT, stability: { level: 'red', explanation: 'Alleen een positiepad.' } });

    expect(root().querySelector('.meta')!.textContent).toContain('Strategie: testattribuut');
    const stability = root().querySelector('.stability')!;
    expect(stability.getAttribute('data-level')).toBe('red');
    expect(stability.textContent).toBe('■ Instabiel: Alleen een positiepad.');
  });

  it('één paneel tegelijk', () => {
    createPanel();
    panel.show(RESULT);
    panel.show(RESULT);
    expect(document.querySelectorAll('locator-picker-panel')).toHaveLength(1);
  });
});

describe('ResultPanel: kopiëren', () => {
  it('kopieert de waarde en toont een korte bevestiging', async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    createPanel({ copy }).show(RESULT);

    copyButton('playwright').click();
    await vi.waitFor(() => expect(copyButton('playwright').textContent).toBe('Gekopieerd ✓'));

    expect(copy).toHaveBeenCalledExactlyOnceWith("page.getByTestId('save')");
    expect(root().querySelector('[role="status"]')!.textContent).toBe('Playwright: gekopieerd ✓');

    vi.advanceTimersByTime(1500);
    expect(copyButton('playwright').textContent).toBe('Kopieer');
  });

  it('meldt als kopiëren mislukt', async () => {
    createPanel({ copy: vi.fn().mockRejectedValue(new Error('geweigerd')) }).show(RESULT);

    copyButton('css').click();
    await vi.waitFor(() => expect(copyButton('css').textContent).toBe('Mislukt'));
  });

  it('meet de tijd van klik tot clipboard', async () => {
    const onCopied = vi.fn();
    let t = 1000;
    createPanel({ onCopied, now: () => t }).show(RESULT, 200);

    t = 2400;
    copyButton('xpath').click();
    await vi.waitFor(() => expect(onCopied).toHaveBeenCalledExactlyOnceWith('xpath', 2200));
  });
});

describe('ResultPanel: toetsenbord', () => {
  it('zet de focus op de eerste kopieerknop', () => {
    createPanel().show(RESULT);
    expect(root().activeElement).toBe(copyButton('css'));
  });

  it('kopieerknoppen zijn echte knoppen (Enter en Space werken native)', () => {
    createPanel().show(RESULT);
    for (const button of root().querySelectorAll('button')) {
      expect(button.type).toBe('button');
      expect(button.tabIndex).toBe(0);
    }
  });

  it('Esc sluit het paneel en geeft de focus terug', () => {
    const pageButton = document.getElementById('page-button')!;
    pageButton.focus();
    createPanel().show(RESULT);

    copyButton('css').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));

    expect(panel.open).toBe(false);
    expect(document.querySelector('locator-picker-panel')).toBeNull();
    expect(document.activeElement).toBe(pageButton);
  });

  it('de sluitknop werkt', () => {
    createPanel().show(RESULT);
    root().querySelector<HTMLButtonElement>('button.close')!.click();
    expect(panel.open).toBe(false);
  });
});

describe('ResultPanel: page object', () => {
  it('toont de knoppen alleen met acties', () => {
    createPanel().show(RESULT);
    expect(root().querySelector('button.collect')).toBeNull();
  });

  it('voegt toe en meldt het aantal; een tweede keer staat al in de lijst', async () => {
    const collect = vi
      .fn()
      .mockResolvedValueOnce({ added: true, count: 3 })
      .mockResolvedValueOnce({ added: false, count: 3 });
    createPanel().show(RESULT, 0, { collect, openCollection: vi.fn() });
    const button = root().querySelector<HTMLButtonElement>('button.collect')!;

    button.click();
    await vi.waitFor(() => expect(button.textContent).toBe('Toegevoegd (3)'));
    expect(root().querySelector('[role="status"]')!.textContent).toBe('Page object: toegevoegd (3)');

    button.click();
    await vi.waitFor(() => expect(button.textContent).toBe('Staat al in de lijst (3)'));
  });

  it('opent de exportpagina', () => {
    const openCollection = vi.fn();
    createPanel().show(RESULT, 0, { collect: vi.fn(), openCollection });
    root().querySelector<HTMLButtonElement>('button.open-collection')!.click();
    expect(openCollection).toHaveBeenCalledOnce();
  });
});
