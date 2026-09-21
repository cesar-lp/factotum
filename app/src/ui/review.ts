import { Rating } from 'ts-fsrs';
import type { FactotumDb, ReviewState, StoredCard } from '../db/schema.js';
import type { Choice } from '../../../pipeline/src/types.js';
import type { Outcome } from '../scheduler/fsrs.js';
import { initialState, isStillLearning, previewIntervals, ratingFor } from '../scheduler/fsrs.js';
import { loadReviews, recordReview, flagCard } from '../db/reviews.js';
import { getSettings } from '../db/settings.js';
import { isRecentlyRead, type NoteReads } from '../db/note-reads.js';
import { checkCloze, renderActions, renderPrompt, shuffle } from './renderers.js';
import { issueUrl } from './flag.js';
import { renderSummary, type RatingCounts } from './summary.js';
import { noteHash } from '../route.js';

// How many OTHER cards must be shown before a learning-step card (Again/
// Hard/Good on a card that hasn't graduated to FSRS state Review) reappears
// in the same session. Re-showing it as the very next card defeats the
// point of a learning step (no chance to forget in the meantime); the
// interval itself is only 1-10 minutes (see the wrapper's measured
// values), so making the user wait for it on a phone is worse. This
// mirrors Anki's "insert behind a few other cards" policy. When fewer than
// REQUEUE_GAP cards remain, the card is appended to the end of the session
// instead -- i.e. served slightly ahead of its actual due time once
// nothing else is left, rather than making the user wait or ending the
// session with a learning card still pending.
export const REQUEUE_GAP = 3;

// Per-card cap on how many times a single card can be re-queued within one
// session. FSRS's `lapses` counter (the leech backstop that auto-suspends a
// card after LEECH_THRESHOLD, see fsrs.ts) does NOT increment while a card
// is repeatedly rated Again during its INITIAL learning steps -- only a
// graduated card lapsing back out of Review increments it (verified against
// ts-fsrs directly: 15 consecutive Agains on a fresh card stay at
// lapses=0). So the leech backstop is not a sufficient guard against a
// single session looping forever on one stubborn card, and this cap exists
// to bound it independently. Once hit, the card simply stops re-queueing
// for the rest of THIS session -- it keeps its FSRS-scheduled due time and
// will be picked up by the normal due-cards path (this session's later
// passes, or the next session) like any other due card.
export const MAX_REQUEUES_PER_CARD = 5;

/**
 * Whether a just-reviewed card should be re-queued into the current
 * session rather than considered done. Pure and DOM-free for unit testing.
 */
export function shouldRequeue(state: ReviewState, priorRequeues: number): boolean {
  if (state.suspended) return false;
  if (!isStillLearning(state)) return false;
  return priorRequeues < MAX_REQUEUES_PER_CARD;
}

/**
 * Where to splice a re-queued card back into the session array. `Math.min`
 * against `sessionLength` means: when fewer than `gap` cards remain after
 * the current one, the card lands at the very end (append) instead of
 * overflowing past it -- the "serve it slightly early once nothing else is
 * left" half of the policy above.
 */
export function requeueIndex(currentIndex: number, sessionLength: number, gap: number = REQUEUE_GAP): number {
  return Math.min(currentIndex + 1 + gap, sessionLength);
}

/**
 * Draw-time gate against serving a learning/relearning card long before its
 * actual due time. shouldRequeue/requeueIndex above decide, at RATING time,
 * whether and roughly where a card comes back -- but a card being rated is
 * by definition not yet due (its next step is 1-10 minutes out), so a
 * `due <= now` check can't live there; it would make requeueing never
 * happen. It has to live here instead, called from advance() at the moment
 * the cursor steps onto a new card, once real time may have passed.
 *
 * "Ready" means either the card has no `reviewStates` entry at all (an
 * unseen new card, always presentable) or its FSRS `due` has arrived.
 * Starting from `index` and scanning forward, the first ready card is
 * rotated up to `index`; everything in between shifts back by one, so no
 * card is ever dropped, only reordered. If the card already at `index` is
 * ready, or nothing ahead of it is ready either, nothing happens --
 * deliberately: with no ready card in the remaining session, serving the
 * not-yet-due card slightly early is the existing "learn ahead" policy
 * (see REQUEUE_GAP's doc comment), and it's better than stalling or ending
 * the session with it still pending.
 */
