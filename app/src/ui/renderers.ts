import type { StoredCard } from '../db/schema.js';

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

export function renderActions(card: StoredCard, revealed: boolean): string {
  const tail = `${citations(card)}${flagButton()}`;

  if (card.format === 'mcq') {
    const choices = (card.choices ?? [])
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
    return `<div class="action-area">${choices}${after}</div>`;
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
    return `
      <div class="action-area">
        <p class="expected">${escapeHtml(card.answer ?? '')}</p>
        <button class="btn" data-outcome="continue">Continue</button>
        <button class="btn-quiet" data-outcome="override">I actually knew this</button>
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
