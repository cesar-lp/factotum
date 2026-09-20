import './theme.css';
import './styles.css';
import { openDb, type FactotumDb, type StoredCard } from './db/schema.js';
import { getSettings, saveSettings } from './db/settings.js';
import { mergeDeck } from './db/deck.js';
import { loadReviews, newCardsSeenToday } from './db/reviews.js';
import { getLastSevenDays, getStreak } from './db/stats.js';
import { buildExtension, buildFocusSession, buildSession, selectEnabled } from './scheduler/queue.js';
import { summarizeTopics, notesByCategory } from './topics.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderTopics } from './ui/topics.js';
import { startReview } from './ui/review.js';
import { renderSettings } from './ui/settings.js';
import { renderNote } from './ui/note.js';
import { loadNotes, findNote, prefetchNotes } from './db/notes.js';
import { maskedCardIds } from './ui/note-mask.js';
import { obsidianUrl } from './ui/obsidian.js';
import { decideRoute, focusHash, noteHash, type DashboardState } from './route.js';
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

export async function loadDashboardState(db: FactotumDb, now: Date): Promise<DashboardState> {
  const [cards, reviews, settings, seen, streak, lastSevenDays] = await Promise.all([
    db.getAll('cards'),
    loadReviews(db),
    getSettings(db),
    newCardsSeenToday(db, now),
    // Both read reviewLog over its `ts` index and take the SAME `now` as the
    // queue below, so the streak's notion of "today" cannot drift from the
    // one the daily new-card allowance is counted against.
    getStreak(db, now),
    getLastSevenDays(db, now)
  ]);

  // The daily queue respects the user's mutes; the topics summary does not
  // — it has to show what is muted, and it validates focus hashes, which
  // are allowed to target a muted category on purpose.
  const enabled = selectEnabled(cards, new Set(settings.disabledCategories));

  const session = buildSession({
    cards: enabled,
    reviews,
    now,
    newCardsPerDay: settings.newCardsPerDay,
    newCardsSeenToday: seen
  });
  const extension = buildExtension({ cards: enabled, reviews });
  const topics = summarizeTopics(cards, reviews, now);

  return { session, extension, newCardsSeenToday: seen, streak, lastSevenDays, topics };
}

async function route(appRoot: HTMLElement, db: FactotumDb, deckUnavailable: boolean): Promise<void> {
  const now = new Date();
  const state = await loadDashboardState(db, now);
  const hash = window.location.hash;
  const decision = decideRoute(hash, state);

  if (decision.kind === 'review') {
    await startReview(appRoot, {
      db, session: state.session, repo: REPO,
      onDone: () => { window.location.hash = ''; }
    });
    return;
  }

  if (decision.kind === 'review-extend') {
    await startReview(appRoot, {
      db, session: state.extension, repo: REPO,
      onDone: () => { window.location.hash = ''; }
    });
    return;
  }

  if (decision.kind === 'focus') {
    const [cards, reviews] = await Promise.all([db.getAll('cards'), loadReviews(db)]);
    await startReview(appRoot, {
      db,
      session: buildFocusSession({ cards, reviews, now, category: decision.category }),
      repo: REPO,
      // Back to the picker, not the dashboard — a focused session lands you
      // where you launched it.
      onDone: () => { window.location.hash = '#topics'; }
    });
    return;
  }

  if (decision.kind === 'note') {
    const [notes, reviews, settings] = await Promise.all([
      loadNotes(), loadReviews(db), getSettings(db)
    ]);
    const note = notes ? findNote(notes, decision.path) : null;
    const card = note
      ? (await db.getAll('cards')).find((c) => c.source.path === decision.path) ?? null
      : null;

    renderNote(appRoot, {
      note,
      available: notes !== null,
      masked: note ? maskedCardIds(note, reviews, now, decision.cardId) : new Set<string>(),
      arrivedFrom: decision.cardId,
      // Obsidian is demoted, not deleted: on a Mac it is still the better
      // tool for EDITING a note, which this viewer will never do.
      obsidianHref: card ? obsidianUrl(card, settings.obsidianVault) : null,
      onBack: () => { window.history.back(); }
    });
    return;
  }

  if (decision.kind === 'topics') {
    const settings = await getSettings(db);
    const disabled = new Set(settings.disabledCategories);
    const notes = await loadNotes();

    const save = async (next: Set<string>): Promise<void> => {
      // Re-read so this write carries whatever the settings form may have
      // changed since this screen rendered.
      const current = await getSettings(db);
      await saveSettings(db, { ...current, disabledCategories: [...next] });
      await route(appRoot, db, deckUnavailable);
    };

    renderTopics(appRoot, {
      topics: state.topics,
      disabled,
      onToggleCategory: (category, nextDisabled) => {
        const next = new Set(disabled);
        if (nextDisabled) next.add(category);
        else next.delete(category);
        void save(next);
      },
      onToggleTopic: (topic, nextDisabled) => {
        const next = new Set(disabled);
        const summary = state.topics.find((t) => t.topic === topic);
        for (const c of summary?.categories ?? []) {
          if (nextDisabled) next.add(c.category);
          else next.delete(c.category);
        }
        void save(next);
      },
      onLearn: (category) => { window.location.hash = focusHash(category); },
      onBack: () => { window.location.hash = ''; },
      notes: notes ? notesByCategory(notes) : new Map(),
      onOpenNote: (path) => { window.location.hash = noteHash(path); }
    });
    return;
  }

  if (decision.kind === 'settings') {
    await renderSettings(appRoot, db, () => { window.location.hash = ''; });
    return;
  }

  if (hash === '#review-extend' || hash.startsWith('#focus/')) {
    // Stale/invalid entry into a session route (due cards exist again,
    // nothing left to extend into, or a focus hash whose category is gone)
    // — clear it so a subsequent reload or back/forward doesn't land here
    // again. A hash mutation is a side effect, so it stays here rather than
    // in the pure decideRoute.
    window.location.hash = '';
  }

  renderDashboard(appRoot, {
    dueCount: state.session.length,
    newCardsRemaining: state.extension.length,
    newCardsSeenToday: state.newCardsSeenToday,
    streak: state.streak,
    lastSevenDays: state.lastSevenDays,
    deckUnavailable,
    onStart: () => { window.location.hash = '#review'; },
    onKeepGoing: () => { window.location.hash = '#review-extend'; },
    onTopics: () => { window.location.hash = '#topics'; },
    onSettings: () => { window.location.hash = '#settings'; }
  });

  // Warms notes.json once the common case (the dashboard) is up, so a note
  // opened later — offline or not — usually finds it already cached.
  prefetchNotes();
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