export function promoteReady(
  session: StoredCard[],
  index: number,
  reviewStates: Map<string, ReviewState>,
  now: Date
): void {
  const nowMs = now.getTime();
  const isReady = (c: StoredCard): boolean => {
    const state = reviewStates.get(c.id);
    return !state || state.due <= nowMs;
  };

  for (let j = index; j < session.length; j++) {
    const candidate = session[j];
    if (!candidate || !isReady(candidate)) continue;
    if (j !== index) {
      const [promoted] = session.splice(j, 1);
      session.splice(index, 0, promoted as StoredCard);
    }
    return;
  }
}

/**
 * Returns the mcq choice order to present for `index`, reusing `cache`
 * when it already belongs to that index and computing (and shuffling)
 * a fresh order otherwise. Pure and DOM-free so it's unit-testable on
 * its own: the same cache/index pair always returns the SAME array,
 * which is what keeps the unrevealed and revealed renders of a single
 * card presentation in agreement about which button is which.
 */
export function getPresentationChoices(
  card: StoredCard,
  cache: { index: number; choices: Choice[] } | null,
  index: number,
  rng: () => number = Math.random
): { index: number; choices: Choice[] } {
  if (card.format !== 'mcq') return { index, choices: [] };
  if (cache && cache.index === index) return cache;
  return { index, choices: shuffle(card.choices ?? [], rng) };
}

export type HighlightClass = 'is-correct' | 'is-wrong' | null;

/**
 * Decides which mcq choice buttons get which highlight class once a
 * choice has been tapped. Matches the tapped choice by its position in
 * `choices` (mirroring the DOM's data-choice index match) rather than
 * by searching for "the correct one at index 0", so it works the same
 * whether or not the choices were shuffled.
 */
export function highlightClasses(choices: Choice[], tappedIndex: number): HighlightClass[] {
  return choices.map((choice, index) => {
    if (choice.correct) return 'is-correct';
    if (index === tappedIndex) return 'is-wrong';
    return null;
  });
}

/**
 * The session progress denominator: the count of DISTINCT cards in the
 * session. Must be captured ONCE, before any requeue splices more entries
 * into the (mutated-by-reference) session array -- otherwise it climbs as
 * learning cards requeue (observed going 1/10 -> 2/11 -> 3/12 within three
 * cards), which reads as losing ground rather than the requeue policy
 * working as designed.
 */
export function distinctCardCount(session: StoredCard[]): number {
  return new Set(session.map((c) => c.id)).size;
}

/**
 * The session progress numerator: how many DISTINCT cards have been shown
 * up to and including `index`. A requeued card reoccupies a new slot
 * later in `session`, but its id was already counted the first time it
 * was shown, so reaching that slot again does not advance the numerator
 * -- exactly mirroring distinctCardCount's denominator, which also never
 * counts a requeue as a new card.
 */
export function distinctPosition(session: StoredCard[], index: number): number {
  const seen = new Set<string>();
  const end = Math.min(index, session.length - 1);
  for (let i = 0; i <= end; i++) {
    const card = session[i];
    if (card) seen.add(card.id);
  }
  return seen.size;
}

/**
 * Removes cards from a LIVE session whose notes were read during a detour
 * into the note viewer, returning the survivors.
 *
 * Three invariants, all pinned by tests:
 *
 * 1. Nothing at or before `index` is removed. Those cards are already
 *    rated, or are the one on screen that still owes a rating.
 * 2. `arrivedFrom` is never removed. Currently subsumed by rule 1 (a note
 *    is only ever opened from the card at `index`), but stated separately
 *    so a future change to how notes are reached cannot silently break it.
 * 3. Removals happen strictly AFTER the cursor, so `index` stays valid.
 *    This is what keeps the change away from requeueIndex/promoteReady,
 *    which are the most delicate code in this file: neither ever observes
 *    a shifted cursor.
 */
