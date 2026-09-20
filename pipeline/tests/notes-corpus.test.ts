import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { processVault, buildDeck, buildNotes } from '../src/build.js';
import type { Deck, Notes, NoteBlock } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// The real vault, not a fixture -- this check exists to guard content as the
// vault grows, so it must see what actually ships in deck.json.
const REAL_VAULT_DIR = resolve(__dirname, '../../vault');

/** Every card id a block stream references, in walk order. */
function referencedIds(blocks: NoteBlock[]): string[] {
  return blocks.flatMap((block) =>
    block.kind === 'prose' ? block.clozes.map((c) => c.cardId)
    : block.kind === 'qa' || block.kind === 'card' ? [block.cardId]
    : []
  );
}

describe('notes.json over the real vault', () => {
  let tmpRoot: string;
  let vaultCopy: string;
  let deck: Deck;
  let notes: Notes;
  let parsedPaths: string[];

  beforeAll(() => {
    // `processVault` is not read-only: any card missing a `^card-xxxx`
    // anchor gets one minted and written back into its source file. Running
    // it straight against REAL_VAULT_DIR would make `npm test` itself mutate
    // the working tree the moment a new, not-yet-anchored note appears --
    // silently, with a randomly generated id, ahead of any real `build:deck`
    // run. So this operates on a throwaway copy instead, same pattern as
    // `cloze-self-answer.test.ts`.
    tmpRoot = mkdtempSync(join(tmpdir(), 'factotum-notes-corpus-'));
    vaultCopy = join(tmpRoot, 'vault');
    cpSync(REAL_VAULT_DIR, vaultCopy, { recursive: true });

    const { notes: parsed, bodies } = processVault(vaultCopy);
    parsedPaths = parsed.map((n) => n.path);
    deck = buildDeck(parsed, new Date());
    notes = buildNotes(parsed, bodies, new Date());
  });

  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

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
      .toEqual(new Set(parsedPaths));
  });

  it('never leaks a ^card-xxxx anchor into rendered text', () => {
    // Anchors are build metadata. One reaching the viewer is a rendering bug.
    // Covers every text field renderNoteBlocks displays to the reader --
    // prompt, answer, and each mcq choice, but also a list block's items
    // and a code block's text, both of which render just as visibly.
    for (const note of notes.notes) {
      for (const block of note.blocks) {
        const texts = block.kind === 'prose' ? [block.text]
          : block.kind === 'heading' ? [block.text]
          : block.kind === 'code' ? [block.text]
          : block.kind === 'list' ? block.items
          : block.kind === 'qa' ? [block.prompt, block.answer]
          : block.kind === 'card' ? [
              block.prompt,
              ...(block.answer !== undefined ? [block.answer] : []),
              ...(block.choices?.map((c) => c.text) ?? [])
            ]
          : [];
        for (const text of texts) {
          expect(text).not.toMatch(/\^card-/);
        }
      }
    }
  });

  it('is deterministic across two builds', () => {
    // Reuses the same already-anchored copy: a second `processVault` pass
    // over it writes nothing (every card already has an id), so this stays
    // a read-only comparison rather than a second mutating pass.
    const { notes: parsedAgain, bodies: bodiesAgain } = processVault(vaultCopy);
    const again = buildNotes(parsedAgain, bodiesAgain, new Date());
    expect(JSON.stringify(again.notes)).toBe(JSON.stringify(notes.notes));
  });
});
