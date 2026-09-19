import './theme.css';
import './styles.css';
import { openDb, type FactotumDb, type StoredCard } from './db/schema.js';
import { getSettings } from './db/settings.js';
import { mergeDeck } from './db/deck.js';
import { loadReviews, newCardsSeenToday } from './db/reviews.js';
import { buildExtension, buildSession } from './scheduler/queue.js';
import { renderDashboard } from './ui/dashboard.js';
import { startReview } from './ui/review.js';
import { renderSettings } from './ui/settings.js';
import type { Deck } from '../../pipeline/src/types.js';

const REPO = 'cesar-lp/factotum';

/**
 * Fetches and merges the deck. Never throws: a failed fetch/parse is a
 * normal offline condition, and the previously merged deck in IndexedDB
 * (if any) stays authoritative. Returns whether the sync succeeded so the
 * caller can tell a genuine "no deck ever loaded" state apart from a
 * merely stale-but-present cached deck.
 */
async function syncDeck(db: FactotumDb): Promise<boolean> {
  try {
    const response = await fetch('./deck.json', { cache: 'no-cache' });
    if (!response.ok) return false;
    const deck = (await response.json()) as Deck;
    await mergeDeck(db, deck);
    return true;
  } catch {
    // Offline: the previously merged deck in IndexedDB is authoritative.
    return false;
  }
}

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

export async function loadDashboardState(db: FactotumDb, now: Date): Promise<DashboardState> {
  const [cards, reviews, settings, seen] = await Promise.all([
    db.getAll('cards'),
    loadReviews(db),
    getSettings(db),
    newCardsSeenToday(db, now)
  ]);

  const session = buildSession({
    cards,
    reviews,
    now,
    newCardsPerDay: settings.newCardsPerDay,
    newCardsSeenToday: seen
  });
  const extension = buildExtension({ cards, reviews });

  return { session, extension, newCardsSeenToday: seen };
}

async function route(appRoot: HTMLElement, db: FactotumDb, deckUnavailable: boolean): Promise<void> {
  const state = await loadDashboardState(db, new Date());

  if (window.location.hash === '#review' && state.session.length > 0) {
    await startReview(appRoot, {
      db,
      session: state.session,
      repo: REPO,
      onDone: () => { window.location.hash = ''; }
    });
    return;
  }

  // Due cards always come first — this re-checks the same condition the
  // dashboard button's own visibility already enforces, because the hash is
  // plain client state: reachable by a stale back/forward history entry, a
  // reload, or a bookmark, not just a click on a button that only renders
  // when the queue is actually empty. Never trust the route to only be
  // entered the way the UI currently intends it.
  if (window.location.hash === '#review-extend' && state.session.length === 0 && state.extension.length > 0) {
    await startReview(appRoot, {
      db,
      session: state.extension,
      repo: REPO,
      onDone: () => { window.location.hash = ''; }
    });
    return;
  }

  if (window.location.hash === '#settings') {
    await renderSettings(appRoot, db, () => { window.location.hash = ''; });
    return;
  }

  if (window.location.hash === '#review-extend') {
    // Stale/invalid entry into the extension route (due cards exist again,
    // or nothing left to extend into) — clear it so a subsequent reload or
    // back/forward doesn't land here again, and so the dashboard's own
    // "keep going" button (not a leftover hash) is what drives this route
    // from here on.
    window.location.hash = '';
  }

  renderDashboard(appRoot, {
    dueCount: state.session.length,
    newCardsRemaining: state.extension.length,
    newCardsSeenToday: state.newCardsSeenToday,
    deckUnavailable,
    onStart: () => { window.location.hash = '#review'; },
    onKeepGoing: () => { window.location.hash = '#review-extend'; },
    onSettings: () => { window.location.hash = '#settings'; }
  });
}

async function boot(appRoot: HTMLElement): Promise<void> {
  const db = await openDb();
  const settings = await getSettings(db);
  if (settings.theme !== 'auto') document.documentElement.dataset['theme'] = settings.theme;

  const syncOk = await syncDeck(db);
  const cardCount = await db.count('cards');
  const deckUnavailable = cardCount === 0 && !syncOk;

  window.addEventListener('hashchange', () => { void route(appRoot, db, deckUnavailable); });
  await route(appRoot, db, deckUnavailable);
}

const appRoot = document.querySelector<HTMLElement>('#app');
if (!appRoot) throw new Error('#app missing');
void boot(appRoot);

// Registered as './sw.js' (the production bundle emitted by vite.config.ts's
// `sw` rollup entry), not as `new URL('./sw.ts', import.meta.url)`: Vite only
// special-cases that pattern inside `new Worker(...)`/`new SharedWorker(...)`
// calls, so passed to `serviceWorker.register` it would just copy the raw,
// untranspiled .ts file into dist as a static asset instead of bundling it.
// In dev this 404s harmlessly (caught below) since no build has run yet.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { type: 'module' }).catch(() => {
      // Offline-first is a production concern; a missing dev-server sw.js is not an error.
    });
  });
}
