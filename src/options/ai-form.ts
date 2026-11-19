// Optiespagina: AI-naamsuggesties aan/uit, API-sleutel en uitleg over welke
// gegevens de browser verlaten (issue #25).

import { AI_MODEL, NAMING_REQUEST_FIELDS } from '@/engine/page-object/ai-naming';
import { aiEnabledSetting, ANTHROPIC_ORIGIN, apiKeySetting } from '@/shared/ai-settings';

export type AiFormOptions = {
  /** Vraagt de host-permission voor api.anthropic.com; moet tijdens een klik gebeuren. */
  requestPermission: () => Promise<boolean>;
  removePermission: () => Promise<void>;
};

export const browserPermissions: AiFormOptions = {
  requestPermission: () => browser.permissions.request({ origins: [ANTHROPIC_ORIGIN] }),
  removePermission: async () => {
    await browser.permissions.remove({ origins: [ANTHROPIC_ORIGIN] });
  },
};

export async function initAiForm(
  container: HTMLElement,
  status: HTMLElement,
  options: AiFormOptions = browserPermissions,
): Promise<void> {
  container.innerHTML = `
    <label class="toggle"><input type="checkbox" id="ai-enabled" /> AI-naamsuggesties gebruiken</label>
    <div class="ai-details">
      <p class="hint">
        Op de exportpagina van het page object vraagt de knop <strong>AI-suggestie</strong> een veldnaam aan
        Claude (${AI_MODEL}) van Anthropic. Staat dit uit, of lukt het niet, dan krijg je een regelgebaseerde naam.
      </p>
      <p class="hint"><strong>Per suggestie gaan alleen deze gegevens naar api.anthropic.com:</strong></p>
      <ul class="hint" id="ai-fields"></ul>
      <p class="hint">
        Nooit: de URL, de HTML van de pagina, ingevulde formulierwaarden of andere elementen.
        Er gaat alleen iets weg als je zelf op <strong>AI-suggestie</strong> klikt.
      </p>
      <label for="ai-key">Anthropic API-sleutel</label><br />
      <input type="password" id="ai-key" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" aria-describedby="ai-key-hint" />
      <p class="hint" id="ai-key-hint">Alleen lokaal in deze browser bewaard, niet gesynchroniseerd. Gebruik op eigen kosten.</p>
    </div>
  `;
  const enabled = container.querySelector<HTMLInputElement>('#ai-enabled')!;
  const key = container.querySelector<HTMLInputElement>('#ai-key')!;
  const fields = container.querySelector<HTMLUListElement>('#ai-fields')!;
  for (const { label } of NAMING_REQUEST_FIELDS) {
    const li = document.createElement('li');
    li.textContent = label;
    fields.append(li);
  }

  enabled.checked = await aiEnabledSetting.getValue();
  key.value = await apiKeySetting.getValue();

  enabled.addEventListener('change', async () => {
    if (enabled.checked) {
      // De browser vraagt de gebruiker om toestemming voor api.anthropic.com.
      const granted = await options.requestPermission().catch(() => false);
      if (!granted) {
        enabled.checked = false;
        status.textContent = 'Geen toestemming voor api.anthropic.com; AI-suggesties blijven uit.';
        return;
      }
      await aiEnabledSetting.setValue(true);
      status.textContent = 'AI-suggesties staan aan.';
    } else {
      await aiEnabledSetting.setValue(false);
      await options.removePermission().catch(() => {});
      status.textContent = 'AI-suggesties staan uit.';
    }
  });

  key.addEventListener('change', async () => {
    await apiKeySetting.setValue(key.value.trim());
    status.textContent = key.value.trim() ? 'API-sleutel opgeslagen.' : 'API-sleutel verwijderd.';
  });
}