export function dropRecentlyRead(
  session: StoredCard[],
  index: number,
  drop: ReadonlySet<string>,
  arrivedFrom: string | null
): StoredCard[] {
  return session.filter((card, i) => {
    if (i <= index) return true;
    if (card.id === arrivedFrom) return true;
    return !drop.has(card.id);
  });
}

/** Maps an FSRS Rating to the key summary.ts's per-rating breakdown uses. Rating.Manual never reaches here -- applyRating/ratingFor never produce it. */
function ratingKey(rating: Rating): keyof RatingCounts {
  switch (rating) {
    case Rating.Again:
      return 'again';
    case Rating.Hard:
      return 'hard';
    case Rating.Good:
      return 'good';
    case Rating.Easy:
      return 'easy';
    default:
      throw new Error(`Unexpected rating for summary tally: ${String(rating)}`);
  }
}

/**
 * The handle `main.ts` keeps on a suspended review screen. The screen is
 * resumed by reattaching its detached DOM node, so NO code in this module
 * runs on resume -- this is the only hook through which the outside world
 * can tell a live session that something changed while it was set aside.
 */
export interface ReviewController {
  dropRead(reads: NoteReads, now: Date, windowHours: number): void;
}

export interface ReviewDeps {
  db: FactotumDb;
  session: StoredCard[];
  repo: string;
  onDone: (reviewed: number) => void;
}

