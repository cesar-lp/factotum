import type { StoredCard } from '../db/schema.js';
import type { Choice } from '../../../pipeline/src/types.js';
import type { IntervalPreview } from '../scheduler/fsrs.js';
import { categoryLabel } from './labels.js';
import { renderMath } from './math.js';

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

/**
 * Stand-in for a backslash-escaped dollar while the tokenizer runs, so `\$`
 * can never open or close a math span. NUL is legal UTF-8, so a note could in
 * principle contain this exact byte sequence -- `inlineWithMath` strips NUL
 * from its input before shielding, which is what makes this substitution
 * safe by construction rather than merely unlikely to collide.
 */
const ESCAPED_DOLLAR = '\u0000d\u0000';

const CODE_SPAN = '`[^`]+`';
// `$$...$$` is tried before `$...$`, so a display run is never parsed as two
// empty inline spans. Single-line only: a multi-line display equation is a
// `math` BLOCK (see pipeline/src/cards.ts), not an inline construct.
const DISPLAY_MATH_SPAN = String.raw`\$\$(?:[^$]+)\$\$`;
// Same flanking rules as emphasis, and for the same reason: this deck's prose
// contains bare dollar signs (prices, `$LATEST`), and a marker that is not
// properly flanked on both sides must stay literal rather than swallow the
// rest of the sentence looking for a partner.
const INLINE_MATH_SPAN = `${OPEN_BEFORE}\\$(?:\\S(?:[^$]*\\S)?)\\$${CLOSE_AFTER}`;
const MATH_TOKENS = new RegExp(`(${CODE_SPAN}|${DISPLAY_MATH_SPAN}|${INLINE_MATH_SPAN})`, 'gu');

/**
 * One token of tokenizeForMath's output: the shielded text exactly as
 * MATH_TOKENS produced it, plus whether it is a math span (display or
 * inline) as opposed to a code span or a plain-text gap.
 */
interface MathToken {
  text: string;
  isMath: boolean;
}

/**
 * Shields `\$`, splits on MATH_TOKENS, and classifies each resulting part.
 * This is the one place both inlineWithMath and markFirstBlank tokenize
 * through now, rather than each running MATH_TOKENS on its own -- that
 * duplication was exactly how the two drifted apart: inlineWithMath shielded
 * `\$` before splitting so it could never accidentally open a math span, but
 * markFirstBlank split the RAW prompt, so an escaped dollar sitting near a
 * real `$...$` span could make the two carve the same string up differently.
 * Sharing this helper makes that provably impossible: both now see the same
 * shielded split, so they agree on where every math span starts and ends.
 */
function tokenizeForMath(raw: string): MathToken[] {
  // Enforce the invariant ESCAPED_DOLLAR depends on rather than asserting it.
  // NUL is legal UTF-8 and nothing upstream strips it, so a note containing
  // the sentinel's own bytes would otherwise have them rewritten into a stray
  // dollar sign on the way out. It is not an escaping bypass -- escapeHtml
  // still runs on every non-math chunk -- but a sentinel that real content can
  // forge is not a sentinel.
  const shielded = raw.replaceAll('\u0000', '').replace(/\\\$/g, ESCAPED_DOLLAR);
  return shielded.split(MATH_TOKENS).map((part) => {
    const text = part ?? '';
    const isDisplay = text.startsWith('$$') && text.endsWith('$$') && text.length >= 4;
    const isInline = !isDisplay && text.startsWith('$') && text.endsWith('$') && text.length >= 2;
    return { text, isMath: isDisplay || isInline };
  });
}

