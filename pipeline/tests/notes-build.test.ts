import { describe, it, expect } from 'vitest';
import { resolveBlocks, noteTitle, withStableNotesGeneratedAt } from '../src/build.js';
import { parseBlocks } from '../src/cards.js';
import { parseCards } from '../src/cards.js';
import { assignIds } from '../src/ids.js';
import type { Notes } from '../src/types.js';

const resolve = (body: string) => {
  const cards = assignIds(parseCards(body, 0), new Set<string>());
  return resolveBlocks(parseBlocks(body), cards, 'vault/t.md');
};

describe('resolveBlocks', () => {
  it('resolves a cloze ordinal to the assigned card id', () => {
    const blocks = resolve('MTU is ==1500 bytes==.');
    const block = blocks[0];
    if (block?.kind !== 'prose') throw new Error('expected a prose block');
    expect(block.clozes[0]?.cardId).toMatch(/^card-[a-z0-9]{4}$/);
  });

  it('resolves every construct in walk order to distinct ids', () => {
    const body = ['A ==one== here.', '', 'Q? :: A.'].join('\n');
    const cards = assignIds(parseCards(body, 0), new Set<string>());
    const blocks = resolveBlocks(parseBlocks(body), cards, 'vault/t.md');
    const prose = blocks[0];
    const qa = blocks[1];
    if (prose?.kind !== 'prose' || qa?.kind !== 'qa') throw new Error('unexpected block kinds');
    expect(prose.clozes[0]?.cardId).toBe(cards[0]?.id);
    expect(qa.cardId).toBe(cards[1]?.id);
  });

  it('throws when a block references an ordinal with no card', () => {
    // THE guard. If parseBlocks and parseCards ever disagree about how many
    // constructs a body holds, the build must fail loudly rather than emit
    // a note whose masking silently targets the wrong card.
    expect(() => resolveBlocks(
      [{ kind: 'qa', cardIndex: 3, prompt: 'Q', answer: 'A' }],
      [],
      'vault/t.md'
    )).toThrow(/vault\/t\.md/);
  });

  it('throws when a card is left unconsumed by any block', () => {
    const cards = assignIds(parseCards('Q? :: A.', 0), new Set<string>());
    expect(() => resolveBlocks([], cards, 'vault/t.md')).toThrow(/vault\/t\.md/);
  });
});

describe('noteTitle', () => {
  it('uses the first h1', () => {
    expect(noteTitle('vault/a/consensus.md', [
      { kind: 'prose', text: 'intro', clozes: [] },
      { kind: 'heading', level: 1, text: 'Consensus' }
    ])).toBe('Consensus');
  });

  it('falls back to the filename stem when there is no h1', () => {
    expect(noteTitle('vault/a/two-phase-commit.md', [])).toBe('two-phase-commit');
  });
});

describe('withStableNotesGeneratedAt', () => {
  it('keeps the existing timestamp when note content is unchanged', () => {
    // Without this, CI's deck-drift check (git status --porcelain must print
    // nothing) flaps on every unrelated PR.
    const notes = (generatedAt: string): Notes => ({
      generatedAt,
      notes: [{ path: 'vault/a.md', title: 'A', topic: 't', category: 'c', citations: [], blocks: [] }]
    });
    expect(withStableNotesGeneratedAt(notes('2026-02-02'), notes('2026-01-01')).generatedAt).toBe('2026-01-01');
  });

  it('takes the fresh timestamp when content changed', () => {
    const existing: Notes = { generatedAt: '2026-01-01', notes: [] };
    const next: Notes = {
      generatedAt: '2026-02-02',
      notes: [{ path: 'vault/a.md', title: 'A', topic: 't', category: 'c', citations: [], blocks: [] }]
    };
    expect(withStableNotesGeneratedAt(next, existing).generatedAt).toBe('2026-02-02');
  });
});
