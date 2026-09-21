import type { ReviewState, StoredCard } from '../db/schema.js';
import { isDue } from './fsrs.js';
import { isRecentlyRead, type NoteReads } from '../db/note-reads.js';

/**
 * The hour a review day rolls over. A review logged at 01:00 belongs to the
 * previous day: the alternative punishes a late-night session by splitting it
 * across two day buckets. Exported because `db/stats.ts` derives the real-time
 * window a `dayKey` bucket spans and must use the SAME cutoff -- a second copy
 * would let the streak and the new-card counter disagree about what "today" is.
 */
export const DAY_START_HOUR = 4;

export function dayKey(at: Date): string {
  const shifted = new Date(at.getTime());
  shifted.setHours(shifted.getHours() - DAY_START_HOUR);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const d = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function interleave(cards: StoredCard[]): StoredCard[] {
  const byCategory = new Map<string, StoredCard[]>();
  for (const card of cards) {
    const bucket = byCategory.get(card.category) ?? [];
    bucket.push(card);
    byCategory.set(card.category, bucket);
  }

  const queues = [...byCategory.values()];
  const out: StoredCard[] = [];
  let remaining = cards.length;

  while (remaining > 0) {
    for (const queue of queues) {
      const next = queue.shift();
      if (!next) continue;
      out.push(next);
      remaining -= 1;
    }
  }
  return out;
}

export interface SessionInput {
  cards: StoredCard[];
  reviews: Map<string, ReviewState>;
  now: Date;
  newCardsPerDay: number;
  newCardsSeenToday: number;
}

export function buildSession(input: SessionInput): StoredCard[] {
  const { cards, reviews, now, newCardsPerDay, newCardsSeenToday } = input;

  const dueCards: StoredCard[] = [];
  const newCards: StoredCard[] = [];

  for (const card of cards) {
    if (card.tombstoned) continue;
    const state = reviews.get(card.id);
    if (!state) {
      newCards.push(card);
      continue;
    }
    if (state.suspended) continue;
    if (isDue(state, now)) dueCards.push(card);
  }

  const allowance = Math.max(0, newCardsPerDay - newCardsSeenToday);
  return [...interleave(dueCards), ...interleave(newCards).slice(0, allowance)];
}

export interface ExtensionInput {
  cards: StoredCard[];
  reviews: Map<string, ReviewState>;
}

/**
 * The "keep going" extension: every remaining new card (unbounded, no
 * `newCardsPerDay` slice), interleaved the same way `buildSession` does.
 * A card counts as "new" purely by having no review state yet — the same
 * test `buildSession` uses — so a card already reviewed today (whether
 * inside the capped allowance or a prior extension) already has a state
 * entry and is naturally excluded, with no separate day-scoped bookkeeping
 * needed here. Due cards are deliberately left out: they were already
 * served first by the session this extension continues.
 */
export function buildExtension(input: ExtensionInput): StoredCard[] {
  const { cards, reviews } = input;

  const newCards: StoredCard[] = [];
  for (const card of cards) {
    if (card.tombstoned) continue;
    if (reviews.has(card.id)) continue;
    newCards.push(card);
  }

  return interleave(newCards);
}

/**
 * Drops cards whose category the user has switched off. Order-preserving,
 * and applied BEFORE `buildSession`/`buildExtension` rather than inside
 * them, so those two keep exactly one job and stay byte-identical in
 * behaviour when nothing is disabled.
 *
 * This is a filter, not a freeze: FSRS state is untouched, so due dates
 * keep advancing while a category is off and re-enabling surfaces whatever
 * became overdue. That is deliberate — FSRS models forgetting over real
 * elapsed time, and pretending the clock stopped would overstate how much
 * of that material is still retained.
 */
export function selectEnabled(cards: StoredCard[], disabled: ReadonlySet<string>): StoredCard[] {
  if (disabled.size === 0) return cards;
  return cards.filter((card) => !disabled.has(card.category));
}

/**
 * Drops DUE cards whose note was opened within the suppression window.
 *
 * FSRS estimates retention across elapsed time. A card tested moments
 * after its note was read measures nothing about memory and writes an
 * inflated stability score into the one store this app cannot rebuild.
 * Deferring the test is how that measurement is declined.
 *
 * Like `selectEnabled` above, this is a filter, not a freeze: FSRS state
 * is untouched and due dates keep advancing while a note is suppressed.
 *
 * NEW CARDS ARE NEVER SUPPRESSED, and the reason is the one `note-mask.ts`
 * gave before this replaced it: suppression protects a pending test, and a
 * card never asked has none. Reading a note and then learning its cards is
 * the normal order of operations, not contamination -- and under the
 * planned path feature, reading a note is precisely what INTRODUCES its
 * cards, so suppressing them here would only have to be undone there.
 */
export function selectNotRecentlyRead(
  cards: StoredCard[],
  reviews: Map<string, ReviewState>,
  reads: NoteReads,
  now: Date,
  windowHours: number
): StoredCard[] {
  if (windowHours <= 0) return cards;
  return cards.filter((card) => {
    if (!reviews.has(card.id)) return true; // new: nothing to protect
    return !isRecentlyRead(reads, card.source.path, now, windowHours);
  });
}

/**
 * How many cards `selectNotRecentlyRead` would remove. Kept separate from
 * `buildSession`'s return type so the dashboard can say what happened
 * without every existing session call site changing shape.
 *
 * A card that leaves the queue with no explanation is the same defect the
 * silently-dropped re-queued card already is (state-and-roadmap §6).
 */
export function countSuppressed(
  cards: StoredCard[],
  reviews: Map<string, ReviewState>,
  reads: NoteReads,
  now: Date,
  windowHours: number
): number {
  return cards.length - selectNotRecentlyRead(cards, reviews, reads, now, windowHours).length;
}

export interface FocusInput {
  cards: StoredCard[];
  reviews: Map<string, ReviewState>;
  now: Date;
  category: string;
}

/**
 * The on-demand session: one category, its due cards first, then every one
 * of its unseen cards with no daily cap.
 *
 * Composed from the two existing builders rather than written as a third
 * scheduling path — `newCardsPerDay: 0` makes `buildSession` contribute due
 * cards only, and `buildExtension` contributes the uncapped new cards.
 * Suspension, tombstoning and the not-yet-due test are therefore inherited
 * rather than reimplemented, and there is no second notion of "due" to
 * drift out of sync.
 *
 * Not-yet-due cards are deliberately absent: a focused session is a real
 * review that writes FSRS state, so including them would pull their
 * schedules forward. Cards are NOT filtered by `disabledCategories` here —
 * disabling keeps a category out of the DAILY queue, and deliberately
 * picking it on demand is exactly the case that should still work.
 */
export function buildFocusSession(input: FocusInput): StoredCard[] {
  const { cards, reviews, now, category } = input;
  const inCategory = cards.filter((card) => card.category === category);

  return [
    ...buildSession({
      cards: inCategory,
      reviews,
      now,
      newCardsPerDay: 0,
      newCardsSeenToday: 0
    }),
    ...buildExtension({ cards: inCategory, reviews })
  ];
}
