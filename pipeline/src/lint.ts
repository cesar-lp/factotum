import { HIGHLIGHT, QA, FENCE } from './cards.js';
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
