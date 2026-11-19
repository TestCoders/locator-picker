import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { initOptionsForm } from '@/options/options-form';
import { getTestAttribute, setTestAttribute } from '@/shared/settings';

let container: HTMLElement;
let status: HTMLElement;
let stop: (() => void) | undefined;

const radios = () => Array.from(container.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
const checked = () => radios().find((r) => r.checked)?.value;

function choose(value: string): void {
  const radio = radios().find((r) => r.value === value)!;
  radio.checked = true;
  radio.dispatchEvent(new Event('change', { bubbles: true }));
}

beforeEach(() => {
  fakeBrowser.reset();
  document.body.innerHTML = '<div id="choices"></div><p id="status"></p>';
  container = document.getElementById('choices')!;
  status = document.getElementById('status')!;
});

afterEach(() => {
  stop?.();
  stop = undefined;
});

describe('optiespagina', () => {
  it('biedt data-testid, data-cy en data-qa, met data-testid als standaard', async () => {
    stop = await initOptionsForm(container, status);

    expect(radios().map((r) => r.value)).toEqual(['data-testid', 'data-cy', 'data-qa']);
    expect(checked()).toBe('data-testid');
    // Elk rondje heeft een label met de naam.
    expect(radios().map((r) => r.closest('label')?.textContent)).toEqual(['data-testid', 'data-cy', 'data-qa']);
  });

  it('toont de bewaarde keuze', async () => {
    await setTestAttribute('data-qa');
    stop = await initOptionsForm(container, status);
    expect(checked()).toBe('data-qa');
  });

  it('bewaart een wijziging direct en bevestigt die', async () => {
    stop = await initOptionsForm(container, status);

    choose('data-cy');

    await vi.waitFor(() => expect(status.textContent).toBe('Opgeslagen: data-cy'));
    expect(await getTestAttribute()).toBe('data-cy');
  });

  it('volgt een wijziging van elders', async () => {
    stop = await initOptionsForm(container, status);

    await setTestAttribute('data-qa');

    await vi.waitFor(() => expect(checked()).toBe('data-qa'));
  });
});
