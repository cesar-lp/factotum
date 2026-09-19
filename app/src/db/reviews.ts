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

export async function recordReview(db: FactotumDb, args: RecordReviewArgs): Promise<ReviewState> {
  const { card, outcome, now, desiredRetention, durationMs } = args;
  const prior = await db.get('reviews', card.id);
  const isFirstReview = prior === undefined;

  const rating = ratingFor(card.format, outcome);
  const next = applyRating(prior ?? initialState(card.id, now), rating, now, desiredRetention);

  await db.put('reviews', next);
  await db.add('reviewLog', { cardId: card.id, ts: now.getTime(), rating, durationMs });

  if (isFirstReview) {
    const seen = await newCardsSeenToday(db, now);
    await db.put('meta', seen + 1, newCardsKey(now));
  }

  return next;
}

export async function flagCard(db: FactotumDb, cardId: string): Promise<void> {
  const prior = await db.get('reviews', cardId);
  const base = prior ?? initialState(cardId, new Date());
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
