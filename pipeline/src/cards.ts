import type { ParsedCard } from './types.js';

const ANCHOR = /\s*\^(card-[a-z0-9]{4})\s*$/;
const BARE_ANCHOR = /^\s*\^(card-[a-z0-9]{4})\s*$/;
const HIGHLIGHT = /==([^=]+)==/g;
const QA = /^(.+?)\s+::\s+(.+)$/;

interface StrippedLine {
  text: string;
  id: string | null;
}

function stripAnchor(line: string): StrippedLine {
  const match = line.match(ANCHOR);
  if (!match || !match[1]) return { text: line.trimEnd(), id: null };
  return { text: line.replace(ANCHOR, '').trimEnd(), id: match[1] };
}

function clozeCards(text: string, ids: (string | null)[], anchorLine: number): ParsedCard[] {
  const matches = [...text.matchAll(HIGHLIGHT)];
  if (matches.length === 0) return [];

  return matches.map((target, index) => {
    let cursor = 0;
    let prompt = '';
    for (const m of matches) {
      const inner = m[1] ?? '';
      prompt += text.slice(cursor, m.index);
      prompt += m === target ? '___' : inner;
      cursor = (m.index ?? 0) + m[0].length;
    }
    prompt += text.slice(cursor);

    return {
      // Each card on the line takes the id at its own position in the
      // line's anchor list; missing entries are filled in by ids.ts.
      id: ids[index] ?? null,
      format: 'cloze' as const,
      prompt,
      answer: (target[1] ?? '').trim(),
      anchorLine
    };
  });
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

export function parseCards(body: string, bodyStartLine: number): ParsedCard[] {
  const cards: ParsedCard[] = [];
  const lines = body.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';
    if (BARE_ANCHOR.test(rawLine)) continue; // claimed by the card line above

    const anchorLine = bodyStartLine + i;
    const { text, id } = stripAnchor(rawLine);
    if (text.trim() === '') continue;

    const ids: (string | null)[] = [id, ...trailingAnchors(lines, i)];

    const cloze = clozeCards(text, ids, anchorLine);
    if (cloze.length > 0) {
      cards.push(...cloze);
      continue;
    }

    const qa = text.match(QA);
    if (qa && qa[1] && qa[2]) {
      cards.push({
        id,
        format: 'qa',
        prompt: qa[1].trim(),
        answer: qa[2].trim(),
        anchorLine
      });
    }
  }

  return cards;
}
