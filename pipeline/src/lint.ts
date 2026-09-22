import katex from 'katex';
import {
  HIGHLIGHT, QA, FENCE, CALLOUT_OPEN, CALLOUT_LINE, CHOICE, DISPLAY_MATH_FENCE, parseCards, stripAnchor
} from './cards.js';
import { parseFrontmatter } from './frontmatter.js';

export interface LintProblem {
  /** 1-indexed line in the note's full source text; 0 when the problem is file-scoped. */
  line: number;
  /** Short kebab-case rule id. */
  rule: string;
  /** What is wrong and why it matters. */
  message: string;
}

// Same shape as HIGHLIGHT's delimiters, but WITHOUT requiring the inner text
// to hug non-whitespace — this is deliberately the more permissive match, so
// we can compare "what looks like an attempted highlight" against "what the
// parser's real HIGHLIGHT regex accepts" and flag the gap.
const HIGHLIGHT_CANDIDATE = /==([^=]*)==/g;

/**
 * Strips what the math tokenizer would never see as math: code spans, and
 * backslash-escaped dollars. Mirrors app/src/ui/renderers.ts's inlineWithMath
 * -- if that tokenizer's precedence changes, this must change with it, or the
 * lint starts flagging text the renderer handles fine (or worse, stops
 * flagging text it chokes on).
 */
