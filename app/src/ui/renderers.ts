import type { StoredCard } from '../db/schema.js';
import type { Choice } from '../../../pipeline/src/types.js';

/**
 * Fisher-Yates shuffle. Returns a new array; never mutates `items`.
 * `rng` defaults to Math.random but accepts an injected generator so
 * callers (and tests) can get deterministic, seeded output.
 */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = temp;
  }
  return result;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function checkCloze(input: string, expected: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(expected);
}

/**
 * True when a cloze answer is purely digits, so the input can offer a
 * numeric keyboard instead of full QWERTY. Deliberately conservative — an
 * answer with any letter, punctuation or whitespace (e.g. "SSTF", "24-bit")
 * falls back to text, since a numeric keypad would make those untypeable.
 */
export function isNumericAnswer(answer: string): boolean {
  return /^\d+$/.test(answer.trim());
}

export function renderPrompt(card: StoredCard): string {
  return `
    <div class="prompt-area">
      <span class="chip">${escapeHtml(card.category)}</span>
      <p class="prompt">${escapeHtml(card.prompt)}</p>
    </div>
  `;
}

function flagButton(): string {
  return `<button class="btn-quiet" data-role="flag">⚑ looks wrong</button>`;
}

function sourceButton(): string {
  return `<button class="btn-quiet" data-role="source">open note</button>`;
}

function citations(card: StoredCard): string {
  if (card.citations.length === 0) return '';
  return `<p class="citation">${escapeHtml(card.citations.join(' · '))}</p>`;
}

function ratingRow(): string {
  return `
    <div class="rating-row">
      ${['again', 'hard', 'good', 'easy']
        .map((o) => `<button class="rate" data-outcome="${o}">${o}</button>`)
        .join('')}
    </div>
  `;
}

/**
 * Renders the action area for a card. For mcq cards, `mcqChoices` — when
 * given — is used in place of `card.choices` verbatim (no shuffling here;
 * this function stays a pure, order-preserving renderer). The caller
 * (review.ts) is responsible for shuffling once per card presentation and
 * passing the SAME array back in on both the unrevealed and revealed
 * render, so the two renders agree on which button is which.
 *
 * `clozeOutcome` carries how a revealed cloze got here — 'correct' or
 * 'wrong' once review.ts has checked a typed answer, or 'self-graded' when
 * the user tapped "Show answer" instead of typing — so this function can
 * render the matching state: typed-correct confirms itself and shows its
 * citation; typed-wrong keeps the "I actually knew this" override; and
 * self-graded shows the answer plus the four rating buttons with NO
 * correct/wrong feedback and NO override, since the user never claimed an
 * answer for there to be anything to override.
 */
export function renderActions(
  card: StoredCard,
  revealed: boolean,
  mcqChoices?: Choice[],
  clozeOutcome?: 'correct' | 'wrong' | 'self-graded'
): string {
  // `sourceButton()` lives ONLY in `tail`, which is used exclusively by the
  // revealed branches below. The pre-reveal branches call `flagButton()`
  // directly instead of `tail`, deliberately excluding the source link —
  // the linked note contains the answer, so surfacing it before the reader
  // has committed to a guess would be a one-tap spoiler. Do not fold this
  // into a shared "always shown" button set.
  const tail = `${citations(card)}${flagButton()}${sourceButton()}`;

  if (card.format === 'mcq') {
    const choiceList = mcqChoices ?? card.choices ?? [];
    const choices = choiceList
      .map((choice, index) =>
        `<button class="choice" data-choice="${index}" data-correct="${choice.correct}"
                 ${revealed ? 'disabled' : ''}>
           ${escapeHtml(choice.text)}
         </button>`
      )
      .join('');
    // Revealed state keeps the marked choices on screen and adds citations,
    // so a wrong answer is seen next to its source before moving on.
    const after = revealed
      ? `<button class="btn" data-outcome="continue">Continue</button>${tail}`
      : flagButton();
    return `<div class="action-area action-area--mcq">${choices}${after}</div>`;
  }

  if (card.format === 'cloze') {
    if (!revealed) {
      const numeric = isNumericAnswer(card.answer ?? '');
      return `
        <div class="action-area">
          <input class="answer-input" data-role="cloze-input" autocapitalize="off"
                 autocomplete="off" autocorrect="off" enterkeyhint="done"
                 ${numeric ? 'inputmode="numeric" pattern="[0-9]*"' : ''}
                 placeholder="type answer" />
          <button class="btn" data-role="check">Check</button>
          <button class="btn-quiet" data-role="reveal">Show answer</button>
          ${flagButton()}
        </div>
      `;
    }
    // "Show answer" skips typing entirely and self-grades like a qa card:
    // the answer plus the four rating buttons, no correct/wrong claim was
    // ever made so there's nothing to confirm or override.
    if (clozeOutcome === 'self-graded') {
      return `
        <div class="action-area">
          <p class="expected">${escapeHtml(card.answer ?? '')}</p>
          ${ratingRow()}
          ${tail}
        </div>
      `;
    }
    // Revealed state distinguishes correct from wrong (spec parity with
    // mcq's revealed branch): a correct answer confirms itself and shows
    // its citation; a wrong one keeps the override, since a correct
    // answer has nothing for "I actually knew this" to override.
    const isCorrect = clozeOutcome === 'correct';
    const feedback = isCorrect
      ? `<p class="feedback is-correct">Correct</p>`
      : `<p class="feedback is-wrong">Not quite</p>`;
    const override = isCorrect
      ? ''
      : `<button class="btn-quiet" data-outcome="override">I actually knew this</button>`;
    return `
      <div class="action-area">
        ${feedback}
        <p class="expected">${escapeHtml(card.answer ?? '')}</p>
        <button class="btn" data-outcome="continue">Continue</button>
        ${override}
        ${tail}
      </div>
    `;
  }

  if (!revealed) {
    // Keyed off whether an answer key actually exists, not off format:
    // recall cards can optionally carry one now, and a card with no answer
    // must not promise one — "Show answer" on a card that then shows
    // nothing reads as broken. A qa (or recall) card with an answer gets
    // "Show answer"; one without gets "Rate yourself" instead.
    const label = card.answer ? 'Show answer' : 'Rate yourself';
    return `<div class="action-area"><button class="btn" data-role="reveal">${label}</button>${flagButton()}</div>`;
  }
  // A recall card with no answer key would otherwise reveal into just a
  // rating row, which can read as empty rather than as the self-graded
  // format working as designed. The hint is skipped whenever an answer
  // paragraph is already rendering (keyed off card.answer, not format, so
  // a qa card that happens to be missing its answer still degrades safely
  // instead of double-hinting).
  const recallHint =
    card.format === 'recall' && !card.answer
      ? `<p class="citation">How did you do? Rate yourself below.</p>`
      : '';
  return `
    <div class="action-area">
      ${card.answer ? `<p class="expected">${escapeHtml(card.answer)}</p>` : ''}
      ${recallHint}
      ${ratingRow()}
      ${tail}
    </div>
  `;
}
