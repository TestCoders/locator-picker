// Verzamelde locators voor een page object (issue #21).
//
// In browser.storage.session: blijft bestaan zolang de browser open is, over
// navigaties en tabs heen, en verdwijnt bij afsluiten.
//
// Alle wijzigingen lopen via de background, die ze één voor één uitvoert.
// Twee contexten die tegelijk lezen-wijzigen-schrijven (bijv. hernoemen op de
// exportpagina terwijl een andere tab iets toevoegt) zouden elkaars wijziging
// anders overschrijven.

import { storage } from 'wxt/utils/storage';
import { uniqueNames } from '@/engine/page-object/naming';

export type CollectedLocator = {
  id: string;
  /** Veldnaam in het page object; aanpasbaar vóór export. */
  name: string;
  /** Playwright-snippet, bijv. `page.getByTestId('login')`. */
  snippet: string;
  /** Korte omschrijving voor de lijst, bijv. `<button> “Inloggen”`. */
  description: string;
  pageTitle: string;
};

export type AddResult = { added: boolean; count: number };

export type CollectionOp =
  | { op: 'add'; item: Omit<CollectedLocator, 'id'> }
  | { op: 'rename'; id: string; name: string }
  | { op: 'remove'; id: string }
  | { op: 'clear' };

export type CollectionMessage = { type: 'COLLECTION_OP'; op: CollectionOp };

/** Alleen extensiepagina's en de background lezen dit direct; content scripts gaan via berichten. */
export const collectionItem = storage.defineItem<CollectedLocator[]>('session:pageObjectCollection', {
  fallback: [],
});

export async function getCollection(): Promise<CollectedLocator[]> {
  return collectionItem.getValue();
}

// --- Aanroepen vanuit content script en exportpagina -------------------------

export async function addToCollection(item: Omit<CollectedLocator, 'id'>): Promise<AddResult> {
  return (await send({ op: 'add', item })) as AddResult;
}

export async function renameInCollection(id: string, name: string): Promise<void> {
  await send({ op: 'rename', id, name });
}

export async function removeFromCollection(id: string): Promise<void> {
  await send({ op: 'remove', id });
}

export async function clearCollection(): Promise<void> {
  await send({ op: 'clear' });
}

function send(op: CollectionOp): Promise<unknown> {
  const message: CollectionMessage = { type: 'COLLECTION_OP', op };
  return browser.runtime.sendMessage(message);
}

// --- Uitvoering in de background ---------------------------------------------

export function isCollectionMessage(value: unknown): value is CollectionMessage {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'COLLECTION_OP';
}

/**
 * onMessage-listener voor de background. Antwoordt via sendResponse en geeft
 * true terug, zodat het kanaal open blijft tot het antwoord er is.
 */
export function handleCollectionMessage(message: unknown, sendResponse: (response: unknown) => void): true | undefined {
  if (!isCollectionMessage(message)) return undefined;
  void applyCollectionOp(message.op).then(sendResponse, () => sendResponse(null));
  return true;
}

let queue: Promise<unknown> = Promise.resolve();

/** Voert een wijziging uit, na alle eerdere. Alleen in de background aanroepen. */
export function applyCollectionOp(op: CollectionOp): Promise<AddResult | null> {
  const result = queue.then(() => apply(op));
  queue = result.catch(() => {});
  return result;
}

async function apply(op: CollectionOp): Promise<AddResult | null> {
  const items = await getCollection();
  switch (op.op) {
    case 'add': {
      // Dezelfde snippet twee keer heeft geen zin; een dubbele naam krijgt een volgnummer.
      if (items.some((existing) => existing.snippet === op.item.snippet)) return { added: false, count: items.length };
      const name = uniqueNames([...items.map((i) => i.name), op.item.name]).at(-1)!;
      const next = [...items, { ...op.item, id: crypto.randomUUID(), name }];
      await collectionItem.setValue(next);
      return { added: true, count: next.length };
    }
    case 'rename':
      await collectionItem.setValue(items.map((item) => (item.id === op.id ? { ...item, name: op.name } : item)));
      return null;
    case 'remove':
      await collectionItem.setValue(items.filter((item) => item.id !== op.id));
      return null;
    case 'clear':
      await collectionItem.setValue([]);
      return null;
  }
}