function withoutNonMath(line: string): string {
  return line.replace(/`[^`]+`/g, '').replace(/\\\$/g, '');
}

/** The math spans a line contains, display first, as raw LaTeX source. */
function mathSpans(line: string): string[] {
  const stripped = withoutNonMath(line);
  const spans: string[] = [];
  for (const match of stripped.matchAll(/\$\$([^$]+)\$\$|\$(\S(?:[^$]*\S)?)\$/g)) {
    spans.push((match[1] ?? match[2] ?? '').trim());
  }
  return spans;
}

/** Validates one span the way the build should, not the way the app renders. */
function latexError(latex: string): string | null {
  try {
    // strict + throwOnError, unlike renderMath's forgiving app-side options:
    // a typo must fail CI here rather than render an error card on a phone.
    katex.renderToString(latex, { throwOnError: true, strict: 'error', output: 'html' });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Pure, filesystem-free lint over one note's full raw text (frontmatter +
 * body), mirroring exactly what `pipeline/src/cards.ts` and
 * `pipeline/src/frontmatter.ts` do — so a flagged problem here means the real
 * pipeline build silently drops or mangles a card, not just a style nit.
 */
export function lintNote(text: string): LintProblem[] {
  const problems: LintProblem[] = [];
  const { meta, body, bodyStartLine } = parseFrontmatter(text);

  if (!meta) {
    problems.push({
      line: 0,
      rule: 'missing-category',
      message:
        'No `category` key in frontmatter (or it is missing, blank, or non-string). ' +
        'A note without a valid category is ignored entirely by the build — none of ' +
        'its cards are ever parsed.'
    });
  }

  const lines = body.split('\n');
  let inFence = false;
  let fenceOpenLine = -1;
  let inMath = false;
  let mathOpenLine = -1;
  let mathLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const fileLine = bodyStartLine + i + 1;

    // Mirrors cards.ts's own top-level loop: FENCE is checked before any
    // other rule, and toggles state regardless of ``` vs ~~~ or indentation.
    if (FENCE.test(raw)) {
      inFence = !inFence;
      if (inFence) fenceOpenLine = fileLine;
      continue;
    }
    if (inFence) continue;

    if (DISPLAY_MATH_FENCE.test(raw)) {
      inMath = !inMath;
      if (inMath) {
        mathOpenLine = fileLine;
        mathLines = [];
        const previous = (lines[i - 1] ?? '').trim();
        if (previous !== '' && i > 0) {
          problems.push({
            line: fileLine,
            rule: 'display-math-block',
            message:
              'A "$$" display block must be separated from the prose above it by a blank line. ' +
              'Without one, parseCards joins that prose to the block while parseBlocks does not, ' +
              'and the two walks can disagree about how many cards the note has.'
          });
        }
      } else {
        const next = (lines[i + 1] ?? '').trim();
        if (next !== '' && i + 1 < lines.length) {
          problems.push({
            line: fileLine,
            rule: 'display-math-block',
            message:
              'A "$$" display block must be followed by a blank line before prose resumes, ' +
              'for the same reason it must be preceded by one.'
          });
        }
        // Validated as ONE equation at the close, never line by line: a
        // multi-line block is a single LaTeX expression, and its individual
        // lines are not valid on their own -- a bare "\begin{aligned}" fails
        // to parse, so a per-line check would reject every legal multi-line
        // equation in the vault.
        const blockSource = mathLines.join('\n').trim();
        const blockError = blockSource === '' ? null : latexError(blockSource);
        if (blockError) {
          problems.push({
            line: mathOpenLine,
            rule: 'invalid-math',
            message: `KaTeX cannot parse the display math opened at line ${mathOpenLine}: ${blockError}`
          });
        }
        mathLines = [];
      }
      continue;
    }

    if (inMath) {
      mathLines.push(raw);
      // Card syntax is checked per line, because unlike the LaTeX itself it
      // IS a per-line property and the line number is the useful part of the
      // report.
      if (new RegExp(HIGHLIGHT.source, HIGHLIGHT.flags).test(raw) || QA.test(raw.trim())) {
        problems.push({
          line: fileLine,
          rule: 'display-math-block',
          message:
            'Card syntax ("==cloze==" or "A :: B") inside a "$$" display block. parseBlocks skips ' +
            'the block entirely while parseCards would mint a card from this line, so the two walks ' +
            'disagree and the build throws. Move the card outside the equation.'
        });
      }
      continue;
    }

    const mathStripped = withoutNonMath(raw);
    const dollars = (mathStripped.match(/\$/g) ?? []).length;
    if (dollars % 2 !== 0) {
      problems.push({
        line: fileLine,
        rule: 'unpaired-dollar',
        message:
          'An unpaired "$" outside code. "$" now opens inline math, so a lone one is either a ' +
          'literal dollar sign that needs writing as "\\$", a shell/AWS token that belongs in ' +
          'backticks, or a math span missing its closing delimiter.'
      });
    }

    for (const span of mathSpans(raw)) {
      const error = latexError(span);
      if (error) {
        problems.push({
          line: fileLine,
          rule: 'invalid-math',
          message: `KaTeX cannot parse the math span "$${span}$": ${error}`
        });
      }
    }

    for (const match of raw.matchAll(new RegExp(HIGHLIGHT.source, HIGHLIGHT.flags))) {
      const inner = match[1] ?? '';
      if (inner.includes('$')) {
        problems.push({
          line: fileLine,
          rule: 'math-in-cloze',
          message:
            `Cloze answer "==${inner}==" contains math. A cloze is graded by exact typed match, ` +
            'and nobody types LaTeX on a phone keyboard. Move the math into the prompt and let the ' +
            'blank fall on typeable prose.'
        });
      }
    }

    for (const match of raw.matchAll(HIGHLIGHT_CANDIDATE)) {
      const inner = match[1] ?? '';
      if (inner.trim() === '') continue; // not an attempted highlight (e.g. "====")
      if (inner !== inner.trim()) {
        problems.push({
          line: fileLine,
          rule: 'padded-highlight',
          message:
            `Highlight "==${inner}==" has whitespace just inside the "==" delimiters. ` +
            'The parser\'s highlight pattern requires "==" to hug non-whitespace on both ' +
            `sides, so this produces NO card at all. Write "==${inner.trim()}==" instead.`
        });
      }
    }

    const trimmed = raw.trim();
    if (QA.test(trimmed)) {
      const hasValidHighlight = new RegExp(HIGHLIGHT.source, HIGHLIGHT.flags).test(raw);
      if (hasValidHighlight) {
        problems.push({
          line: fileLine,
          rule: 'qa-cloze-collision',
          message:
            'This line has both a "::" QA separator and a valid "==cloze==" highlight. ' +
            'The parser checks for cloze cards first and returns as soon as it finds one, ' +
            'never reaching the QA branch — the QA card is silently dropped. Put the ' +
            'cloze and the QA pair on separate lines/blocks.'
        });
      }
    }
  }

  problems.push(...lintMcqCallouts(lines, bodyStartLine));
  problems.push(...lintNoteReferences(body, bodyStartLine));

  if (inFence) {
    problems.push({
      line: fenceOpenLine,
      rule: 'unbalanced-fence',
      message:
        `Fence opened at line ${fenceOpenLine} is never closed. Everything below it is ` +
        'skipped by the parser, so every card in the rest of this note silently disappears. ' +
        'Add a matching closing fence.'
    });
  }

  if (inMath) {
    problems.push({
      line: mathOpenLine,
      rule: 'display-math-block',
      message:
        `Display math opened at line ${mathOpenLine} is never closed. Everything below it is ` +
        'skipped by both parser walks, so every card in the rest of this note silently disappears. ' +
        'Add a matching closing "$$".'
    });
  }

  return problems;
}

