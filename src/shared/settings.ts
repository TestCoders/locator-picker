// Instellingen van de extensie, bewaard in browser.storage.sync. Sync blijft
// bewaard na een herstart van de browser en gaat mee naar andere apparaten als
// de gebruiker synchronisatie aan heeft; anders werkt het als lokale opslag.

import { storage } from 'wxt/utils/storage';

/** Testattributen waaruit de optiespagina laat kiezen (issue #16). */
export const TEST_ATTRIBUTE_CHOICES = ['data-testid', 'data-cy', 'data-qa'] as const;

export type TestAttributeChoice = (typeof TEST_ATTRIBUTE_CHOICES)[number];

export const DEFAULT_TEST_ATTRIBUTE: TestAttributeChoice = 'data-testid';

export const testAttributeSetting = storage.defineItem<string>('sync:testAttribute', {
  fallback: DEFAULT_TEST_ATTRIBUTE,
});

export function isTestAttributeChoice(value: unknown): value is TestAttributeChoice {
  return TEST_ATTRIBUTE_CHOICES.includes(value as TestAttributeChoice);
}

/** Een onbekende of beschadigde waarde in de opslag valt terug op de standaard. */
export function toTestAttributeChoice(value: unknown): TestAttributeChoice {
  return isTestAttributeChoice(value) ? value : DEFAULT_TEST_ATTRIBUTE;
}

export async function getTestAttribute(): Promise<TestAttributeChoice> {
  return toTestAttributeChoice(await testAttributeSetting.getValue());
}

export async function setTestAttribute(value: TestAttributeChoice): Promise<void> {
  await testAttributeSetting.setValue(value);
}

/**
 * Roept `callback` aan met de huidige keuze en daarna bij elke wijziging,
 * ook vanuit een andere tab of de optiespagina. Geeft een functie om te stoppen.
 */
export function watchTestAttribute(callback: (value: TestAttributeChoice) => void): () => void {
  let stopped = false;
  // Een wijziging die binnenkomt vóór de eerste uitlezing is nieuwer; de
  // beginwaarde mag die dan niet meer overschrijven.
  let changed = false;
  void getTestAttribute().then((value) => {
    if (!stopped && !changed) callback(value);
  });
  const unwatch = testAttributeSetting.watch((value) => {
    changed = true;
    callback(toTestAttributeChoice(value));
  });
  return () => {
    stopped = true;
    unwatch();
  };
}
