import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { NAMING_REQUEST_FIELDS } from '@/engine/page-object/ai-naming';
import { initAiForm, type AiFormOptions } from '@/options/ai-form';
import { aiEnabledSetting, apiKeySetting } from '@/shared/ai-settings';

let container: HTMLElement;
let status: HTMLElement;
let options: AiFormOptions & { requestPermission: ReturnType<typeof vi.fn>; removePermission: ReturnType<typeof vi.fn> };

const checkbox = () => container.querySelector<HTMLInputElement>('#ai-enabled')!;
const keyInput = () => container.querySelector<HTMLInputElement>('#ai-key')!;

function toggle(checked: boolean): void {
  checkbox().checked = checked;
  checkbox().dispatchEvent(new Event('change'));
}

beforeEach(() => {
  fakeBrowser.reset();
  document.body.innerHTML = '<div id="ai"></div><p id="status"></p>';
  container = document.getElementById('ai')!;
  status = document.getElementById('status')!;
  options = { requestPermission: vi.fn().mockResolvedValue(true), removePermission: vi.fn().mockResolvedValue(undefined) };
});

describe('optiespagina: AI-naamsuggesties', () => {
  it('staat standaard uit en legt uit welke gegevens de browser verlaten', async () => {
    await initAiForm(container, status, options);

    expect(checkbox().checked).toBe(false);
    const listed = Array.from(container.querySelectorAll('#ai-fields li')).map((li) => li.textContent);
    expect(listed).toEqual(NAMING_REQUEST_FIELDS.map((f) => f.label));
    expect(container.textContent).toContain('Nooit: de URL, de HTML van de pagina, ingevulde formulierwaarden');
    expect(keyInput().type).toBe('password');
  });

  it('aanzetten vraagt toestemming voor api.anthropic.com en bewaart de keuze', async () => {
    await initAiForm(container, status, options);

    toggle(true);

    await vi.waitFor(() => expect(status.textContent).toBe('AI-suggesties staan aan.'));
    expect(options.requestPermission).toHaveBeenCalledOnce();
    expect(await aiEnabledSetting.getValue()).toBe(true);
  });

  it('zonder toestemming blijft het uit', async () => {
    options.requestPermission.mockResolvedValue(false);
    await initAiForm(container, status, options);

    toggle(true);

    await vi.waitFor(() => expect(status.textContent).toMatch(/Geen toestemming/));
    expect(checkbox().checked).toBe(false);
    expect(await aiEnabledSetting.getValue()).toBe(false);
  });

  it('uitzetten trekt de toestemming in', async () => {
    await aiEnabledSetting.setValue(true);
    await initAiForm(container, status, options);
    expect(checkbox().checked).toBe(true);

    toggle(false);

    await vi.waitFor(() => expect(status.textContent).toBe('AI-suggesties staan uit.'));
    expect(options.removePermission).toHaveBeenCalledOnce();
    expect(await aiEnabledSetting.getValue()).toBe(false);
  });

  it('bewaart de API-sleutel lokaal', async () => {
    await initAiForm(container, status, options);

    keyInput().value = ' sk-ant-123 ';
    keyInput().dispatchEvent(new Event('change'));

    await vi.waitFor(() => expect(status.textContent).toBe('API-sleutel opgeslagen.'));
    expect(await apiKeySetting.getValue()).toBe('sk-ant-123');
    expect(await fakeBrowser.storage.local.get('anthropicApiKey')).toEqual({ anthropicApiKey: 'sk-ant-123' });
    expect(await fakeBrowser.storage.sync.get('anthropicApiKey')).toEqual({});
  });
});
