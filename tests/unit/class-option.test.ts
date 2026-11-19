import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { initClassOption } from '@/options/class-option';
import { getDetectGeneratedClasses, setDetectGeneratedClasses } from '@/shared/settings';

let checkbox: HTMLInputElement;
let status: HTMLElement;
let stop: (() => void) | undefined;

beforeEach(() => {
  fakeBrowser.reset();
  document.body.innerHTML = '<input type="checkbox" id="c"><p id="s"></p>';
  checkbox = document.getElementById('c') as HTMLInputElement;
  status = document.getElementById('s')!;
});

afterEach(() => {
  stop?.();
  stop = undefined;
});

describe('optie gegenereerde classes', () => {
  it('staat standaard aan', async () => {
    stop = await initClassOption(checkbox, status);
    expect(checkbox.checked).toBe(true);
  });

  it('toont een bewaarde uit-stand', async () => {
    await setDetectGeneratedClasses(false);
    stop = await initClassOption(checkbox, status);
    expect(checkbox.checked).toBe(false);
  });

  it('bewaart een wijziging direct en bevestigt die', async () => {
    stop = await initClassOption(checkbox, status);
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));

    await vi.waitFor(() => expect(status.textContent).toContain('alle classes gebruiken'));
    expect(await getDetectGeneratedClasses()).toBe(false);
  });

  it('volgt een wijziging van elders', async () => {
    stop = await initClassOption(checkbox, status);
    await setDetectGeneratedClasses(false);
    await vi.waitFor(() => expect(checkbox.checked).toBe(false));
  });
});