/**
 * Entry point for any text that may contain math. Takes RAW, unescaped text
 * -- unlike `inlineMarkup`, which requires pre-escaped input.
 *
 * The inversion is forced by KaTeX: it needs real LaTeX, so `x < y` must
 * reach it as `x < y` and not as `x &lt; y`, which it would typeset as the
 * literal entity. Escaping therefore cannot happen up front for the whole
 * string; it happens per non-math chunk instead.
 *
 * Code spans are tokenized in the SAME pass as math and matched first, which
 * is what keeps `` `$connect` `` (and `` `$$.Task.Token` ``, both real vault
 * content) code rather than an opened math span. Non-math gaps are handed to
 * the existing escapeHtml -> inlineMarkup path unchanged; paired code spans
 * are consumed by this pass, so inlineMarkup only applies emphasis to the
 * gaps (an unpaired backtick can still reach a gap as a literal character,
 * which is harmless since escapeHtml runs on it regardless).
 *
 * The one piece of unescaped HTML this introduces is KaTeX's own output under
 * `trust: false`, which cannot emit caller-supplied markup. That is the whole
 * exception to renderers.ts's escape-first contract -- do not widen it.
 */
export function inlineWithMath(raw: string): string {
  return tokenizeForMath(raw)
    .map(({ text: part }) => {
      if (part === '') return '';
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        // Same output as inlineMarkup's code branch; produced here because
        // the span was consumed by this pass rather than that one.
        return `<code>${escapeHtml(unshieldLiteral(part.slice(1, -1)))}</code>`;
      }
      if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
        return renderMath(unshieldLatex(part.slice(2, -2)).trim(), true);
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
        return renderMath(unshieldLatex(part.slice(1, -1)).trim(), false);
      }
      return inlineMarkup(escapeHtml(unshieldLiteral(part)));
    })
    .join('');
}

/** Outside math, a shielded `\$` was only ever a literal dollar sign. */
function unshieldLiteral(text: string): string {
  return text.replaceAll(ESCAPED_DOLLAR, '$');
}

/** Inside math, `\$` is LaTeX's own escape and must survive as such. */
function unshieldLatex(text: string): string {
  return text.replaceAll(ESCAPED_DOLLAR, String.raw`\$`);
}

/**
 * Reverses ESCAPED_DOLLAR back to a literal `\$` rather than resolving it.
 * markFirstBlank's contract is to hand back the RAW prompt with only the
 * blank replaced -- the result is passed to inlineWithMath again afterward
 * (see substituteClozeBlank), which needs to see the original escape and
 * shield it itself. unshieldLiteral/unshieldLatex, by contrast, run at final
 * render time and resolve the escape for good; this one is an intermediate
 * round-trip, not a resolution.
 */
