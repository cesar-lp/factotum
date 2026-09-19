import type { FactotumDb, ReviewState, StoredCard } from '../db/schema.js';
import type { Choice } from '../../../pipeline/src/types.js';
import type { Outcome } from '../scheduler/fsrs.js';
import { isStillLearning } from '../scheduler/fsrs.js';
import { recordReview, flagCard } from '../db/reviews.js';
import { getSettings } from '../db/settings.js';
import { checkCloze, renderActions, renderPrompt, shuffle } from './renderers.js';
import { issueUrl } from './flag.js';

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

export interface ReviewDeps {
  db: FactotumDb;
  session: StoredCard[];
  repo: string;
  onDone: (reviewed: number) => void;
}

export async function startReview(root: HTMLElement, deps: ReviewDeps): Promise<void> {
  const settings = await getSettings(deps.db);
  let index = 0;
  let reviewed = 0;

  // Guards against double-taps (and any other re-entrant handler firing)
  // recording a card more than once. A rendered card sets this true the
  // instant any handler starts down a path that ends in submit()/advance(),
  // and it is only ever reset back to false when the NEXT card is drawn —
  // never inside a handler — so a second tap on the same card, no matter
  // how fast, finds it already true and returns immediately.
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

  const advance = (): void => {
    index += 1;
    if (index >= deps.session.length) deps.onDone(reviewed);
    else draw(false);
  };

  const submit = async (card: StoredCard, outcome: Outcome, startedAt: number): Promise<void> => {
    const next = await recordReview(deps.db, {
      card,
      outcome,
      now: new Date(),
      desiredRetention: settings.desiredRetention,
      durationMs: Date.now() - startedAt
    });
    reviewed += 1;

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

  function draw(revealed: boolean, pendingOutcome: 'correct' | 'wrong' | null = null): void {
    const card = deps.session[index];
    if (!card) return deps.onDone(reviewed);

    // A fresh render always starts unlocked, whether this is a new card or
    // the same card re-rendered after a reveal.
    submitting = false;

    choicesCache = getPresentationChoices(card, choicesCache, index);
    const choices = choicesCache.choices;

    const startedAt = Date.now();
    root.innerHTML = `
      <section class="screen review">
        <div class="top"><span>${index + 1} / ${deps.session.length}</span></div>
        <div class="progress"><i style="width:${(index / deps.session.length) * 100}%"></i></div>
        ${renderPrompt(card)}
        ${renderActions(card, revealed, choices, pendingOutcome ?? undefined)}
      </section>
    `;

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

    root.querySelector('[data-role="reveal"]')?.addEventListener('click', () => draw(true));

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
        const classes = highlightClasses(choices, tappedIndex);
        root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((b) => {
          const highlight = classes[Number(b.dataset['choice'])];
          if (highlight) b.classList.add(highlight);
        });
      });
    });

    // Mirrors the mcq tap handler: mark correct/wrong and re-render revealed
    // (with citations and, for a wrong answer, the override) rather than
    // submitting immediately — a correct cloze was previously advancing
    // with no confirmation and no citation, the same bug Task 16 already
    // fixed for mcq. draw() resets `submitting` for the revealed render, so
    // Continue/override still work.
    const runCheck = (): void => {
      if (submitting) return;
      submitting = true;
      lockControls();
      const input = root.querySelector<HTMLInputElement>('[data-role="cloze-input"]');
      const correct = checkCloze(input?.value ?? '', card.answer ?? '');
      draw(true, correct ? 'correct' : 'wrong');
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
        if (value === 'continue') return void submit(card, pendingOutcome ?? 'wrong', startedAt);
        if (value === 'override') return void submit(card, 'correct', startedAt);
        void submit(card, value as Outcome, startedAt);
      });
    });
  }

  draw(false);
}
