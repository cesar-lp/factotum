import type { FactotumDb, StoredCard } from '../db/schema.js';
import type { Choice } from '../../../pipeline/src/types.js';
import type { Outcome } from '../scheduler/fsrs.js';
import { recordReview, flagCard } from '../db/reviews.js';
import { getSettings } from '../db/settings.js';
import { checkCloze, renderActions, renderPrompt, shuffle } from './renderers.js';
import { issueUrl } from './flag.js';

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
    await recordReview(deps.db, {
      card,
      outcome,
      now: new Date(),
      desiredRetention: settings.desiredRetention,
      durationMs: Date.now() - startedAt
    });
    reviewed += 1;
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
    root.querySelector('[data-role="check"]')?.addEventListener('click', () => {
      if (submitting) return;
      submitting = true;
      lockControls();
      const input = root.querySelector<HTMLInputElement>('[data-role="cloze-input"]');
      const correct = checkCloze(input?.value ?? '', card.answer ?? '');
      draw(true, correct ? 'correct' : 'wrong');
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
