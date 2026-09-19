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

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('#app missing');

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

async function route(db: FactotumDb, deckUnavailable: boolean): Promise<void> {
  const session = await currentSession(db, new Date());

  if (window.location.hash === '#review' && session.length > 0) {
    await startReview(root!, {
      db,
      session,
      repo: REPO,
      onDone: () => { window.location.hash = ''; }
    });
    return;
  }

  if (window.location.hash === '#settings') {
    await renderSettings(root!, db, () => { window.location.hash = ''; });
    return;
  }

  renderDashboard(root!, {
    dueCount: session.length,
    deckUnavailable,
    onStart: () => { window.location.hash = '#review'; },
    onSettings: () => { window.location.hash = '#settings'; }
  });
}

async function boot(): Promise<void> {
  const db = await openDb();
  const settings = await getSettings(db);
  if (settings.theme !== 'auto') document.documentElement.dataset['theme'] = settings.theme;

  const syncOk = await syncDeck(db);
  const cardCount = await db.count('cards');
  const deckUnavailable = cardCount === 0 && !syncOk;

  window.addEventListener('hashchange', () => { void route(db, deckUnavailable); });
  await route(db, deckUnavailable);
}

void boot();