export async function startReview(root: HTMLElement, deps: ReviewDeps): Promise<ReviewController> {
  const settings = await getSettings(deps.db);
  let index = 0;
  let reviewed = 0;

  // Captured ONCE, before any requeue splices into deps.session. See
  // distinctCardCount's doc comment.
  //
  // `let`, not `const`: dropRead below shrinks the session when the reader
  // detours into a note, and the denominator has to follow or the progress
  // bar overruns 100%. Requeues never grow it (that reasoning still holds);
  // suppression is the one thing allowed to shrink it.
  let totalCards = distinctCardCount(deps.session);

  // Current on-disk FSRS state per card, kept in sync as each submit()
  // resolves, so previewIntervals() (used for the rating row's interval
  // labels) always sees the state the NEXT rating would actually apply
  // against -- including a card's own prior requeued rating within this
  // same session.
  const reviewStates = await loadReviews(deps.db);

  // Session-level totals for the summary screen (section 5), collected
  // in-session as cards are graded rather than re-querying reviewLog, so
  // the summary reflects exactly the session just finished.
  const ratingCounts: RatingCounts = { again: 0, hard: 0, good: 0, easy: 0 };
  let totalDurationMs = 0;
  const sessionStartedAt = Date.now();

  // Guards against double-taps (and any other re-entrant handler firing)
  // recording a card more than once. A rendered card sets this true the
  // instant any handler starts down a path that ends in submit()/advance()
  // /finishSession(), and it is only ever reset back to false when the
  // NEXT card is drawn — never inside a handler — so a second tap on the
  // same card, no matter how fast, finds it already true and returns
  // immediately. The header's × (finishSession) follows the same rule.
  let submitting = false;

  // How many times each card has already been re-queued in THIS session
  // (see shouldRequeue / MAX_REQUEUES_PER_CARD). Keyed by card id rather
  // than array position since a re-queued card occupies a NEW position
  // each time it reappears.
  const requeueCounts = new Map<string, number>();

  // Shuffled mcq choice order for the card currently on screen. Computed
  // once per card presentation (see getPresentationChoices) and reused
  // across both the unrevealed render and the revealed re-render that
  // follows a tap, so the two renders never disagree on ordering.
  let choicesCache: { index: number; choices: Choice[] } | null = null;

  // Visual feedback for the guard: once a tap is accepted, every button on
  // the current card looks inert rather than silently ignoring further taps.
  const lockControls = (): void => {
    root.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      button.disabled = true;
    });
  };

  // Ends the session -- either it ran out of cards, or the header × was
  // tapped -- and shows the completion screen instead of routing straight
  // back out. Every card up to this point was already persisted by
  // recordReview as it was graded, so there is nothing to lose by cutting
  // a session short. Done, on the summary screen, is what actually invokes
  // deps.onDone.
  const finishSession = (): void => {
    renderSummary(root, {
      cardsReviewed: reviewed,
      timeSpentMs: Date.now() - sessionStartedAt,
      ratingCounts,
      onDone: () => deps.onDone(reviewed)
    });
  };

  const advance = (): void => {
    index += 1;
    if (index >= deps.session.length) return finishSession();
    // The draw-time half of the requeue policy (see promoteReady). It runs
    // HERE, at the one moment the cursor moves onto a new card -- NOT at the
    // top of draw(), which is also called to RE-render the card already on
    // screen after a reveal (draw(true, ...)) and on the way back from a
    // note detour. Reordering the session under a re-render would swap a
    // different card into `index` between the question and its answer: the
    // user would be shown the reveal of a card they never saw the question
    // for, and the rating they then tap would be recorded against it.
    promoteReady(deps.session, index, reviewStates, new Date());
    draw(false);
  };

  const submit = async (card: StoredCard, outcome: Outcome, startedAt: number): Promise<void> => {
    const durationMs = Date.now() - startedAt;
    const next = await recordReview(deps.db, {
      card,
      outcome,
      now: new Date(),
      desiredRetention: settings.desiredRetention,
      durationMs
    });
    reviewStates.set(card.id, next);
    reviewed += 1;
    totalDurationMs += durationMs;
    ratingCounts[ratingKey(ratingFor(outcome))] += 1;

    // Every rating still reaches FSRS exactly as above, unchanged; this
    // only decides whether the SAME card comes back later in this session
    // (deps.session is a plain array, mutated by reference -- splicing it
    // here is visible to the `advance`/`draw` closures below without any
    // extra state threading). `index` is the position just reviewed, so
    // insertion is relative to it, before `advance()` below moves past it.
    const priorRequeues = requeueCounts.get(card.id) ?? 0;
    if (shouldRequeue(next, priorRequeues)) {
      requeueCounts.set(card.id, priorRequeues + 1);
      deps.session.splice(requeueIndex(index, deps.session.length), 0, card);
    }

    advance();
  };

  function draw(
    revealed: boolean,
    pendingOutcome: 'correct' | 'wrong' | 'self-graded' | null = null,
    typedAnswer?: string
  ): void {
    const card = deps.session[index];
    if (!card) return finishSession();

    // A fresh render always starts unlocked, whether this is a new card or
    // the same card re-rendered after a reveal.
    submitting = false;

    choicesCache = getPresentationChoices(card, choicesCache, index);
    const choices = choicesCache.choices;

    // The rating row (qa/recall, and cloze's self-graded reveal only --
    // mcq and typed cloze grade themselves via ratingFor and keep their
    // Continue button instead) previews each grade's next interval.
    // Computed only when that row is actually about to render: it needs a
    // DB round-trip's worth of state, but that state is already loaded
    // into reviewStates up front, so this is a pure, synchronous lookup.
    const showsRatingRow =
      revealed && (card.format === 'qa' || card.format === 'recall' || (card.format === 'cloze' && pendingOutcome === 'self-graded'));
    const preview = showsRatingRow
      ? previewIntervals(reviewStates.get(card.id) ?? initialState(card.id, new Date()), new Date(), settings.desiredRetention)
      : undefined;

    const startedAt = Date.now();
    const position = distinctPosition(deps.session, index);
    root.innerHTML = `
      <section class="screen review">
        <header class="review-header">
          <div class="review-top">
            <span class="review-counter">${position} / ${totalCards}</span>
            <button class="review-close" data-role="close" aria-label="End session">×</button>
          </div>
          <div class="progress"><i style="width:${(position / totalCards) * 100}%"></i></div>
        </header>
        <div class="review-body">
          ${renderPrompt(card, revealed, { outcome: pendingOutcome ?? undefined, typedAnswer })}
        </div>
        <div class="review-actions">
          ${renderActions(card, revealed, choices, pendingOutcome ?? undefined, preview)}
        </div>
      </section>
    `;

    // Ends the session on demand. Guarded exactly like every other control
    // here: the instant it's tapped, submitting flips true and further taps
    // (on this now-frozen card) are inert. Nothing to await -- unlike
    // submit(), finishSession() doesn't record anything itself, it only
    // shows the completion screen -- so there's no reset-on-the-next-draw
    // concern; this card's render is simply done.
    root.querySelector('[data-role="close"]')?.addEventListener('click', () => {
      if (submitting) return;
      submitting = true;
      lockControls();
      finishSession();
    });

    root.querySelector('[data-role="flag"]')?.addEventListener('click', () => {
      if (submitting) return;
      submitting = true;
      lockControls();
      const now = new Date();
      void flagCard(deps.db, card.id, now).then(() => {
        window.open(issueUrl(card, deps.repo), '_blank');
        advance();
      });
    });

    // Shared by qa/recall's "Rate yourself"/"Show answer" AND, now, cloze's
    // "Show answer" (skip typing, self-grade instead). Only cloze needs a
    // pendingOutcome here — 'self-graded' — so renderActions renders the
    // rating row instead of the typed correct/wrong one; qa/recall ignore
    // pendingOutcome entirely. Either way this never calls submit() itself,
    // so it doesn't need the `submitting` guard: the actual recording
    // happens when a rating button is tapped afterward, via the SAME
    // generic `[data-outcome]` handler below that qa/recall's rating row
    // already uses — no separate grading path to duplicate.

    // Opening a note is a READ, not a judgement on the card. Unlike every
    // other handler here, it must NOT set `submitting`, lock controls,
    // record anything, or advance — the reader opens the note, comes back,
    // and still grades the card themselves. Do not copy the flag handler's
    // shape onto this one, and note it must stay outside the `submitting`
    // guard that now also fronts the header's × (finishSession).
    //
    // This now opens the in-app viewer rather than an obsidian:// deep
    // link. The deep link only worked with Obsidian installed and the vault
    // synced to the device, which on the iPhone -- the app's actual target,
    // with the vault living in the repo -- it generally is not. Obsidian
    // moved into the viewer's own header, where it is still the better tool
    // for editing on a Mac.
    //
    // The card id rides along so the viewer can leave THIS card unmasked:
    // it is due by definition, but you have just answered it.
    //
    // This assignment fires `hashchange`, which main.ts routes on — unlike
    // the obsidian:// window.open it replaced, which merely suspended the
    // PWA. The session is NOT rebuilt on the way back: main.ts detaches this
    // screen's DOM node and re-attaches it, so every closure variable above
    // (index, reviewed, ratingCounts, sessionStartedAt, requeueCounts, the
    // spliced deps.session) survives the detour untouched. Read that
    // retention machinery before changing anything about how this navigates.
    root.querySelector('[data-role="source"]')?.addEventListener('click', () => {
      window.location.hash = noteHash(card.source.path, card.id);
    });

    root.querySelector('[data-role="reveal"]')?.addEventListener('click', () => {
      draw(true, card.format === 'cloze' ? 'self-graded' : undefined);
    });

    root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        if (revealed || submitting) return;
        submitting = true;
        lockControls();
        const correct = button.dataset['correct'] === 'true';
        const tappedIndex = Number(button.dataset['choice']);
        // Reveal first — the answer and its citation stay on screen until
        // Continue, which is where the rating is actually recorded. draw()
        // resets `submitting` for the revealed render, so Continue works.
        // choicesCache is already set for this card index, so the reveal
        // render below reuses the exact same (already-shuffled) order.
        draw(true, correct ? 'correct' : 'wrong');
        // INVARIANT: `choices` here must stay the closure variable from the
        // enclosing draw() (cache-backed via getPresentationChoices), never
        // a fresh lookup or re-shuffle — it has to be the exact order the
        // user just saw and tapped, or this highlight marks the wrong button.
        // A badge (A/B/C/D) is rendered by renderActions purely off each
        // choice's RENDERED position too, so it can never drift from which
        // button this highlight actually lands on.
        const classes = highlightClasses(choices, tappedIndex);
        root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((b) => {
          const highlight = classes[Number(b.dataset['choice'])];
          if (highlight) b.classList.add(highlight);
        });
      });
    });

    // Mirrors the mcq tap handler: mark correct/wrong and re-render revealed
    // (with citations and, for a wrong answer, the override and what was
    // typed) rather than submitting immediately — a correct cloze was
    // previously advancing with no confirmation and no citation, the same
    // bug Task 16 already fixed for mcq. draw() resets `submitting` for the
    // revealed render, so Continue/override still work.
    const runCheck = (): void => {
      if (submitting) return;
      submitting = true;
      lockControls();
      const input = root.querySelector<HTMLInputElement>('[data-role="cloze-input"]');
      const typed = input?.value ?? '';
      const correct = checkCloze(typed, card.answer ?? '');
      draw(true, correct ? 'correct' : 'wrong', typed);
    };

    root.querySelector('[data-role="check"]')?.addEventListener('click', runCheck);

    // Submit on Enter, using the platform's keyboard action (enterkeyhint on
    // the input). There's no <form> here, so Enter never also triggers a
    // native submit — this listener is the only path — and it shares the
    // exact same `runCheck` (and therefore the same `submitting` guard) as
    // the Check button, so the two can never double-fire against each other.
    root.querySelector<HTMLInputElement>('[data-role="cloze-input"]')?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      runCheck();
    });

    root.querySelectorAll<HTMLButtonElement>('[data-outcome]').forEach((button) => {
      button.addEventListener('click', () => {
        if (submitting) return;
        submitting = true;
        lockControls();
        const value = button.dataset['outcome'];
        // 'continue' only ever renders for a typed correct/wrong reveal (never
        // for the self-graded one, which has its own rating row instead), so
        // narrowing to 'correct'/'wrong' here — rather than passing
        // pendingOutcome through as-is — keeps this an Outcome for submit().
        if (value === 'continue') return void submit(card, pendingOutcome === 'correct' ? 'correct' : 'wrong', startedAt);
        if (value === 'override') return void submit(card, 'correct', startedAt);
        void submit(card, value as Outcome, startedAt);
      });
    });
  }

  const dropRead = (reads: NoteReads, at: Date, windowHours: number): void => {
    const drop = new Set(
      deps.session
        // A card with review state is a due card; a new card is never
        // suppressed (see selectNotRecentlyRead's comment for why).
        .filter((c) => reviewStates.has(c.id) && isRecentlyRead(reads, c.source.path, at, windowHours))
        .map((c) => c.id)
    );
    if (drop.size === 0) return;

    const current = deps.session[index] ?? null;
    const survivors = dropRecentlyRead(deps.session, index, drop, current?.id ?? null);
    if (survivors.length === deps.session.length) return;
    // Captured before the splice below overwrites deps.session with
    // survivors, which would otherwise leave this at 0.
    const removedCount = deps.session.length - survivors.length;

    // splice, never reassign: deps.session is owned by main.ts and this
    // module's closure captured THIS array. Rebinding it would leave the
    // screen rendering from an array nobody else can see.
    deps.session.splice(0, deps.session.length, ...survivors);
    totalCards = distinctCardCount(deps.session);

    // Patch the header in place rather than calling draw(): a redraw would
    // rebuild the current card and throw away the revealed state the
    // reader left it in, which the note detour exists to preserve.
    const position = distinctPosition(deps.session, index);
    const counter = root.querySelector('.review-counter');
    if (counter) counter.textContent = `${position} / ${totalCards}`;
    const bar = root.querySelector<HTMLElement>('.progress i');
    // totalCards can only reach 0 here if suppression removed every
    // remaining card; guard against a NaN width rather than divide by it.
    if (bar && totalCards > 0) bar.style.width = `${(position / totalCards) * 100}%`;

    // Names what just happened -- the spec requires "a line on return
    // naming the deferred cards" rather than letting the counter silently
    // shrink with no explanation. Appended to the header (not the body),
    // since draw() rebuilds root.innerHTML wholesale for every subsequent
    // card, this line disappears the instant the reader moves on -- that
    // is intentional, it explains THIS return, not the rest of the session.
    const header = root.querySelector('.review-header');
    if (header) {
      const noun = removedCount === 1 ? 'card' : 'cards';
      const notice = document.createElement('p');
      notice.className = 'review-deferred';
      notice.textContent = `${removedCount} ${noun} deferred — you read their notes`;
      header.appendChild(notice);
    }
  };

  draw(false);

  return { dropRead };
}
