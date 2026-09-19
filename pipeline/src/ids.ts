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

export function writeBackIds(source: string, cards: ParsedCard[]): string {
  const lines = source.split('\n');
  const byLine = new Map<number, string[]>();

  for (const card of cards) {
    if (!card.id) continue;
    if (source.includes(`^${card.id}`)) continue;
    const bucket = byLine.get(card.anchorLine) ?? [];
    bucket.push(card.id);
    byLine.set(card.anchorLine, bucket);
  }

  if (byLine.size === 0) return source;

  const out: string[] = [];
  lines.forEach((line, index) => {
    const ids = byLine.get(index);
    if (!ids || ids.length === 0) {
      out.push(line);
      return;
    }
    const [first, ...rest] = ids;
    out.push(`${line.trimEnd()} ^${first}`);
    for (const extra of rest) out.push(`^${extra}`);
  });

  return out.join('\n');
}
