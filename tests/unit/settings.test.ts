import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  DEFAULT_TEST_ATTRIBUTE,
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
