// Optie op de optiespagina: gegenereerde class-namen herkennen (issue #26).

import { getDetectGeneratedClasses, setDetectGeneratedClasses, watchDetectGeneratedClasses } from '@/shared/settings';

const STATUS_MS = 2000;

/** Zet het vinkje, bewaart elke wijziging direct en volgt wijzigingen uit andere tabs. */
export async function initClassOption(checkbox: HTMLInputElement, status: HTMLElement): Promise<() => void> {
  checkbox.checked = await getDetectGeneratedClasses();
  let timer: ReturnType<typeof setTimeout> | undefined;

  checkbox.addEventListener('change', async () => {
    await setDetectGeneratedClasses(checkbox.checked);
    status.textContent = checkbox.checked ? 'Opgeslagen: gegenereerde classes vermijden' : 'Opgeslagen: alle classes gebruiken';
    clearTimeout(timer);
    timer = setTimeout(() => (status.textContent = ''), STATUS_MS);
  });

  return watchDetectGeneratedClasses((value) => {
    checkbox.checked = value;
  });
}