/**
 * Flags an mcq callout with more than one `- [x]` choice.
 *
 * A callout continues across a blank `>` line -- CALLOUT_LINE matches `>`
 * with no content -- so writing two questions inside one `> [!card] mcq`
 * block, separated by a blank `>`, does not produce two cards. The parser
 * concatenates both prompts and pools all the choices into ONE card with
 * two correct answers, which is unanswerable: only one choice can be
 * tapped, and either of the two "correct" ones scores it right.
 *
 * This is silent -- no warning, no crash, a plausible-looking card. It had
 * already happened once in this vault (an 8-choice AWS IAM card) and went
 * unnoticed until every card was rendered and checked.
 *
 * cards.ts already warns about the opposite case (a callout with NO correct
 * choice, which it skips outright); there is no equivalent guard for too
 * many, because nothing downstream treats it as an error.
 *
 * Mirrors parseCallout's own scanning exactly -- same CALLOUT_OPEN,
 * CALLOUT_LINE, CHOICE and stripAnchor -- so what this counts is what the
 * build actually parses, not an approximation of it.
 */
function lintMcqCallouts(lines: string[], bodyStartLine: number): LintProblem[] {
  const problems: LintProblem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const open = (lines[i] ?? '').match(CALLOUT_OPEN);
    if (!open || (open[1] ?? '').toLowerCase() !== 'mcq') continue;

    const openLine = bodyStartLine + i + 1;
    let correct = 0;
    let total = 0;

    for (i += 1; i < lines.length; i++) {
      const match = (lines[i] ?? '').match(CALLOUT_LINE);
      if (!match) break;
      const content = stripAnchor((match[1] ?? '').trim()).text.trim();
      if (content === '') continue;
      const choice = content.match(CHOICE);
      if (!choice || !choice[2]) continue;
      total += 1;
      if ((choice[1] ?? '').toLowerCase() === 'x') correct += 1;
    }
    i -= 1;

    if (correct > 1) {
      problems.push({
        line: openLine,
        rule: 'mcq-multiple-correct',
        message:
          `This mcq callout has ${correct} choices marked \`- [x]\` (${total} choices in total), ` +
          'but a card can only have one. This usually means two questions were written in one ' +
          'callout separated by a blank `>` line — a blank `>` does NOT end a callout, so the ' +
          'parser fuses them into a single unanswerable card. Split them into two separate ' +
          '`> [!card] mcq` blocks with a truly blank line between them.'
      });
    }
  }

  return problems;
}

/**
 * Flags a sibling-note filename that ends up inside a CARD.
 *
 * These read fine in Obsidian, where the file is a click away, and in note
 * prose that is exactly what they are for. They do not survive the trip
 * into a card: during review you see the prompt and nothing else, so
 * "see `caching-and-observability.md`" is a dead pointer -- not clickable,
 * not the knowledge being tested, just a break in the sentence. 28 cards
 * had picked these up before anyone noticed.
 *
 * Write the name of the CONCEPT instead of the name of the file, or drop
 * the reference when it is only signposting.
 *
 * Asks the real parser which text actually becomes a card rather than
 * scanning lines, because the distinction is the whole point of the rule
 * and it is not visible line by line: an intro paragraph carrying a
 * cross-reference produces no card at all (no highlight, no `::`, no
 * callout) and must not be flagged, while the paragraph right below it may
 * well produce one. A first cut of this rule flagged every line and
 * reported 24 false positives against the real vault -- all of them
 * legitimate in-Obsidian navigation.
 */
const NOTE_REFERENCE = /(?:[\w.-]*\/)*[\w-]+\.md\b/;

function lintNoteReferences(body: string, bodyStartLine: number): LintProblem[] {
  const problems: LintProblem[] = [];

  for (const card of parseCards(body, bodyStartLine)) {
    const text = [card.prompt, card.answer ?? '', ...(card.choices ?? []).map((c) => c.text)].join(' ');
    const match = NOTE_REFERENCE.exec(text);
    if (!match) continue;
    problems.push({
      line: card.anchorLine + 1,
      rule: 'note-filename-reference',
      message:
        `This card's text references the note filename \`${match[0]}\`. A card is read on its ` +
        'own, so the filename is a dead pointer there — not clickable, and not the thing being ' +
        'tested. Name the concept instead, or drop the reference if it is only signposting.'
    });
  }

  return problems;
}
