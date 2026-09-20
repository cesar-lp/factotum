import type { Choice, ParsedCard } from './types.js';

const ANCHOR = /\s*\^(card-[a-z0-9]{4})\s*$/;
const BARE_ANCHOR = /^\s*\^(card-[a-z0-9]{4})\s*$/;
// Exported so pipeline/src/lint.ts can check note text against the exact
// same patterns the parser uses, instead of a hand-copied lookalike that can
// silently drift from this file.
export const HIGHLIGHT = /==(\S[^=]*?\S|\S)==/g;
export const QA = /^(.+?)\s+::\s+(.+)$/;
export const FENCE = /^\s*(```|~~~)/;
const CALLOUT_OPEN = /^>\s*\[!card\]\s*(mcq|recall)\s*$/i;
const CALLOUT_LINE = /^>\s?(.*)$/;
const CHOICE = /^-\s*\[( |x)\]\s*(.+)$/i;
const HEADING = /^#{1,6}\s/;
const LIST_ITEM = /^\s*([-*+]|\d+\.)\s/;
const BLOCKQUOTE = /^>/;

interface StrippedLine {
  text: string;
  id: string | null;
}

function stripAnchor(line: string): StrippedLine {
  const match = line.match(ANCHOR);
  if (!match || !match[1]) return { text: line.trimEnd(), id: null };
  return { text: line.replace(ANCHOR, '').trimEnd(), id: match[1] };
}

/**
 * A line that starts (and, alone, forms) its own single-line block: it never
 * joins with a neighbouring line when building prompt text. Blank lines,
 * headings, list items, and blockquote/callout lines all fall here.
 */
function isBlockBoundary(line: string): boolean {
  return line.trim() === '' || HEADING.test(line) || LIST_ITEM.test(line) || BLOCKQUOTE.test(line);
}

/** One source line's contribution to a block's joined `blockText`. */
interface BlockLine {
  /** Index into `lines` (the full split body). */
  idx: number;
  /** [start, end) offset of this line's trimmed text within `blockText`. */
  start: number;
  end: number;
  /** This line's own anchor id, followed by any trailing bare-anchor ids. */
  ids: (string | null)[];
}

/**
 * Joins the anchor-stripped, trimmed text of `memberLines` with single
 * spaces into one `blockText`, recording each line's offset range so a
 * match found in `blockText` can be attributed back to its source line.
 */
function buildBlock(
  lines: string[],
  memberLines: number[],
  bodyStartLine: number
): { blockText: string; blockLines: BlockLine[] } {
  let blockText = '';
  const blockLines: BlockLine[] = [];

  for (const idx of memberLines) {
    const { text, id } = stripAnchor(lines[idx] ?? '');
    const trimmed = text.trim();
    if (trimmed === '') continue;

    const anchors = trailingAnchors(lines, idx);
    if (id === null && anchors.length > 0) {
      // The line has no anchor of its own, so these bare-anchor lines are
      // orphaned (a hand-edit inconsistency), not this line's ids. Consuming
      // them would silently shift every subsequent card's id by one.
      console.warn(
        `parseCards: line ${bodyStartLine + idx} has no anchor but is followed by orphaned anchors [${anchors.join(', ')}]; ignoring`
      );
    }
    const ids: (string | null)[] = id === null ? [null] : [id, ...anchors];

    if (blockText.length > 0) blockText += ' ';
    const start = blockText.length;
    blockText += trimmed;
    blockLines.push({ idx, start, end: start + trimmed.length, ids });
  }

  return { blockText, blockLines };
}

function blockClozeCards(blockText: string, blockLines: BlockLine[], bodyStartLine: number): ParsedCard[] {
  const matches = [...blockText.matchAll(HIGHLIGHT)];
  if (matches.length === 0) return [];

  const idCursor = new Map<number, number>();

  return matches.map((target) => {
    let cursor = 0;
    let prompt = '';
    for (const m of matches) {
      const inner = m[1] ?? '';
      prompt += blockText.slice(cursor, m.index);
      prompt += m === target ? '___' : inner;
      cursor = (m.index ?? 0) + m[0].length;
    }
    prompt += blockText.slice(cursor);

    // Attribute this match to the source line whose offset range contains
    // it, so anchorLine and the per-line id list work exactly as today.
    const targetStart = target.index ?? 0;
    const found = blockLines.findIndex((bl) => targetStart >= bl.start && targetStart < bl.end);
    const ownerIndex = found >= 0 ? found : blockLines.length - 1;
    const owner = blockLines[ownerIndex];
    if (!owner) throw new Error('processBlock: no owner line for cloze match (invariant violation)');
    const used = idCursor.get(ownerIndex) ?? 0;
    idCursor.set(ownerIndex, used + 1);

    return {
      // Each card on the owning line takes the id at its own position in
      // that line's anchor list; missing entries are filled in by ids.ts.
      id: owner.ids[used] ?? null,
      format: 'cloze' as const,
      prompt,
      answer: (target[1] ?? '').trim(),
      anchorLine: bodyStartLine + owner.idx
    };
  });
}

/** Parses one logical block (one or more joined lines) into its card(s), if any. */
function processBlock(lines: string[], memberLines: number[], bodyStartLine: number): ParsedCard[] {
  const { blockText, blockLines } = buildBlock(lines, memberLines, bodyStartLine);
  if (blockText === '' || blockLines.length === 0) return [];

  const cloze = blockClozeCards(blockText, blockLines, bodyStartLine);
  if (cloze.length > 0) return cloze;

  const qa = blockText.match(QA);
  if (qa && qa[1] && qa[2]) {
    // A qa card is attributed to the block's FIRST line — except when some
    // other line in the block already carries its own `^card-xxxx` anchor
    // (a pre-existing qa card whose `::` happened to land on a line other
    // than the block's first, before block-joining existed). Moving the
    // anchor in that case would abandon the existing id and mint a new one,
    // which is exactly the id-reissue this task must not cause. Preferring
    // any already-anchored line keeps existing ids pinned in place; brand
    // new (never-anchored) wrapped qa pairs still land on the first line.
    const allAnchored = blockLines.filter((bl) => bl.ids[0] !== null);
    if (allAnchored.length > 1) {
      const detail = allAnchored.map((bl) => `${bl.ids[0]} (line ${bodyStartLine + bl.idx})`).join(', ');
      console.warn(
        `parseCards: qa block has multiple pre-existing anchors [${detail}]; using ${allAnchored[0]?.ids[0]}`
      );
    }
    const owner = allAnchored[0] ?? blockLines[0];
    if (!owner) throw new Error('processBlock: empty blockLines (invariant violation)');
    return [
      {
        id: owner.ids[0] ?? null,
        format: 'qa' as const,
        prompt: qa[1].trim(),
        answer: qa[2].trim(),
        anchorLine: bodyStartLine + owner.idx
      }
    ];
  }

  return [];
}

/** Bare `^card-xxxx` lines immediately below `index`, in order. */
function trailingAnchors(lines: string[], index: number): string[] {
  const ids: string[] = [];
  for (let j = index + 1; j < lines.length; j++) {
    const match = (lines[j] ?? '').match(BARE_ANCHOR);
    if (!match || !match[1]) break;
    ids.push(match[1]);
  }
  return ids;
}

interface CalloutResult {
  card: ParsedCard | null;
  nextIndex: number;
}

function parseCallout(
  lines: string[],
  start: number,
  bodyStartLine: number,
  format: 'mcq' | 'recall'
): CalloutResult {
  const promptParts: string[] = [];
  const choices: Choice[] = [];
  let id: string | null = null;
  let anchorLine: number | null = null;
  let lastContentLine = start;
  let i = start + 1;

  for (; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const match = raw.match(CALLOUT_LINE);
    if (!match) break;

    const inner = (match[1] ?? '').trim();
    const stripped = stripAnchor(inner);
    if (stripped.id) {
      id = stripped.id;
      anchorLine = bodyStartLine + i;
    }

    const content = stripped.text.trim();
    if (content === '') continue;
    lastContentLine = i;

    const choice = content.match(CHOICE);
    if (choice && choice[2]) {
      choices.push({ text: choice[2].trim(), correct: choice[1]?.toLowerCase() === 'x' });
      continue;
    }
    promptParts.push(content);
  }

  // With no anchor of its own, the callout's LAST content line carries it, so
  // write-back appends `^card-xxxx` inside the callout rather than corrupting
  // the `> [!card] …` header.
  anchorLine = anchorLine ?? bodyStartLine + lastContentLine;

  const prompt = promptParts.join(' ');
  if (prompt === '') {
    console.warn(`Skipping [!card] ${format} at line ${bodyStartLine + start}: no prompt`);
    return { card: null, nextIndex: i };
  }

  if (format === 'recall') {
    return { card: { id, format, prompt, anchorLine }, nextIndex: i };
  }

  if (!choices.some((c) => c.correct)) {
    console.warn(`Skipping [!card] mcq at line ${bodyStartLine + start}: no correct choice`);
    return { card: null, nextIndex: i };
  }

  return { card: { id, format, prompt, choices, anchorLine }, nextIndex: i };
}

export function parseCards(body: string, bodyStartLine: number): ParsedCard[] {
  const cards: ParsedCard[] = [];
  const lines = body.split('\n');
  let inFence = false;
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i] ?? '';

    if (FENCE.test(rawLine)) {
      inFence = !inFence;
      i++;
      continue;
    }
    if (inFence) {
      i++;
      continue;
    }

    const open = rawLine.match(CALLOUT_OPEN);
    if (open && open[1]) {
      const format = open[1].toLowerCase() as 'mcq' | 'recall';
      const { card, nextIndex } = parseCallout(lines, i, bodyStartLine, format);
      if (card) cards.push(card);
      i = nextIndex;
      continue;
    }

    if (BARE_ANCHOR.test(rawLine)) {
      i++;
      continue; // claimed by (or orphaned from) the card line above
    }

    if (isBlockBoundary(rawLine)) {
      // Blank/heading/list/quote lines never join a neighbour: each forms
      // its own single-line block (a no-op for blank lines, which yield
      // nothing once trimmed).
      cards.push(...processBlock(lines, [i], bodyStartLine));
      i++;
      continue;
    }

    // Start of a run of plain prose lines: extend the block forward while
    // subsequent lines are also eligible. Bare-anchor lines are transparent
    // here — they carry no prose and are consumed as ids by buildBlock via
    // trailingAnchors, so they neither join the block's text nor break it.
    const memberLines = [i];
    let j = i + 1;
    while (j < lines.length) {
      const candidate = lines[j] ?? '';
      if (FENCE.test(candidate)) break;
      if (BARE_ANCHOR.test(candidate)) {
        j++;
        continue;
      }
      if (isBlockBoundary(candidate)) break;
      memberLines.push(j);
      j++;
    }

    cards.push(...processBlock(lines, memberLines, bodyStartLine));
    i = j;
  }

  return cards;
}
