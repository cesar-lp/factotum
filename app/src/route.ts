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
  /** Due cards held back because their note was read inside the window. */
  deferredCount: number;
}

export type RouteDecision =
  /**
   * Return to a review session that is still alive in memory, suspended
   * while the reader detoured to a note. Distinct from `review` because
   * nothing is built: the caller re-attaches the retained screen and the
   * session's own closure carries on where it left off.
   */
  | { kind: 'resume' }
  | { kind: 'review' }
  | { kind: 'review-extend' }
  | { kind: 'focus'; category: string }
  | { kind: 'note'; path: string; cardId: string | null }
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

export const NOTE_PREFIX = '#note/';

/** Card ids are always exactly this shape, which is what makes the split unambiguous. */
const CARD_ID = /^card-[a-z0-9]{4}$/;

/**
 * Builds the hash for the note viewer. The optional arrived-from card is
 * appended as a trailing segment rather than a leading one: vault paths
 * contain `/` themselves, so only the card id can safely be the last
 * segment.
 */
export function noteHash(path: string, cardId?: string): string {
  const base = `${NOTE_PREFIX}${encodeURIComponent(path)}`;
  return cardId ? `${base}/${cardId}` : base;
}

/**
 * Decodes a `#note/...` hash. Returns null for a bare prefix, an empty
 * path, and a malformed percent-escape -- decodeURIComponent throws a
 * URIError on input like `%E0%A4%A`, and a hash is plain client state that
 * arrives hand-edited, from stale history, and from bookmarks.
 */
function noteTarget(hash: string): { path: string; cardId: string | null } | null {
  const raw = hash.slice(NOTE_PREFIX.length);
  if (raw === '') return null;

  const slash = raw.lastIndexOf('/');
  const trailing = slash >= 0 ? raw.slice(slash + 1) : '';
  const hasCard = CARD_ID.test(trailing);
  const encodedPath = hasCard ? raw.slice(0, slash) : raw;
  if (encodedPath === '') return null;

  try {
    const path = decodeURIComponent(encodedPath);
    if (path === '') return null;
    return { path, cardId: hasCard ? trailing : null };
  } catch {
    return null;
  }
}

/**
 * The three hashes that run a review session, and therefore the only ones a
 * suspended session can belong to. Checked even though `suspendedHash` is
 * only ever set from one of them: a bad retention record must degrade to the
 * normal guarded routing, never invent a `resume` for `#settings`.
 */
function isSessionRoute(hash: string): boolean {
  return hash === '#review' || hash === '#review-extend' || hash.startsWith(FOCUS_PREFIX);
}

/**
 * Whether `hash` is a return to the suspended session `suspendedHash`
 * identifies (null when nothing is suspended). This is the same condition
 * `decideRoute` uses to return `resume`, exported so main.ts can act on it
 * BEFORE it loads a DashboardState: a resume needs nothing from that state,
 * and rebuilding the whole deck just to hand back a node already in hand
 * would put a needless I/O window between the reader and their card.
 */
export function resumesSuspendedSession(hash: string, suspendedHash: string | null): boolean {
  return suspendedHash !== null && hash === suspendedHash && isSessionRoute(hash);
}

/**
 * Whether a decision keeps a suspended review session alive, or ends it.
 *
 * This is the whole anti-resurrection rule, and it is load-bearing in both
 * directions: classify a kind as retaining when it is not, and a finished
 * session lingers to be resurrected by a later back/forward; classify one as
 * ending when it is not, and the reader is thrown out of a session that is
 * still running. It lives here, as an exhaustive function of the decision
 * kind, so a new `RouteDecision` member cannot be added without deciding
 * which side it falls on — `route.test.ts` tables it against every member of
 * the union, so an unclassified kind fails in node rather than in the app.
 *
 * `note` is the detour the whole note viewer exists to make survivable.
 * `resume` is the return trip from it, which obviously keeps the session.
 * Everything else — the dashboard, topics, settings, a focus or extend hash
 * that starts a DIFFERENT session — means the reader has left for good.
 */
export function retainsSuspendedSession(kind: RouteDecision['kind']): boolean {
  return kind === 'note' || kind === 'resume';
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
 *
 * `suspendedHash` is the hash of a review session the caller is still
 * holding in memory (see main.ts), or null when there is none. It is passed
 * in rather than read from a module global precisely so this stays pure.
 */
export function decideRoute(
  hash: string,
  state: DashboardState,
  suspendedHash: string | null = null
): RouteDecision {
  // A retained session outranks every guard below, but only for the exact
  // route it was started from. That is not a loosening of those guards: they
  // decide whether a session may be BUILT, and they already ran — and
  // passed — when this one was. Re-running them against a freshly loaded
  // DashboardState would fail for a session that is mid-flight precisely
  // because its cards are no longer due (they have just been graded, and an
  // Again re-queue sits 1-10 minutes out), which would eject the reader from
  // a session still in progress. The caller drops `suspendedHash` the moment
  // the session is finished or the reader goes anywhere that is not a note,
  // so nothing stale can be resurrected through here.
  if (resumesSuspendedSession(hash, suspendedHash)) return { kind: 'resume' };

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

  // Not validated against the deck here, unlike focus: the note set lives in
  // notes.json, which is fetched lazily and may not be loaded yet. The
  // viewer resolves the path itself and renders a not-found state, which it
  // needs anyway for a note deleted since the hash was bookmarked.
  if (hash.startsWith(NOTE_PREFIX)) {
    const target = noteTarget(hash);
    if (target) return { kind: 'note', path: target.path, cardId: target.cardId };
    return { kind: 'dashboard' };
  }

  if (hash === '#topics') return { kind: 'topics' };

  if (hash === '#settings') return { kind: 'settings' };

  return { kind: 'dashboard' };
}