function unshieldToEscaped(text: string): string {
  return text.replaceAll(ESCAPED_DOLLAR, String.raw`\$`);
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

/**
 * Stands in for the cloze blank while markup and math rendering run.
 * Deliberately free of HTML-special and LaTeX-special characters, so it
 * passes through escapeHtml and KaTeX untouched, and it is stripped from the
 * incoming prompt first so note content cannot forge it -- the same
 * discipline ESCAPED_DOLLAR uses, and for the same reason.
 */
const BLANK_MARKER = '@@factotum-cloze-blank@@';

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
 * The blank is marked with BLANK_MARKER in the RAW prompt, before
 * inlineWithMath runs -- it is NOT matched against the rendered HTML.
 * KaTeX's MathML annotation echoes its LaTeX source verbatim, so math
 * containing three or more consecutive underscores (e.g. `\text{a___b}`)
 * would reintroduce a `___` sequence into the rendered output; matching
 * CLOZE_BLANK there let that echoed run hijack the substitution instead of
 * the real blank. Marking the blank first, then running markup over the
 * whole string in one pass, also keeps emphasis that spans the blank
 * (`**a ___ b**`) working, since slicing the raw prompt around the blank
 * would break it instead.
 *
 * The raw prompt can ALSO contain a `___`-shaped run inside its own math
 * source (the same `\text{a___b}` case, before KaTeX ever sees it), so
 * marking is done via markFirstBlank rather than a bare `.replace` -- it
 * skips math spans using the same tokenizing inlineWithMath does, so an
 * underscore run that is really part of a LaTeX source string never
 * competes with the pipeline's own blank. A code span is deliberately NOT
 * skipped: the vault already has a real card whose blank lives inside one
 * (`` `___` `` rendering to `<code>___</code>`), and unlike math, a code
 * span's content is never echoed a second time elsewhere in the output, so
 * it carries none of the risk that math does. If no blank is found at all
 * (a malformed/legacy card), the filler is appended in parentheses instead
 * of silently dropped.
 */
function substituteClozeBlank(card: StoredCard, reveal: ClozeRevealInfo): string {
  const tint = reveal.outcome === 'correct' ? 'is-ok' : 'is-accent';
  const filler = `<span class="cloze-fill ${tint}">${inlineWithMath(card.answer ?? '')}</span>`;

  // Strip any literal marker from note content first (forge protection --
  // the same discipline ESCAPED_DOLLAR uses), then mark the real blank, if
  // any, before markup/math rendering runs.
  const unforgedPrompt = card.prompt.replaceAll(BLANK_MARKER, '');
  const markedPrompt = markFirstBlank(unforgedPrompt);
  const promptHtml = inlineWithMath(markedPrompt);

  return promptHtml.includes(BLANK_MARKER)
    ? promptHtml.replaceAll(BLANK_MARKER, filler)
    : `${promptHtml} (${filler})`;
}

/**
 * Replaces the first CLOZE_BLANK found OUTSIDE any math span with
 * BLANK_MARKER, leaving the rest of the string -- including any math span,
 * whatever underscores its LaTeX source contains -- untouched. Tokenizes via
 * tokenizeForMath, the same shield-then-split inlineWithMath uses, so a span
 * it would hand to renderMath is skipped here too rather than scanned for a
 * blank that was never meant to be there. Splitting the raw prompt directly
 * (without that shield) would let an escaped `\$` near a real `$...$` span
 * make this function and inlineWithMath disagree about where the span
 * starts; sharing the helper is what rules that out. Code spans are
 * deliberately left searchable (see substituteClozeBlank's doc comment). The
 * whole string is still returned as one piece (not sliced into before/after
 * fragments), so a subsequent single inlineWithMath call over the result
 * still sees one string and markup spanning the blank still works.
 */
function markFirstBlank(prompt: string): string {
  let marked = false;
  const shieldedResult = tokenizeForMath(prompt)
    .map(({ text: part, isMath }) => {
      if (marked || part === '') return part;
      if (isMath) return part;
      if (!CLOZE_BLANK.test(part)) return part;
      marked = true;
      return part.replace(CLOZE_BLANK, BLANK_MARKER);
    })
    .join('');
  // tokenizeForMath shields `\$` before splitting so it agrees with
  // inlineWithMath about where math spans start (see its doc comment); this
  // reverses that shielding so the return value is still the raw prompt
  // (blank aside), since the caller hands it to inlineWithMath again.
  return unshieldToEscaped(shieldedResult);
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
  const promptHtml = isCloze && revealed ? substituteClozeBlank(card, reveal) : inlineWithMath(card.prompt);

  const typedWrong =
    isCloze && revealed && reveal.outcome === 'wrong' && reveal.typedAnswer
      ? `<p class="cloze-typed">You typed: ${inlineWithMath(reveal.typedAnswer)}</p>`
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
  // A <div> rather than a <p>: this element can hold a centred display
  // equation as well as prose, which is not a paragraph in any useful sense.
  //
  // It is NOT, as an earlier revision of this code claimed, because block
  // content forces the browser to close a <p> early. KaTeX display mode emits
  // <span class="katex-display">, and the optional-end-tag rule for <p> keys
  // off tag names, never off CSS display -- a <span> never closes a
  // paragraph. A <p> would in fact have worked; the <div> is a semantic
  // preference, not a correctness fix.
  const expected =
    revealed && !isCloze && card.format !== 'mcq' && card.answer
      ? `<div class="expected">${inlineWithMath(card.answer)}</div>`
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

/**
 * Badge for a choice at a given RENDERED position. Generated rather than
 * held in a fixed array: a four-entry list silently produced empty badges
 * for a fifth choice onward, and the deck has already contained an eight
 * choice card (two questions fused into one callout -- see the
 * mcq-multiple-correct lint rule that now catches that at its source).
 * Past Z it falls back to the 1-based number, so this can never render a
 * blank badge no matter how malformed the card.
 */
function mcqBadge(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

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
             <span class="choice-badge">${mcqBadge(index)}</span>
             <span class="choice-text">${inlineWithMath(choice.text)}</span>
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
