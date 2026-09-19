import type { Deck } from '../../../pipeline/src/types.js';
import type { FactotumDb, StoredCard } from './schema.js';

export interface MergeResult {
  added: number;
  updated: number;
  tombstoned: number;
}

/**
 * JSON.stringify with object keys sorted so two objects with identical
 * content but different key insertion order compare equal. Array order is
 * left untouched since it can be semantically meaningful (e.g. `choices`).
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : val
  );
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
    } else if (prior.tombstoned || stableStringify(prior) !== stableStringify(next)) {
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
