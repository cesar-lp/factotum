import { HIGHLIGHT, QA, FENCE, CALLOUT_OPEN, CALLOUT_LINE, CHOICE, parseCards, stripAnchor } from './cards.js';
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
