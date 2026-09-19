import { describe, it, expect } from 'vitest';
import { generateId, assignIds, writeBackIds } from '../src/ids.js';
import { parseCards } from '../src/cards.js';
import type { ParsedCard } from '../src/types.js';

const cloze = (id: string | null, anchorLine: number): ParsedCard => ({
  id, format: 'cloze', prompt: 'A ___.', answer: 'b', anchorLine
});

describe('ids', () => {
  it('generates ids matching the required shape', () => {
    expect(generateId(new Set())).toMatch(/^card-[a-z0-9]{4}$/);
  });

  it('never generates an id already taken', () => {
    const taken = new Set<string>();
    const ids = Array.from({ length: 200 }, () => {
      const id = generateId(taken);
      taken.add(id);
      return id;
    });
    expect(new Set(ids).size).toBe(200);
  });

  it('fills null ids and leaves existing ones alone', () => {
    const out = assignIds([cloze('card-keep', 0), cloze(null, 1)], new Set(['card-keep']));
    expect(out[0]?.id).toBe('card-keep');
    expect(out[1]?.id).toMatch(/^card-[a-z0-9]{4}$/);
  });

  it('appends an anchor to the card line', () => {
    const source = 'line zero\nMTU is ==1500 bytes==.\n';
    const out = writeBackIds(source, [cloze('card-aaaa', 1)]);
    expect(out).toBe('line zero\nMTU is ==1500 bytes==. ^card-aaaa\n');
  });

  it('is idempotent', () => {
    const source = 'MTU is ==1500 bytes==.\n';
    const once = writeBackIds(source, [cloze('card-aaaa', 0)]);
    const twice = writeBackIds(once, [cloze('card-aaaa', 0)]);
    expect(twice).toBe(once);
  });

  it('puts extra ids from one line on their own lines', () => {
    const source = 'TCP is ==reliable== and ==ordered==.\n';
    const out = writeBackIds(source, [cloze('card-aaaa', 0), cloze('card-bbbb', 0)]);
    expect(out).toBe('TCP is ==reliable== and ==ordered==. ^card-aaaa\n^card-bbbb\n');
  });

  it('rebuilds the anchor layout instead of appending, when a new highlight is added to an already-anchored line (Critical fix-round-1 scenario)', () => {
    const source = 'A ==x== and ==y== and ==z==. ^card-aaaa\n^card-bbbb\n';
    const parsed = parseCards(source, 0);
    expect(parsed.map((c) => c.id)).toEqual(['card-aaaa', 'card-bbbb', null]);

    const assigned = assignIds(parsed, new Set(['card-aaaa', 'card-bbbb']));
    const newId = assigned[2]?.id;
    expect(newId).toMatch(/^card-[a-z0-9]{4}$/);

    const once = writeBackIds(source, assigned);
    const reparsedOnce = parseCards(once, 0);
    expect(reparsedOnce.map((c) => c.id)).toEqual(['card-aaaa', 'card-bbbb', newId]);
    // No leaking of anchor text into a neighboring card's prompt.
    for (const card of reparsedOnce) {
      expect(card.prompt).not.toContain('^card-aaaa');
    }

    const twice = writeBackIds(once, reparsedOnce);
    expect(twice).toBe(once);
  });

  it('still writes the anchor for a card id that already appears as literal prose elsewhere (e.g. an Obsidian block link)', () => {
    const source =
      'See [[Note#^card-abcd]] for details.\nMTU is ==1500 bytes==.\n';
    const out = writeBackIds(source, [cloze('card-abcd', 1)]);
    expect(out).toBe(
      'See [[Note#^card-abcd]] for details.\nMTU is ==1500 bytes==. ^card-abcd\n'
    );
  });

  it('preserves CRLF line endings', () => {
    const source = 'line zero\r\nMTU is ==1500 bytes==.\r\nlast line\r\n';
    const out = writeBackIds(source, [cloze('card-aaaa', 1)]);
    expect(out).toBe('line zero\r\nMTU is ==1500 bytes==. ^card-aaaa\r\nlast line\r\n');
    expect(out.split('\n').every((line) => !line.includes('\r') || line.endsWith('\r'))).toBe(
      true
    );
  });

  it('round-trips every id through the real parser: cloze, multi-highlight, qa, and mcq callout', () => {
    const source = [
      'MTU is ==1500 bytes==.',
      'A ==x== and ==y== and ==z==. ^card-aaaa',
      '^card-bbbb',
      'What is TCP :: A reliable protocol',
      '',
      '> [!card] mcq',
      '> Pick the even number',
      '> - [ ] 3',
      '> - [x] 4',
      ''
    ].join('\n');

    const parsed = parseCards(source, 0);
    const taken = new Set(
      parsed.map((c) => c.id).filter((id): id is string => id !== null)
    );
    const assigned = assignIds(parsed, taken);
    const expectedIds = assigned.map((c) => c.id);

    const written = writeBackIds(source, assigned);
    const reparsed = parseCards(written, 0);
    expect(reparsed.map((c) => c.id)).toEqual(expectedIds);

    const writtenAgain = writeBackIds(written, reparsed);
    expect(writtenAgain).toBe(written);
  });
});
