import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/db/schema.js';
import { mergeDeck } from '../src/db/deck.js';
import type { Deck } from '../../pipeline/src/types.js';

const deck = (cards: Deck['cards']): Deck => ({ generatedAt: '2026-09-18T00:00:00.000Z', cards });

const card = (id: string, prompt: string) => ({
  id, format: 'cloze' as const, category: 'networking', tags: [],
  prompt, answer: 'x', source: { path: 'vault/a.md', block: id }, citations: []
});

beforeEach(async () => {
  indexedDB = new IDBFactory();
});

describe('mergeDeck', () => {
  it('adds new cards', async () => {
    const db = await openDb();
    const result = await mergeDeck(db, deck([card('card-aaaa', 'first')]));
    expect(result.added).toBe(1);
    expect((await db.get('cards', 'card-aaaa'))?.prompt).toBe('first');
  });

  it('updates content in place and preserves review state', async () => {
    const db = await openDb();
    await mergeDeck(db, deck([card('card-aaaa', 'first')]));
    await db.put('reviews', {
      cardId: 'card-aaaa', due: 123, stability: 4.2, difficulty: 5, elapsedDays: 1,
      scheduledDays: 3, reps: 7, lapses: 1, state: 2, lastReview: 100,
      suspended: false, flagged: false
    });

    await mergeDeck(db, deck([card('card-aaaa', 'corrected')]));

    expect((await db.get('cards', 'card-aaaa'))?.prompt).toBe('corrected');
    const review = await db.get('reviews', 'card-aaaa');
    expect(review?.stability).toBe(4.2);
    expect(review?.reps).toBe(7);
  });

  it('tombstones cards missing from the new deck without deleting them', async () => {
    const db = await openDb();
    await mergeDeck(db, deck([card('card-aaaa', 'first'), card('card-bbbb', 'second')]));
    const result = await mergeDeck(db, deck([card('card-aaaa', 'first')]));

    expect(result.tombstoned).toBe(1);
    expect((await db.get('cards', 'card-bbbb'))?.tombstoned).toBe(true);
  });

  it('revives a tombstoned card when its id returns', async () => {
    const db = await openDb();
    await mergeDeck(db, deck([card('card-aaaa', 'first')]));
    await mergeDeck(db, deck([]));
    await mergeDeck(db, deck([card('card-aaaa', 'first')]));
    expect((await db.get('cards', 'card-aaaa'))?.tombstoned).toBe(false);
  });
});
