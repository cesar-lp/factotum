import './theme.css';
import './styles.css';
import { openDb, type FactotumDb, type StoredCard } from './db/schema.js';
import { getSettings, saveSettings } from './db/settings.js';
import { mergeDeck } from './db/deck.js';
import { loadReviews, newCardsSeenToday } from './db/reviews.js';
import { getLastSevenDays, getStreak } from './db/stats.js';
import {
  buildExtension, buildFocusSession, buildSession, countSuppressed, selectEnabled, selectNotRecentlyRead
} from './scheduler/queue.js';
import { summarizeTopics, notesByCategory } from './topics.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderTopics } from './ui/topics.js';
import { startReview, type ReviewController } from './ui/review.js';
import { renderSettings } from './ui/settings.js';
import { renderNote } from './ui/note.js';
import { renderSearch } from './ui/search.js';
import { loadNotes, findNote, prefetchNotes } from './db/notes.js';
import { loadNoteReads, recordNoteRead } from './db/note-reads.js';
import { obsidianUrl } from './ui/obsidian.js';
import {
  decideRoute, focusHash, noteHash, noteBlockHash, searchHash, SEARCH_PREFIX, resumesSuspendedSession,
  retainsSuspendedSession, type DashboardState
} from './route.js';
import type { Deck } from '../../pipeline/src/types.js';

const REPO = 'cesar-lp/factotum';

// Bumped on every entry into the `topics` branch below. A note fetch kicked
// off by an older visit to the topics screen (mute toggle -> save -> a fresh
// route() call, or a plain re-visit) must not clobber a newer visit's render
// with its own stale `disabled` set once it finally resolves -- comparing
// against `window.location.hash` alone catches "navigated away" but not
// "back on #topics via a different route() call in the meantime".
let topicsRenderId = 0;

// Same guard as topicsRenderId above, for the same reason: loadNotes() is a
// ~1MB fetch, and a reader who navigated away during that await must not
// have the search screen painted back over wherever they went once it
// resolves.
let searchRenderId = 0;

/**
 * The live review screen, retained across a note detour.
 *
 * `startReview` keeps its entire session in a closure — index, reviewed
 * count, rating tallies, the session timer's start, per-card requeue counts,
 * the FSRS states it has been keeping in sync, the mcq choice cache, and the
 * `session` array that in-session re-queues splice into. None of that is
 * reachable from outside, and tapping "open note" is a hashchange, so
 * without this the detour would rebuild the session from scratch and lose
 * all of it (a finished-but-for-a-requeue session rebuilds EMPTY, which
 * drops the reader on the dashboard mid-session).
 *
 * So rather than snapshotting that state and replaying it — which only works
 * for as long as nobody adds a field and forgets to snapshot it — the
 * screen's DOM node is detached and held whole. A detached node keeps its
 * event listeners, and those listeners keep the closure alive, so the
 * session survives untouched by construction; there is no list of fields to
 * get wrong. `hash` is the route it belongs to, which is what makes the
 * return trip identifiable and what `decideRoute` matches against.
 *
 * Not persisted: a full reload legitimately ends the session, exactly as it
 * does today.
 */
let suspendedReview: { hash: string; node: HTMLElement; controller: ReviewController } | null = null;

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
  const [cards, reviews, settings, seen, streak, lastSevenDays, reads] = await Promise.all([
    db.getAll('cards'),
    loadReviews(db),
    getSettings(db),
    newCardsSeenToday(db, now),
    // Both read reviewLog over its `ts` index and take the SAME `now` as the
    // queue below, so the streak's notion of "today" cannot drift from the
    // one the daily new-card allowance is counted against.
    getStreak(db, now),
    getLastSevenDays(db, now),
    loadNoteReads(db)
  ]);

  // The daily queue respects the user's mutes; the topics summary does not
  // — it has to show what is muted, and it validates focus hashes, which
  // are allowed to target a muted category on purpose.
  const enabled = selectEnabled(cards, new Set(settings.disabledCategories));

  // Suppression composes AFTER muting and BEFORE the builders, the same
  // seam selectEnabled already occupies, so neither filter knows about the
  // other and `buildSession` keeps exactly one job.
  const servable = selectNotRecentlyRead(enabled, reviews, reads, now, settings.readSuppressionHours);
  const deferredCount = countSuppressed(enabled, reviews, reads, now, settings.readSuppressionHours);

  const session = buildSession({
    cards: servable,
    reviews,
    now,
    newCardsPerDay: settings.newCardsPerDay,
    newCardsSeenToday: seen
  });
  const extension = buildExtension({ cards: servable, reviews });
  const topics = summarizeTopics(cards, reviews, now);

  return { session, extension, newCardsSeenToday: seen, streak, lastSevenDays, topics, deferredCount };
}

