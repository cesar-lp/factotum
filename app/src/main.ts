import './theme.css';
import './styles.css';
import { openDb, type FactotumDb, type StoredCard } from './db/schema.js';
import { getSettings } from './db/settings.js';
import { mergeDeck } from './db/deck.js';
import { loadReviews, newCardsSeenToday } from './db/reviews.js';
import { buildSession } from './scheduler/queue.js';
import { renderDashboard } from './ui/dashboard.js';
import type { Deck } from '../../pipeline/src/types.js';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('#app missing');

async function syncDeck(db: FactotumDb): Promise<void> {
  try {
    const response = await fetch('./deck.json', { cache: 'no-cache' });
    if (!response.ok) return;
    const deck = (await response.json()) as Deck;
    await mergeDeck(db, deck);
  } catch {
    // Offline: the previously merged deck in IndexedDB is authoritative.
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

async function boot(): Promise<void> {
  const db = await openDb();
  const settings = await getSettings(db);
  if (settings.theme !== 'auto') document.documentElement.dataset['theme'] = settings.theme;

  await syncDeck(db);
  const session = await currentSession(db, new Date());

  renderDashboard(root!, {
    dueCount: session.length,
    onStart: () => { window.location.hash = '#review'; },
    onSettings: () => { window.location.hash = '#settings'; }
  });
}

void boot();
