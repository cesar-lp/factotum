import { describe, it, expect } from 'vitest';
import { processVault, buildDeck, buildNotes } from '../src/build.js';
import type { NoteBlock } from '../src/types.js';

/** Every card id a block stream references, in walk order. */
function referencedIds(blocks: NoteBlock[]): string[] {
  return blocks.flatMap((block) =>
    block.kind === 'prose' ? block.clozes.map((c) => c.cardId)
    : block.kind === 'qa' || block.kind === 'card' ? [block.cardId]
    : []
  );
}

describe('notes.json over the real vault', () => {
  const { notes: parsed, bodies } = processVault('vault');
  const deck = buildDeck(parsed, new Date());
  const notes = buildNotes(parsed, bodies, new Date());

  it('references every deck card exactly once, and nothing else', () => {
    // THE drift guard. parseBlocks is a sibling of parseCards rather than a
    // refactor of it, so the two walks can diverge silently. This makes any
    // divergence a CI failure instead of a note whose masking targets the
    // wrong card -- or worse, silently reveals a due one.
    const referenced = notes.notes.flatMap((note) => referencedIds(note.blocks));
    const deckIds = deck.cards.map((card) => card.id);

    expect(referenced).toHaveLength(deckIds.length);
    expect(new Set(referenced).size).toBe(referenced.length);
    expect(new Set(referenced)).toEqual(new Set(deckIds));
  });

  it('covers every note the deck was built from', () => {
    expect(new Set(notes.notes.map((n) => n.path)))
      .toEqual(new Set(parsed.map((n) => n.path)));
  });

  it('never leaks a ^card-xxxx anchor into rendered text', () => {
    // Anchors are build metadata. One reaching the viewer is a rendering bug.
    for (const note of notes.notes) {
      for (const block of note.blocks) {
        const text = block.kind === 'prose' ? block.text
          : block.kind === 'heading' ? block.text
          : block.kind === 'qa' ? `${block.prompt} ${block.answer}`
          : block.kind === 'card' ? block.prompt
          : '';
        expect(text).not.toMatch(/\^card-/);
      }
    }
  });

  it('is deterministic across two builds', () => {
    const again = buildNotes(processVault('vault').notes, processVault('vault').bodies, new Date());
    expect(JSON.stringify(again.notes)).toBe(JSON.stringify(notes.notes));
  });
});
