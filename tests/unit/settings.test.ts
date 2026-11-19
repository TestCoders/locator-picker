import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  DEFAULT_DETECT_GENERATED_CLASSES,
  DEFAULT_TEST_ATTRIBUTE,
  getDetectGeneratedClasses,
  setDetectGeneratedClasses,
  watchDetectGeneratedClasses,
  getTestAttribute,
  setTestAttribute,
  watchTestAttribute,
} from '@/shared/settings';

beforeEach(() => {
  fakeBrowser.reset();
});

describe('testattribuut-instelling', () => {
  it('is standaard data-testid', async () => {
    expect(DEFAULT_TEST_ATTRIBUTE).toBe('data-testid');
    expect(await getTestAttribute()).toBe('data-testid');
  });

  it('bewaart de keuze in storage.sync', async () => {
    await setTestAttribute('data-cy');

    expect(await getTestAttribute()).toBe('data-cy');
    expect(await fakeBrowser.storage.sync.get('testAttribute')).toEqual({ testAttribute: 'data-cy' });
  });

  it('valt terug op de standaard bij een onbekende waarde', async () => {
    await fakeBrowser.storage.sync.set({ testAttribute: 'data-onzin' });
    expect(await getTestAttribute()).toBe('data-testid');
  });

  it('meldt de huidige keuze en elke wijziging', async () => {
    await setTestAttribute('data-qa');
    const callback = vi.fn();

    const unwatch = watchTestAttribute(callback);
    await vi.waitFor(() => expect(callback).toHaveBeenLastCalledWith('data-qa'));

    await setTestAttribute('data-cy');
    await vi.waitFor(() => expect(callback).toHaveBeenLastCalledWith('data-cy'));

    unwatch();
    await setTestAttribute('data-testid');
    expect(callback).toHaveBeenLastCalledWith('data-cy');
  });

  it('een wijziging vóór de eerste uitlezing wordt niet overschreven door de oude waarde', async () => {
    const callback = vi.fn();

    const unwatch = watchTestAttribute(callback);
    await setTestAttribute('data-qa');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(callback).toHaveBeenLastCalledWith('data-qa');
    unwatch();
  });
});

describe('instelling gegenereerde classes', () => {
  it('staat standaard aan', async () => {
    expect(DEFAULT_DETECT_GENERATED_CLASSES).toBe(true);
    expect(await getDetectGeneratedClasses()).toBe(true);
  });

  it('bewaart uit in storage.sync', async () => {
    await setDetectGeneratedClasses(false);
    expect(await getDetectGeneratedClasses()).toBe(false);
    expect(await fakeBrowser.storage.sync.get('detectGeneratedClasses')).toEqual({ detectGeneratedClasses: false });
  });

  it('valt terug op de standaard bij een beschadigde waarde', async () => {
    await fakeBrowser.storage.sync.set({ detectGeneratedClasses: 'misschien' });
    expect(await getDetectGeneratedClasses()).toBe(true);
  });

  it('geeft de huidige waarde en elke wijziging', async () => {
    const seen: boolean[] = [];
    const stop = watchDetectGeneratedClasses((v) => seen.push(v));
    await vi.waitFor(() => expect(seen).toEqual([true]));
    await setDetectGeneratedClasses(false);
    await vi.waitFor(() => expect(seen.at(-1)).toBe(false));
    stop();
  });
});
