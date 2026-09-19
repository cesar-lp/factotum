import type { Deck } from '../../../pipeline/src/types.js';
import type { FactotumDb, StoredCard } from './schema.js';

export interface MergeResult {
  added: number;
  updated: number;
  tombstoned: number;
}

export async function mergeDeck(db: FactotumDb, deck: Deck): Promise<MergeResult> {
  const tx = db.transaction('cards', 'readwrite');
  const store = tx.objectStore('cards');
  const existing = new Map<string, StoredCard>();
  for (const card of await store.getAll()) existing.set(card.id, card);

  const incoming = new Set<string>();
  const result: MergeResult = { added: 0, updated: 0, tombstoned: 0 };

  for (const card of deck.cards) {
    incoming.add(card.id);
    const prior = existing.get(card.id);
    const next: StoredCard = { ...card, tombstoned: false };
    await store.put(next);
    if (!prior) {
      result.added += 1;
    } else if (prior.tombstoned || JSON.stringify(prior) !== JSON.stringify(next)) {
      result.updated += 1;
    }
  }

  for (const [id, card] of existing) {
    if (incoming.has(id) || card.tombstoned) continue;
    await store.put({ ...card, tombstoned: true });
    result.tombstoned += 1;
  }

  await tx.done;
  return result;
}
