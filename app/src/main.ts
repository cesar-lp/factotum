import './theme.css';
import './styles.css';
import { openDb, type FactotumDb, type StoredCard } from './db/schema.js';
import { getSettings } from './db/settings.js';
import { mergeDeck } from './db/deck.js';
import { loadReviews, newCardsSeenToday } from './db/reviews.js';
import { buildSession } from './scheduler/queue.js';
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

export async function currentSession(db: FactotumDb, now: Date): Promise<StoredCard[]> {
  const [cards, reviews, settings, seen] = await Promise.all([
    db.getAll('cards'),
    loadReviews(db),
    getSettings(db),
    newCardsSeenToday(db, now)
  ]);

  return buildSession({
    cards,
    reviews,
    now,
    newCardsPerDay: settings.newCardsPerDay,
    newCardsSeenToday: seen
  });
}

async function route(appRoot: HTMLElement, db: FactotumDb, deckUnavailable: boolean): Promise<void> {
  const session = await currentSession(db, new Date());

  if (window.location.hash === '#review' && session.length > 0) {
    await startReview(appRoot, {
      db,
      session,
      repo: REPO,
      onDone: () => { window.location.hash = ''; }
    });
    return;
  }

  if (window.location.hash === '#settings') {
    await renderSettings(appRoot, db, () => { window.location.hash = ''; });
    return;
  }

  renderDashboard(appRoot, {
    dueCount: session.length,
    deckUnavailable,
    onStart: () => { window.location.hash = '#review'; },
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
