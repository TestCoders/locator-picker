// Issue #59: het content script importeert src/shared/collection.ts, maar mag
// storage.session niet lezen of schrijven. Alleen al het laden van de module
// mag de opslag dus niet raken.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

describe('collection-module in het content script', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.resetModules();
  });

  it('laden en addToCollection raken storage.session niet aan', async () => {
    const session = fakeBrowser.storage.session;
    const get = vi.spyOn(session, 'get');
    const set = vi.spyOn(session, 'set');
    // De fake-browser typt sendMessage als Promise<void>; het antwoord doet er hier niet toe.
    const sendMessage = vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockResolvedValue(undefined);

    const { addToCollection } = await import('@/shared/collection');
    // WXT start zijn leesactie asynchroon; geef die de kans.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(get).not.toHaveBeenCalled();

    await addToCollection({ name: 'login', snippet: "page.getByTestId('login')", description: '<button>', pageTitle: 'T' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sendMessage).toHaveBeenCalledOnce();
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it('de background leest de opslag pas bij het eerste gebruik', async () => {
    const get = vi.spyOn(fakeBrowser.storage.session, 'get');
    const { getCollection } = await import('@/shared/collection');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(get).not.toHaveBeenCalled();

    expect(await getCollection()).toEqual([]);
    expect(get).toHaveBeenCalled();
  });
});
