import { describe, it, expect, beforeEach } from 'vitest';
import { shouldRequeue, requeueIndex, REQUEUE_GAP, MAX_REQUEUES_PER_CARD } from '../src/ui/review.js';
import { buildSession, buildExtension } from '../src/scheduler/queue.js';
import { recordReview, newCardsSeenToday } from '../src/db/reviews.js';
import { initialState } from '../src/scheduler/fsrs.js';
import { openDb } from '../src/db/schema.js';
import type { ReviewState, StoredCard } from '../src/db/schema.js';

const now = new Date('2026-09-18T09:00:00Z');

const card = (id: string): StoredCard => ({
  id,
  format: 'qa',
  topic: 'net',
  category: 'net',
  tags: [],
  prompt: id,
  answer: 'a',
  source: { path: 'vault/a.md', block: id },
  citations: [],
  tombstoned: false
});

// State numbering per ts-fsrs: New=0, Learning=1, Review=2, Relearning=3.
const learningState: ReviewState = { ...initialState('x', now), state: 1 };
const graduatedState: ReviewState = { ...initialState('x', now), state: 2 };
const relearningState: ReviewState = { ...initialState('x', now), state: 3 };

/**
 * Mirrors exactly what `submit()` in review.ts does after `recordReview`
 * returns: decide via shouldRequeue/requeueIndex whether and where to
 * splice the card back into the session array. Kept here (rather than
 * exported from review.ts, which also owns DOM rendering that this test
 * suite -- running under vitest's `node` environment, no jsdom -- cannot
 * exercise) so the re-queue *policy* is tested against the exact same
 * exported primitives startReview uses, without needing a DOM.
 */
function simulateSubmit(
  session: StoredCard[],
  index: number,
  card: StoredCard,
  next: ReviewState,
  requeueCounts: Map<string, number>
): void {
  const prior = requeueCounts.get(card.id) ?? 0;
  if (shouldRequeue(next, prior)) {
    requeueCounts.set(card.id, prior + 1);
    session.splice(requeueIndex(index, session.length), 0, card);
  }
}

describe('shouldRequeue', () => {
  it('re-queues a card still in Learning (Again/Hard/Good)', () => {
    expect(shouldRequeue(learningState, 0)).toBe(true);
  });

  it('re-queues a card back in Relearning (lapsed after graduating)', () => {
    expect(shouldRequeue(relearningState, 0)).toBe(true);
  });

  it('does not re-queue a graduated card (Easy, or Learning -> Review)', () => {
    expect(shouldRequeue(graduatedState, 0)).toBe(false);
  });

  it('does not re-queue a suspended card even if still nominally "learning"', () => {
    expect(shouldRequeue({ ...learningState, suspended: true }, 0)).toBe(false);
  });

  it('stops re-queueing once MAX_REQUEUES_PER_CARD is reached', () => {
    expect(shouldRequeue(learningState, MAX_REQUEUES_PER_CARD - 1)).toBe(true);
    expect(shouldRequeue(learningState, MAX_REQUEUES_PER_CARD)).toBe(false);
    expect(shouldRequeue(learningState, MAX_REQUEUES_PER_CARD + 5)).toBe(false);
  });
});

describe('requeueIndex', () => {
  it('inserts REQUEUE_GAP cards ahead when enough cards remain', () => {
    expect(requeueIndex(0, 10)).toBe(0 + 1 + REQUEUE_GAP);
  });

  it('clamps to the end of the session when fewer than the gap remain', () => {
    expect(requeueIndex(8, 10)).toBe(10); // only 1 card left after index 8
    expect(requeueIndex(9, 10)).toBe(10); // nothing left -- appended immediately
  });
});

