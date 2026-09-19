import type { ParsedCard } from './types.js';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateId(taken: Set<string>): string {
  for (let attempt = 0; attempt < 10_000; attempt++) {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    const id = `card-${suffix}`;
    if (!taken.has(id)) return id;
  }
  throw new Error('Exhausted card id space');
}

export function assignIds(cards: ParsedCard[], taken: Set<string>): ParsedCard[] {
  return cards.map((card) => {
    if (card.id) {
      taken.add(card.id);
      return card;
    }
    const id = generateId(taken);
    taken.add(id);
    return { ...card, id };
  });
}

const TRAILING_ANCHOR = /\s*\^card-[a-z0-9]{4}\s*$/;
const BARE_ANCHOR_LINE = /^\s*\^card-[a-z0-9]{4}\s*$/;

/**
 * Rebuilds the anchor layout of every card line from `cards`, rather than
 * appending to whatever is already there. This is what makes repeated runs
 * converge: the output for a given anchorLine is a pure function of that
 * line's cards (in order), never of what anchors happen to already be
 * present in the file. Any existing bare `^card-xxxx` lines immediately
 * following an anchored line are consumed and regenerated, so stale or
 * duplicate trailing anchors can't accumulate.
 */
export function writeBackIds(source: string, cards: ParsedCard[]): string {
  const lines = source.split('\n');
  const byLine = new Map<number, string[]>();

  for (const card of cards) {
    if (!card.id) continue;
    const bucket = byLine.get(card.anchorLine) ?? [];
    bucket.push(card.id);
    byLine.set(card.anchorLine, bucket);
  }

  if (byLine.size === 0) return source;

  const out: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const ids = byLine.get(index);
    if (!ids || ids.length === 0) {
      out.push(lines[index] ?? '');
      index++;
      continue;
    }

    const rawLine = lines[index] ?? '';
    const hasCR = rawLine.endsWith('\r');
    const body = hasCR ? rawLine.slice(0, -1) : rawLine;
    const eol = hasCR ? '\r' : '';
    const stripped = body.replace(TRAILING_ANCHOR, '').trimEnd();

    const [first, ...rest] = ids;
    out.push(`${stripped} ^${first}${eol}`);
    for (const extra of rest) out.push(`^${extra}${eol}`);

    // Consume any existing bare-anchor lines immediately below: the loop
    // above just regenerated them, so the old copies would otherwise
    // linger unchanged (stale ids, or duplicates of the new ones).
    index++;
    while (index < lines.length) {
      const candidate = lines[index] ?? '';
      const candidateBody = candidate.endsWith('\r') ? candidate.slice(0, -1) : candidate;
      if (!BARE_ANCHOR_LINE.test(candidateBody)) break;
      index++;
    }
  }

  return out.join('\n');
}
