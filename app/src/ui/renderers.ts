import type { StoredCard } from '../db/schema.js';
import type { Choice } from '../../../pipeline/src/types.js';
import type { IntervalPreview } from '../scheduler/fsrs.js';
import { categoryLabel } from './labels.js';

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

/**
 * Applies exactly three inline markup constructs to already-escaped text:
 * `code` -> <code>code</code>, **bold** -> <strong>bold</strong>, and
 * *italic* -> <em>italic</em>. Must run AFTER escapeHtml — it never escapes
 * anything itself, it only wraps spans in the three tags above, so it can
 * never reintroduce an HTML injection path.
 *
 * Approach: tokenize backtick code spans first (splitting the string into
 * literal-code chunks and the plain-text gaps between them), then run
 * emphasis (** before *) only over the gap chunks. This guarantees markers
 * inside a code span are never touched, and that `**` is preferred over `*`
 * so `**x**` becomes <strong>x</strong> rather than <em>*x*</em>.
 *
 * Emphasis markers require flanking, deliberately stricter than CommonMark:
 * an opening marker must be preceded by start-of-string/whitespace/opening
 * punctuation and followed by a non-space character; a closing marker must
 * be preceded by a non-space character and followed by end-of-string,
 * whitespace, or punctuation. This is what keeps `*` used as multiplication
 * or a pointer/dereference sigil (e.g. `c*g(n)`, `O(E * |f*|)`) from being
 * mistaken for an emphasis delimiter — this deck's algorithm notation uses
 * bare `*` for arithmetic far more often than for italics, so a marker
 * without both sides properly flanked is left completely literal, even if
 * an unrelated marker later in the string could otherwise "close" it.
 */