describe('session-level re-queue behaviour (simulated, mirrors submit())', () => {
  it('a card rated Again/Hard/Good is re-queued within the session; Easy is not', () => {
    const a = card('card-a');
    const session = [a];
    const counts = new Map<string, number>();

    simulateSubmit(session, 0, a, learningState, counts); // e.g. rated Again
    expect(session).toHaveLength(2);
    expect(session[1]?.id).toBe('card-a');

    // Now the re-queued copy is rated Easy and graduates -- no further growth.
    simulateSubmit(session, 1, a, graduatedState, counts);
    expect(session).toHaveLength(2);
  });

  it('the re-queued card is not served immediately as the very next card when other cards remain', () => {
    const [a, b, c, d, e] = [card('card-a'), card('card-b'), card('card-c'), card('card-d'), card('card-e')];
    const session = [a, b, c, d, e];
    const counts = new Map<string, number>();

    simulateSubmit(session, 0, a, learningState, counts);
    expect(session).toHaveLength(6);
    // The very next card shown (index 1) must NOT be the just-reviewed card.
    expect(session[1]?.id).not.toBe('card-a');
    expect(session[1]?.id).toBe('card-b');
  });

  it('when nothing else remains, the learning card is served again (learn-ahead) rather than ending the session on it', () => {
    const a = card('card-a');
    const session = [a];
    const counts = new Map<string, number>();

    simulateSubmit(session, 0, a, learningState, counts);
    // Appended right after itself -- the only option when it's the last card.
    expect(session).toHaveLength(2);
    expect(session[1]?.id).toBe('card-a');
  });

  it('the session ends when only graduated cards remain', () => {
    const [a, b] = [card('card-a'), card('card-b')];
    const session = [a, b];
    const counts = new Map<string, number>();

    // Both rated Easy (or otherwise graduated) on their only pass.
    simulateSubmit(session, 0, a, graduatedState, counts);
    simulateSubmit(session, 1, b, graduatedState, counts);

    expect(session).toHaveLength(2); // no growth -- the session is genuinely done
  });

  it('loop safety: a card rated Again forever is bounded by MAX_REQUEUES_PER_CARD, not left to loop unboundedly', () => {
    const a = card('card-a');
    const session = [a];
    const counts = new Map<string, number>();
    let index = 0;

    // Simulate the user rating this single card Again far more times than
    // the cap allows.
    for (let i = 0; i < 20; i++) {
      const currentCard = session[index];
      if (!currentCard) break;
      simulateSubmit(session, index, currentCard, learningState, counts);
      index += 1;
    }

    // Total appearances of the card = 1 (original) + MAX_REQUEUES_PER_CARD,
    // never unboundedly many, even though every single rating was "Again".
    const occurrences = session.filter((c) => c.id === 'card-a').length;
    expect(occurrences).toBe(1 + MAX_REQUEUES_PER_CARD);
    expect(counts.get('card-a')).toBe(MAX_REQUEUES_PER_CARD);
  });

  it('the extension path (buildExtension output appended to a session, as feat/keep-going does) behaves the same way', () => {
    // buildSession's own new-card allowance is capped at 1 here, so
    // 'new-2' is left over for buildExtension to pick up.
    const dueCards = [card('due-1')];
    const reviews = new Map([['due-1', { ...initialState('due-1', now), due: now.getTime() - 1000 }]]);
    const capped = buildSession({
      cards: [...dueCards, card('new-1'), card('new-2')],
      reviews,
      now,
      newCardsPerDay: 1,
      newCardsSeenToday: 0
    });
    expect(capped.map((c) => c.id)).toEqual(['due-1', 'new-1']);

    // By the time buildExtension is called (after the capped session was
    // actually reviewed), 'new-1' has a review row too -- buildExtension
    // treats "has a reviews entry" as "already served", same as
    // buildSession, so it correctly excludes it and offers only 'new-2'.
    const reviewsAfterCappedSession = new Map(reviews);
    reviewsAfterCappedSession.set('new-1', initialState('new-1', now));
    const extension = buildExtension({
      cards: [...dueCards, card('new-1'), card('new-2')],
      reviews: reviewsAfterCappedSession
    });
    expect(extension.map((c) => c.id)).toEqual(['new-2']);

    const session = [...capped, ...extension];
    const counts = new Map<string, number>();

    // A card served only via the extension still re-queues under the exact
    // same policy -- there is no separate code path for it.
    const extIndex = session.findIndex((c) => c.id === 'new-2');
    simulateSubmit(session, extIndex, session[extIndex] as StoredCard, learningState, counts);
    expect(session).toHaveLength(4);
    expect(session[session.length - 1]?.id).toBe('new-2');
  });
});

describe('the daily new-card counter is not inflated by a re-shown learning card', () => {
  beforeEach(() => {
    indexedDB = new IDBFactory();
  });

  it('recordReview only counts the FIRST time a card is seen, even across a re-queue within the same session', async () => {
    const db = await openDb();
    const a = card('card-a');

    expect(await newCardsSeenToday(db, now)).toBe(0);

    // First presentation: brand-new card, rated Again -> stays in Learning,
    // gets re-queued by review.ts's submit().
    const first = await recordReview(db, { card: a, outcome: 'again', now, desiredRetention: 0.9, durationMs: 100 });
    expect(first.state).toBe(1); // Learning
    expect(await newCardsSeenToday(db, now)).toBe(1);

    // Re-queued presentation later THE SAME SESSION/day: same card, second
    // recordReview call. Must not count as a second new card.
    const second = await recordReview(db, {
      card: a,
      outcome: 'good',
      now: new Date(now.getTime() + 5000),
      desiredRetention: 0.9,
      durationMs: 100
    });
    expect(second.reps).toBe(2);
    expect(await newCardsSeenToday(db, now)).toBe(1);
  });
});
