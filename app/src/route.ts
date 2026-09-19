import type { StoredCard } from './db/schema.js';

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
}

export type RouteDecision = 'review' | 'review-extend' | 'settings' | 'dashboard';

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
  if (hash === '#review' && state.session.length > 0) return 'review';

  // Due cards always come first — this re-checks the same condition the
  // dashboard button's own visibility already enforces, because the hash is
  // plain client state: reachable by a stale back/forward history entry, a
  // reload, or a bookmark, not just a click on a button that only renders
  // when the queue is actually empty. Never trust the route to only be
  // entered the way the UI currently intends it.
  if (hash === '#review-extend' && state.session.length === 0 && state.extension.length > 0) {
    return 'review-extend';
  }

  if (hash === '#settings') return 'settings';

  return 'dashboard';
}
