import { describe, it, expect } from 'vitest';
import { generateId, assignIds, writeBackIds } from '../src/ids.js';
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
});
