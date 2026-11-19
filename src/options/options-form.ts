// Formulier op de optiespagina: keuze van het testattribuut.

import {
  TEST_ATTRIBUTE_CHOICES,
  getTestAttribute,
  isTestAttributeChoice,
  setTestAttribute,
  watchTestAttribute,
} from '@/shared/settings';

const STATUS_MS = 2000;

/** Bouwt de keuzerondjes, zet de huidige keuze en bewaart elke wijziging direct. */
export async function initOptionsForm(container: HTMLElement, status: HTMLElement): Promise<() => void> {
  const current = await getTestAttribute();
  let timer: ReturnType<typeof setTimeout> | undefined;

  for (const choice of TEST_ATTRIBUTE_CHOICES) {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'testAttribute';
    input.value = choice;
    input.checked = choice === current;

    const code = document.createElement('code');
    code.textContent = choice;
    const label = document.createElement('label');
    label.append(input, code);
    container.append(label);
  }

  container.addEventListener('change', async (event) => {
    const value = (event.target as HTMLInputElement).value;
    if (!isTestAttributeChoice(value)) return;
    await setTestAttribute(value);
    status.textContent = `Opgeslagen: ${value}`;
    clearTimeout(timer);
    timer = setTimeout(() => (status.textContent = ''), STATUS_MS);
  });

  // Gewijzigd in een andere tab of op een ander apparaat: formulier bijwerken.
  return watchTestAttribute((value) => {
    const input = container.querySelector<HTMLInputElement>(`input[value="${value}"]`);
    if (input) input.checked = true;
  });
}
