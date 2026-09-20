import type { StoredCard } from './db/schema.js';
import { hasFocusableCards, type TopicSummary } from './topics.js';
import type { DayCount } from './db/stats.js';

export interface DashboardState {
  /** Due cards plus new cards up to the day's remaining allowance. */
  session: StoredCard[];
  /**
   * New cards left over once `session` is exhausted — unbounded, only ever
   * served via the opt-in "keep going" extension, never automatically.
   */
  extension: StoredCard[];
  /** Today's new-card count so far (includes cards taken via `extension`). */
  newCardsSeenToday: number;
  /** Consecutive days with at least one review, counted back from today. */
  streak: number;
  /** Review counts for the last seven day buckets, oldest first. */
  lastSevenDays: DayCount[];
  /**
   * The whole deck grouped topic → category, INCLUDING categories the user
   * has disabled — this drives the picker (which must show what is muted)
   * and validates a `#focus/...` hash. Not filtered by
   * `disabledCategories`, unlike `session` and `extension`.
   */
  topics: TopicSummary[];
}

export type RouteDecision =
  | { kind: 'review' }
  | { kind: 'review-extend' }
  | { kind: 'focus'; category: string }
  | { kind: 'topics' }
  | { kind: 'settings' }
  | { kind: 'dashboard' };

export const FOCUS_PREFIX = '#focus/';

/** Builds the hash for a focused session, encoding the free-form category name. */
export function focusHash(category: string): string {
  return `${FOCUS_PREFIX}${encodeURIComponent(category)}`;
}

/**
 * Decodes the category segment of a focus hash. Returns null for a bare
 * `#focus/` and for a malformed percent-escape — `decodeURIComponent`
 * throws a URIError on input like `%E0%A4%A`, and a hash is plain client
 * state that can arrive hand-edited, so it is caught rather than allowed
 * to take down the route.
 */
function focusCategory(hash: string): string | null {
  const raw = hash.slice(FOCUS_PREFIX.length);
  if (raw === '') return null;
  try {
    const decoded = decodeURIComponent(raw);
    return decoded === '' ? null : decoded;
  } catch {
    return null;
  }
}

/**
 * The routing DECISION, pulled apart from main.ts's route()'s side effects
 * (DOM render, hash mutation, db fetch) so the one invariant that matters
 * here — due cards always come first, so `#review-extend` may only win when
 * the queue is genuinely empty — has a permanent, node-testable guard
 * instead of relying solely on manual verification.
 *
 * Pure and DOM-free on purpose: no `window`/`document` access, no mutation,
 * no CSS imports anywhere in its module graph, so it (unlike main.ts, which
 * touches `document` and `window` at import time) is safe to import directly
 * in a plain node test environment.
 */
export function decideRoute(hash: string, state: DashboardState): RouteDecision {
  if (hash === '#review' && state.session.length > 0) return { kind: 'review' };

  // Due cards always come first — this re-checks the same condition the
  // dashboard button's own visibility already enforces, because the hash is
  // plain client state: reachable by a stale back/forward history entry, a
  // reload, or a bookmark, not just a click on a button that only renders
  // when the queue is actually empty. Never trust the route to only be
  // entered the way the UI currently intends it.
  if (hash === '#review-extend' && state.session.length === 0 && state.extension.length > 0) {
    return { kind: 'review-extend' };
  }

  // Focus is deliberately NOT gated on an empty session: it is an extra
  // available whenever asked for, not a fallback for a finished day. It is
  // still validated against the deck for the same stale-hash reasons as
  // above — an unknown category, or one with nothing to serve, falls back.
  if (hash.startsWith(FOCUS_PREFIX)) {
    const category = focusCategory(hash);
    if (category !== null && hasFocusableCards(state.topics, category)) {
      return { kind: 'focus', category };
    }
    return { kind: 'dashboard' };
  }

  if (hash === '#topics') return { kind: 'topics' };

  if (hash === '#settings') return { kind: 'settings' };

  return { kind: 'dashboard' };
}
