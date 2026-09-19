import type { ReviewState, StoredCard } from '../db/schema.js';
import { isDue } from './fsrs.js';

const DAY_START_HOUR = 4;

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