/**
 * Applied whenever a suspended review screen is reattached. Recomputed from
 * the store rather than from "which note did we just open", so a detour
 * through several notes is handled by the same code path as one.
 */
async function applyReadsToResumed(db: FactotumDb, controller: ReviewController): Promise<void> {
  const [settings, reads] = await Promise.all([getSettings(db), loadNoteReads(db)]);
  controller.dropRead(reads, new Date(), settings.readSuppressionHours);
}

async function route(appRoot: HTMLElement, db: FactotumDb, deckUnavailable: boolean): Promise<void> {
  const hash = window.location.hash;

  // The return trip from a note, handled BEFORE the state load below. A
  // resume uses nothing from `state`, and that load is real I/O — six
  // IndexedDB reads plus a queue rebuild over the whole deck — so routing it
  // the long way would leave the reader staring at the note for the duration
  // of a rebuild whose result is thrown away. Nothing has to be detached
  // first: `replaceChildren` (like the `innerHTML =` every other screen
  // uses) merely unparents whatever is there, and this node is held by a
  // live reference, so its subtree, its listeners and the startReview
  // closure they keep alive all survive being taken out of the document.
  if (suspendedReview && resumesSuspendedSession(hash, suspendedReview.hash)) {
    appRoot.replaceChildren(suspendedReview.node);
    await applyReadsToResumed(db, suspendedReview.controller);
    return;
  }

  const now = new Date();
  const state = await loadDashboardState(db, now);
  const decision = decideRoute(hash, state, suspendedReview?.hash ?? null);

  // Unreachable while the fast path above agrees with decideRoute — both
  // ask resumesSuspendedSession the same question. Kept so that if the two
  // ever drift, the answer is a correct resume rather than a lost session.
  if (decision.kind === 'resume' && suspendedReview) {
    appRoot.replaceChildren(suspendedReview.node);
    await applyReadsToResumed(db, suspendedReview.controller);
    return;
  }

  // THE anti-resurrection rule. Delegated to route.ts so it is an exhaustive
  // function of the decision kind rather than an `!== 'note'` that silently
  // stops being right the day a kind is added — see its doc comment.
  //
  // Note that the header × is NOT one of the endings this catches: it calls
  // finishSession(), which renders the summary INTO the retained node and
  // changes no hash, so nothing routes and `suspendedReview` stays set,
  // pointing at the summary. It is the summary's Done — which sets the hash
  // — that ends up here and clears it.
  if (!retainsSuspendedSession(decision.kind)) suspendedReview = null;

  // Renders a review session into its own node so the whole screen can be
  // detached and re-attached across a note detour (see suspendedReview).
  const begin = async (session: StoredCard[], onDone: () => void): Promise<void> => {
    const node = document.createElement('div');
    // display:contents — the host is a handle to grab the screen by, never
    // a box. `.screen` stays the direct flex item of #app it has always
    // been, so no layout rule in base.css or review.css has to know it.
    node.className = 'screen-host';
    appRoot.replaceChildren(node);
    const controller = await startReview(node, { db, session, repo: REPO, onDone });
    // Assigned after startReview resolves, since the controller does not
    // exist before then.
    suspendedReview = { hash, node, controller };
  };

  if (decision.kind === 'review') {
    await begin(state.session, () => { window.location.hash = ''; });
    return;
  }

  if (decision.kind === 'review-extend') {
    await begin(state.extension, () => { window.location.hash = ''; });
    return;
  }

  if (decision.kind === 'focus') {
    const [cards, reviews, settings, reads] = await Promise.all([
      db.getAll('cards'), loadReviews(db), getSettings(db), loadNoteReads(db)
    ]);
    // Muting is a preference the user is overriding on purpose by choosing
    // this category, so `selectEnabled` stays out of focus mode. Suppression
    // is not a preference -- it is a measurement-validity rule, and there is
    // no version of "test me on the paragraph I read four minutes ago" worth
    // honouring. Hence the asymmetry.
    const servable = selectNotRecentlyRead(cards, reviews, reads, now, settings.readSuppressionHours);
    await begin(
      buildFocusSession({ cards: servable, reviews, now, category: decision.category }),
      // Back to the picker, not the dashboard — a focused session lands you
      // where you launched it.
      () => { window.location.hash = '#topics'; }
    );
    return;
  }

  if (decision.kind === 'note') {
    const [notes, settings] = await Promise.all([
      loadNotes(), getSettings(db)
    ]);
    const note = notes ? findNote(notes, decision.path) : null;
    // Recorded on OPEN, not on dwell time or scroll depth. Opening and
    // immediately backing out defers that note's due cards by a day, which
    // is trivially recoverable -- whereas a dwell threshold means timers,
    // visibility handling and a new class of flaky test for a problem that
    // resolves itself tomorrow.
    //
    // Only for a note that actually exists: a stale or mistyped path must
    // not write a read for something the reader never saw.
    if (note) await recordNoteRead(db, decision.path, now, settings.readSuppressionHours);
    const card = note
      ? (await db.getAll('cards')).find((c) => c.source.path === decision.path) ?? null
      : null;

    renderNote(appRoot, {
      note,
      available: notes !== null,
      arrivedFrom: decision.cardId,
      arrivedAtBlock: decision.block,
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
    const renderId = ++topicsRenderId;

    const save = async (next: Set<string>): Promise<void> => {
      // Re-read so this write carries whatever the settings form may have
      // changed since this screen rendered.
      const current = await getSettings(db);
      await saveSettings(db, { ...current, disabledCategories: [...next] });
      await route(appRoot, db, deckUnavailable);
    };

    const renderWithNotes = (notes: ReadonlyMap<string, { path: string; title: string }[]>): void => {
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
        notes,
        onOpenNote: (path) => { window.location.hash = noteHash(path); }
      });
    };

    // Render immediately with no note lists -- notes.json is ~1MB and
    // lazily fetched, and nothing else on this screen (mute toggles, shelf
    // toggles, "learn" buttons) has anything to do with it. This is the
    // same graceful-degradation markup as a permanently-offline notes.json;
    // it is just the FIRST state here rather than a fallback.
    renderWithNotes(new Map());

    void loadNotes().then((notes) => {
      // Offline with nothing cached: stay exactly as already rendered, no
      // error state -- the note viewer already owns "notes unavailable".
      if (notes === null) return;
      // Superseded by a newer visit to this branch (mute toggle -> save ->
      // a fresh route() call, or the reader left and came back) whose own
      // disabled set and closures are the ones that should end up on
      // screen, not this stale fetch's.
      if (renderId !== topicsRenderId) return;
      // The reader tapped a note, a "learn" button, or the back button
      // while this was in flight -- do not yank them back onto #topics.
      if (window.location.hash !== '#topics') return;
      renderWithNotes(notesByCategory(notes));
    });

    return;
  }

  if (decision.kind === 'settings') {
    await renderSettings(appRoot, db, () => { window.location.hash = ''; });
    return;
  }

  if (decision.kind === 'search') {
    const renderId = ++searchRenderId;
    const [notes, reads] = await Promise.all([loadNotes(), loadNoteReads(db)]);
    // Superseded by a newer visit to this branch in the meantime.
    if (renderId !== searchRenderId) return;
    // The reader navigated away (back, a result, settings) while this was
    // in flight -- do not paint the search screen over wherever they went.
    if (!window.location.hash.startsWith(SEARCH_PREFIX)) return;
    // Newest first. `noteReads` is already maintained by suppression, so
    // the landing screen costs no extra state.
    const recentPaths = Object.entries(reads)
      .sort(([, a], [, b]) => b - a)
      .map(([path]) => path);
    renderSearch(appRoot, {
      query: decision.query,
      notes,
      recentPaths,
      // replaceState, not assignment: typing must not stack a history
      // entry per keystroke, but the hash still has to carry the query so
      // Back from a note returns to populated results.
      onQueryChange: (q) => { window.history.replaceState(null, '', searchHash(q)); },
      onOpen: (path, block) => {
        window.location.hash = block === null ? noteHash(path) : noteBlockHash(path, block);
      },
      onBack: () => { window.location.hash = ''; }
    });
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
    deferredCount: state.deferredCount,
    streak: state.streak,
    lastSevenDays: state.lastSevenDays,
    deckUnavailable,
    onStart: () => { window.location.hash = '#review'; },
    onKeepGoing: () => { window.location.hash = '#review-extend'; },
    onTopics: () => { window.location.hash = '#topics'; },
    onSettings: () => { window.location.hash = '#settings'; },
    onSearch: () => { window.location.hash = '#search'; }
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
