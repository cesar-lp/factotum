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
 * `clozeOutcome` carries whether a revealed cloze's typed answer was
 * correct or wrong — set by review.ts once it has checked the input — so
 * this function can render the matching feedback and, for a correct
 * answer, suppress the "I actually knew this" override (meaningless when
 * the user was already right).
 */
export function renderActions(
  card: StoredCard,
  revealed: boolean,
  mcqChoices?: Choice[],
  clozeOutcome?: 'correct' | 'wrong'
): string {
  const tail = `${citations(card)}${flagButton()}`;

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
      return `
        <div class="action-area">
          <input class="answer-input" data-role="cloze-input" autocapitalize="off"
                 autocomplete="off" autocorrect="off" placeholder="type answer" />
          <button class="btn" data-role="check">Check</button>
          ${flagButton()}
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
    return `<div class="action-area"><button class="btn" data-role="reveal">Show answer</button>${flagButton()}</div>`;
  }
  return `
    <div class="action-area">
      ${card.answer ? `<p class="expected">${escapeHtml(card.answer)}</p>` : ''}
      ${ratingRow()}
      ${tail}
    </div>
  `;
}