export function inlineMarkup(value: string): string {
  // Split on complete backtick spans: `...`. Odd-indexed pieces are code.
  const parts = value.split(/(`[^`]+`)/g);
  return parts
    .map((part) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return `<code>${part.slice(1, -1)}</code>`;
      }
      return applyEmphasis(part);
    })
    .join('');
}

// A marker "opens" only right after start-of-string, whitespace, or opening
// punctuation, and only when immediately followed by a non-space character.
const OPEN_BEFORE = String.raw`(?<=^|[\s(\[{"'“‘])`;
// A marker "closes" only right before end-of-string, whitespace, or
// punctuation, and only when immediately preceded by a non-space character
// (guaranteed by requiring the content to start/end on \S below).
const CLOSE_AFTER = String.raw`(?=$|[\s\p{P}])`;
const BOLD_RE = new RegExp(String.raw`${OPEN_BEFORE}\*\*(\S(?:[^*]*\S)?)\*\*${CLOSE_AFTER}`, 'gu');
const ITALIC_RE = new RegExp(String.raw`${OPEN_BEFORE}\*(\S(?:[^*]*\S)?)\*${CLOSE_AFTER}`, 'gu');

function applyEmphasis(text: string): string {
  // ** before *, each only replacing flanked pairs (see regexes above).
  let result = text.replace(BOLD_RE, '<strong>$1</strong>');
  result = result.replace(ITALIC_RE, '<em>$1</em>');
  return result;
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

/**
 * Marks the blank a cloze prompt was built around. The pipeline
 * (pipeline/src/cards.ts, blockClozeCards) writes it as a literal `___`,
 * but this is deliberately a "3 or more underscores" match rather than an
 * exact-string one, so a hand-edited or future-format variant (`____`)
 * still gets recognised rather than silently falling through to the
 * append fallback below.
 */
const CLOZE_BLANK = /_{3,}/;

export interface ClozeRevealInfo {
  /** How this cloze reveal was reached — mirrors renderActions' clozeOutcome. */
  outcome?: 'correct' | 'wrong' | 'self-graded';
  /** What the user actually typed, when `outcome` is 'wrong'. Undefined otherwise. */
  typedAnswer?: string;
}

/**
 * Substitutes the answer into a revealed cloze prompt's blank rather than
 * showing it detached below — the sentence completes itself. Tinted
 * `--ok` on a correct typed answer, `--accent` otherwise (a wrong typed
 * answer, or "Show answer" tapped with nothing typed at all — both cases
 * where what's inserted is the answer key, not something the user
 * produced themselves).
 *
 * Runs the substitution on the already-escaped-and-marked-up prompt HTML
 * (not the raw prompt), so it never reopens an injection path: `___`
 * survives both escapeHtml and inlineMarkup untouched, so matching it
 * afterwards is safe. If no blank is found at all (a malformed/legacy
 * card), the filler is appended in parentheses instead of silently
 * dropped.
 */
function substituteClozeBlank(card: StoredCard, reveal: ClozeRevealInfo): string {
  const promptHtml = inlineMarkup(escapeHtml(card.prompt));
  const tint = reveal.outcome === 'correct' ? 'is-ok' : 'is-accent';
  const filler = `<span class="cloze-fill ${tint}">${inlineMarkup(escapeHtml(card.answer ?? ''))}</span>`;
  if (CLOZE_BLANK.test(promptHtml)) return promptHtml.replace(CLOZE_BLANK, filler);
  return `${promptHtml} (${filler})`;
}

/**
 * Short text label for a revealed cloze's state (WCAG 1.4.1: colour alone
 * cannot be the only thing telling a correct reveal apart from a
 * self-graded one). Wrong already has non-colour signals — the "you
 * typed" line and the override button both only ever appear on a wrong
 * reveal — but correct and self-graded differ ONLY by --ok green versus
 * --accent ochre otherwise, which is not a safe distinction for a
 * deuteranopic reader. This never touches the substitution itself
 * (the answer stays inline in the blank); it's an additional short
 * caption, not a reversion to the old detached "Correct"/"Not quite" line.
 */
function clozeStateLabel(outcome: ClozeRevealInfo['outcome']): string {
  switch (outcome) {
    case 'correct':
      return 'Correct';
    case 'wrong':
      return 'Not quite';
    case 'self-graded':
      return 'Answer revealed';
    default:
      return '';
  }
}

function clozeStateTint(outcome: ClozeRevealInfo['outcome']): string {
  return outcome === 'correct' ? 'is-ok' : outcome === 'wrong' ? 'is-bad' : 'is-accent';
}

/**
 * Renders the review screen's scrolling body: category chip, the prompt
 * itself (left-aligned, serif), and — once revealed — everything that
 * completes the "answer" for the reader: the cloze substitution (or a
 * qa/recall answer paragraph), what the user typed if a cloze answer was
 * wrong, and citations. Interactive controls (buttons, the cloze input,
 * mcq choices) live in renderActions instead, so this stays plain content
 * that can grow past one screen and scroll without dragging any control
 * out of reach.
 */
export function renderPrompt(card: StoredCard, revealed = false, reveal: ClozeRevealInfo = {}): string {
  const chip = `<span class="chip">${escapeHtml(categoryLabel(card.category, card.topic))}</span>`;

  const isCloze = card.format === 'cloze';
  const promptHtml = isCloze && revealed ? substituteClozeBlank(card, reveal) : inlineMarkup(escapeHtml(card.prompt));

  const typedWrong =
    isCloze && revealed && reveal.outcome === 'wrong' && reveal.typedAnswer
      ? `<p class="cloze-typed">You typed: ${inlineMarkup(escapeHtml(reveal.typedAnswer))}</p>`
      : '';

  // aria-live="polite" so a screen-reader user is told the reveal happened
  // at all -- this is a same-page DOM swap with no navigation and no focus
  // move, so without this there is no notification whatsoever. Kept to a
  // two-or-three-word label, not a re-read of the prompt, so it doesn't
  // drown out the substitution above it.
  const clozeState =
    isCloze && revealed && reveal.outcome
      ? `<p class="cloze-state ${clozeStateTint(reveal.outcome)}" aria-live="polite">${clozeStateLabel(reveal.outcome)}</p>`
      : '';

  // mcq's "answer" is its choice buttons (rendered by renderActions), and
  // a cloze's answer is now inline in the prompt above — neither format
  // gets a separate expected-answer paragraph here.
  const expected =
    revealed && !isCloze && card.format !== 'mcq' && card.answer
      ? `<p class="expected">${inlineMarkup(escapeHtml(card.answer))}</p>`
      : '';

  const recallHint =
    revealed && card.format === 'recall' && !card.answer
      ? `<p class="citation">How did you do? Rate yourself below.</p>`
      : '';

  const citationsHtml = revealed ? citations(card) : '';

  return `
    <div class="prompt-area">
      ${chip}
      ${typedWrong}
      <p class="prompt">${promptHtml}</p>
      ${clozeState}
      ${expected}
      ${recallHint}
      ${citationsHtml}
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

const RATING_OUTCOMES = ['again', 'hard', 'good', 'easy'] as const;

/**
 * Two-line rating buttons: the label on top, the previewed next interval
 * ("10m", "4d", ...) beneath it in --text-micro/--dim. `preview` is
 * optional so a caller without a computed IntervalPreview (there is none
 * today, but keeps this renderer usable standalone/in tests) still gets a
 * working, label-only row instead of a crash.
 */
function ratingRow(preview?: IntervalPreview): string {
  return `
    <div class="rating-row">
      ${RATING_OUTCOMES.map(
        (o) => `
        <button class="rate" data-outcome="${o}">
          <span class="rate-label">${o.charAt(0).toUpperCase()}${o.slice(1)}</span>
          ${preview ? `<span class="rate-interval">${escapeHtml(preview[o])}</span>` : ''}
        </button>`
      ).join('')}
    </div>
  `;
}

const MCQ_BADGES = ['A', 'B', 'C', 'D'];

/**
 * Renders the action area for a card: the interactive controls only
 * (buttons, the cloze input, mcq choices). Everything that is plain
 * *content* once a card is revealed — the answer itself, citations, what
 * the user typed — lives in renderPrompt's scrolling body instead, so it
 * can grow past one screen without ever pushing a control out of reach.
 *
 * For mcq cards, `mcqChoices` — when given — is used in place of
 * `card.choices` verbatim (no shuffling here; this function stays a pure,
 * order-preserving renderer). The caller (review.ts) is responsible for
 * shuffling once per card presentation and passing the SAME array back in
 * on both the unrevealed and revealed render, so the two renders agree on
 * which button is which. Each choice's A/B/C/D badge is tied to its
 * RENDERED position (`index` into the already-shuffled `mcqChoices`), not
 * to anything about the underlying choice, so a badge always matches the
 * button a reveal highlights.
 *
 * `clozeOutcome` carries how a revealed cloze got here — 'correct' or
 * 'wrong' once review.ts has checked a typed answer, or 'self-graded' when
 * the user tapped "Show answer" instead of typing — so this function can
 * render the matching controls: typed-correct just needs Continue;
 * typed-wrong keeps the "I actually knew this" override alongside it; and
 * self-graded shows the four rating buttons with no override, since the
 * user never claimed an answer for there to be anything to override.
 *
 * `preview` is the previewIntervals() result for the card on screen, shown
 * as the second line of each rating button (qa/recall, and cloze's
 * self-graded reveal). mcq and typed-cloze grade themselves via ratingFor
 * and never render a rating row, so `preview` is unused for them.
 */
export function renderActions(
  card: StoredCard,
  revealed: boolean,
  mcqChoices?: Choice[],
  clozeOutcome?: 'correct' | 'wrong' | 'self-graded',
  preview?: IntervalPreview
): string {
  // The source link is offered ONLY once a card is revealed. The linked
  // note contains the answer, so surfacing it before the reader has
  // committed to a guess would be a one-tap spoiler. That is the feature
  // working correctly, not an oversight — do not promote it to an
  // always-shown button.
  //
  // Upstream expressed this by having only the revealed branches call
  // `tail` while the pre-reveal ones called `flagButton()` directly. That
  // no longer works here: citations moved out of `tail` into renderPrompt
  // (the scrolling body), so every branch now ends in the same button
  // group and the distinction was carried purely by which one was called.
  // Gating on `revealed` keeps the rule in one place instead, where it
  // cannot be lost by a branch being edited to call the wrong helper.
  const tail = revealed ? `${flagButton()}${sourceButton()}` : flagButton();

  if (card.format === 'mcq') {
    const choiceList = mcqChoices ?? card.choices ?? [];
    const choices = choiceList
      .map(
        (choice, index) =>
          `<button class="choice" data-choice="${index}" data-correct="${choice.correct}"
                 ${revealed ? 'disabled' : ''}>
             <span class="choice-badge">${MCQ_BADGES[index] ?? ''}</span>
             <span class="choice-text">${inlineMarkup(escapeHtml(choice.text))}</span>
           </button>`
      )
      .join('');
    // Revealed state keeps the marked choices on screen; citations move to
    // the body (renderPrompt), so a wrong answer is still seen next to its
    // source, just as content rather than as part of the control row.
    const after = revealed ? `<button class="btn" data-outcome="continue">Continue</button>${tail}` : flagButton();
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
          ${tail}
        </div>
      `;
    }
    // "Show answer" skips typing entirely and self-grades like a qa card:
    // the rating row, no correct/wrong claim was ever made so there's
    // nothing to confirm or override.
    if (clozeOutcome === 'self-graded') {
      return `<div class="action-area">${ratingRow(preview)}${tail}</div>`;
    }
    // Revealed state distinguishes correct from wrong: a correct answer
    // just needs Continue; a wrong one keeps the override, since a correct
    // answer has nothing for "I actually knew this" to override.
    const isCorrect = clozeOutcome === 'correct';
    const override = isCorrect ? '' : `<button class="btn-quiet" data-outcome="override">I actually knew this</button>`;
    return `
      <div class="action-area">
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
    return `<div class="action-area"><button class="btn" data-role="reveal">${label}</button>${tail}</div>`;
  }
  return `<div class="action-area">${ratingRow(preview)}${tail}</div>`;
}
