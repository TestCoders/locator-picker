import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { installCollectionBackground } from './collection-background';
import {
  addToCollection,
  applyCollectionOp,
  clearCollection,
  getCollection,
  removeFromCollection,
  renameInCollection,
} from '@/shared/collection';

const item = (name: string, snippet: string) => ({ name, snippet, description: `<button> “${name}”`, pageTitle: 'Webshop' });

beforeEach(() => {
  fakeBrowser.reset();
  installCollectionBackground();
});

describe('verzameling', () => {
  it('verzamelt meerdere locators in storage.session', async () => {
    expect(await addToCollection(item('loginButton', "page.getByTestId('login')"))).toEqual({ added: true, count: 1 });
    expect(await addToCollection(item('emailInput', "page.locator('#email')"))).toEqual({ added: true, count: 2 });

    expect((await getCollection()).map((i) => i.name)).toEqual(['loginButton', 'emailInput']);
    const stored = await fakeBrowser.storage.session.get('pageObjectCollection');
    expect(stored.pageObjectCollection).toHaveLength(2);
  });

  it('slaat dezelfde snippet een tweede keer over', async () => {
    await addToCollection(item('loginButton', "page.getByTestId('login')"));
    expect(await addToCollection(item('anders', "page.getByTestId('login')"))).toEqual({ added: false, count: 1 });
  });

  it('geeft een dubbele naam een volgnummer', async () => {
    await addToCollection(item('saveButton', "page.getByTestId('a')"));
    await addToCollection(item('saveButton', "page.getByTestId('b')"));
    expect((await getCollection()).map((i) => i.name)).toEqual(['saveButton', 'saveButton2']);
  });

  it('hernoemt, verwijdert en leegt', async () => {
    await addToCollection(item('a', "page.getByTestId('a')"));
    await addToCollection(item('b', "page.getByTestId('b')"));
    const [first, second] = await getCollection();

    await renameInCollection(first!.id, 'eersteKnop');
    await removeFromCollection(second!.id);
    expect((await getCollection()).map((i) => i.name)).toEqual(['eersteKnop']);

    await clearCollection();
    expect(await getCollection()).toEqual([]);
  });

  it('verliest geen wijziging als hernoemen en toevoegen tegelijk gebeuren', async () => {
    await addToCollection(item('a', "page.getByTestId('a')"));
    const [first] = await getCollection();

    await Promise.all([
      renameInCollection(first!.id, 'hernoemd'),
      addToCollection(item('b', "page.getByTestId('b')")),
      applyCollectionOp({ op: 'add', item: item('c', "page.getByTestId('c')") }),
    ]);

    expect((await getCollection()).map((i) => i.name)).toEqual(['hernoemd', 'b', 'c']);
  });
});
