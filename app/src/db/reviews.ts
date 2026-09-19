import type { FactotumDb, ReviewState, StoredCard } from './schema.js';
import { applyRating, initialState, ratingFor, type Outcome } from '../scheduler/fsrs.js';
import { dayKey } from '../scheduler/queue.js';

export async function loadReviews(db: FactotumDb): Promise<Map<string, ReviewState>> {
  const all = await db.getAll('reviews');
  return new Map(all.map((state) => [state.cardId, state]));
}

function newCardsKey(now: Date): string {
  return `newCards:${dayKey(now)}`;
}

export async function newCardsSeenToday(db: FactotumDb, now: Date): Promise<number> {
  const value = await db.get('meta', newCardsKey(now));
  return typeof value === 'number' ? value : 0;
}

export interface RecordReviewArgs {
  card: StoredCard;
  outcome: Outcome;
  now: Date;
  desiredRetention: number;
  durationMs: number;
}

/**
 * Persists an FSRS review, its audit-log entry, and (on a card's first-ever
 * review) the daily new-card counter as a single atomic IndexedDB
 * transaction. All three stores commit together or none do — a failure
 * partway through (e.g. an unclonable value reaching `reviewLog.add`) rolls
 * every write in this call back, rather than leaving a schedule advanced
 * with no audit trail. `prior` and the new-card counter are read from
 * *inside* this same transaction so a concurrent recordReview can't read a
 * stale counter and lose an increment.
 */
export async function recordReview(db: FactotumDb, args: RecordReviewArgs): Promise<ReviewState> {
  const { card, outcome, now, desiredRetention, durationMs } = args;
  const rating = ratingFor(card.format, outcome);

  const tx = db.transaction(['reviews', 'reviewLog', 'meta'], 'readwrite');
  const reviewsStore = tx.objectStore('reviews');
  const reviewLogStore = tx.objectStore('reviewLog');
  const metaStore = tx.objectStore('meta');

  const writes: Promise<unknown>[] = [];

  const abortAndRethrow = async (err: unknown): Promise<never> => {
    // Defuse any request promises already issued so an abort-triggered
    // rejection on them doesn't surface as an unhandled rejection.
    for (const write of writes) write.catch(() => undefined);
    try {
      tx.abort();
    } catch {
      // Transaction may already be finishing/aborted (e.g. a request error
      // auto-aborts it); nothing further to do.
    }
    await tx.done.catch(() => undefined);
    throw err;
  };

  try {
    const prior = await reviewsStore.get(card.id);
    const isFirstReview = prior === undefined;
    const next = applyRating(prior ?? initialState(card.id, now), rating, now, desiredRetention);
    const key = newCardsKey(now);
    const seenRaw = isFirstReview ? await metaStore.get(key) : undefined;
    const seenCount = typeof seenRaw === 'number' ? seenRaw : 0;

    writes.push(reviewsStore.put(next));
    writes.push(reviewLogStore.add({ cardId: card.id, ts: now.getTime(), rating, durationMs }));
    if (isFirstReview) {
      writes.push(metaStore.put(seenCount + 1, key));
    }

    await Promise.all(writes);
    await tx.done;
    return next;
  } catch (err) {
    return abortAndRethrow(err);
  }
}

export async function flagCard(db: FactotumDb, cardId: string, now: Date): Promise<void> {
  const prior = await db.get('reviews', cardId);
  const base = prior ?? initialState(cardId, now);
  await db.put('reviews', { ...base, suspended: true, flagged: true });
}

export async function exportBackup(db: FactotumDb): Promise<string> {
  const [reviews, reviewLog, metaKeys] = await Promise.all([
    db.getAll('reviews'),
    db.getAll('reviewLog'),
    db.getAllKeys('meta')
  ]);

  const meta: Record<string, unknown> = {};
  for (const key of metaKeys) {
    meta[String(key)] = await db.get('meta', key);
  }

  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), reviews, reviewLog, meta }, null, 2);
}
