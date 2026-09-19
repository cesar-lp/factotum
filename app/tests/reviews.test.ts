import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/db/schema.js';
import { recordReview, loadReviews, newCardsSeenToday, flagCard, exportBackup } from '../src/db/reviews.js';
import { initialState } from '../src/scheduler/fsrs.js';
import type { StoredCard } from '../src/db/schema.js';

const now = new Date('2026-09-18T09:00:00Z');
const card: StoredCard = {
  id: 'card-aaaa', format: 'mcq', topic: 'networking', category: 'networking', tags: [], prompt: 'q',
  choices: [{ text: 'a', correct: true }],
  source: { path: 'vault/a.md', block: 'card-aaaa' }, citations: [], tombstoned: false
};

beforeEach(() => { indexedDB = new IDBFactory(); });

describe('recordReview', () => {
  it('persists fsrs state and appends a log entry', async () => {
    const db = await openDb();
    const state = await recordReview(db, { card, outcome: 'correct', now, desiredRetention: 0.9, durationMs: 1500 });

    expect(state.reps).toBe(1);
    expect((await loadReviews(db)).get('card-aaaa')?.due).toBe(state.due);
    expect(await db.getAll('reviewLog')).toHaveLength(1);
  });

  it('counts a first-time review against the daily new-card allowance', async () => {
    const db = await openDb();
    expect(await newCardsSeenToday(db, now)).toBe(0);
    await recordReview(db, { card, outcome: 'correct', now, desiredRetention: 0.9, durationMs: 100 });
    expect(await newCardsSeenToday(db, now)).toBe(1);

    await recordReview(db, { card, outcome: 'wrong', now, desiredRetention: 0.9, durationMs: 100 });
    expect(await newCardsSeenToday(db, now)).toBe(1);
  });
});

describe('flagCard', () => {
  it('suspends and flags the card', async () => {
    const db = await openDb();
    await flagCard(db, 'card-aaaa', now);
    const state = (await loadReviews(db)).get('card-aaaa');
    expect(state?.suspended).toBe(true);
    expect(state?.flagged).toBe(true);
  });

  it('seeds a never-reviewed card from the injected now, not the wall clock', async () => {
    const db = await openDb();
    await flagCard(db, 'card-aaaa', now);
    const state = (await loadReviews(db)).get('card-aaaa');
    const expected = initialState('card-aaaa', now);
    expect(state?.due).toBe(expected.due);
    expect(state?.lastReview).toBe(expected.lastReview);
  });
});

describe('recordReview atomicity', () => {
  it('does not persist FSRS state when the reviewLog write fails', async () => {
    const db = await openDb();
    // A durationMs that cannot be structured-cloned (a function) makes the
    // reviewLog.add() call inside recordReview throw a genuine IndexedDB
    // DataCloneError from fake-indexeddb -- not a simulated/mocked failure.
    const uncloneable = (() => {}) as unknown as number;

    await expect(
      recordReview(db, { card, outcome: 'correct', now, desiredRetention: 0.9, durationMs: uncloneable })
    ).rejects.toThrow();

    expect((await loadReviews(db)).get('card-aaaa')).toBeUndefined();
    expect(await db.getAll('reviewLog')).toHaveLength(0);
    expect(await newCardsSeenToday(db, now)).toBe(0);
  });
});

describe('exportBackup', () => {
  it('produces json containing reviews and the log', async () => {
    const db = await openDb();
    await recordReview(db, { card, outcome: 'correct', now, desiredRetention: 0.9, durationMs: 100 });
    const parsed = JSON.parse(await exportBackup(db));
    expect(parsed.version).toBe(1);
    expect(parsed.reviews).toHaveLength(1);
    expect(parsed.reviewLog).toHaveLength(1);
  });
});
