import { describe, it, expect } from 'vitest';
import { maskedSummary, effectiveMasked, maskedCount } from '../src/ui/note.js';
import type { NoteBlock } from '../../pipeline/src/types.js';

describe('maskedSummary', () => {
  it('is null when nothing is masked, so the header control is absent', () => {
    expect(maskedSummary(0)).toBeNull();
  });

  it('reads singular for one', () => {
    expect(maskedSummary(1)).toBe('1 answer hidden');
  });

  it('reads plural for more', () => {
    expect(maskedSummary(6)).toBe('6 answers hidden');
  });
});

describe('effectiveMasked', () => {
  it('returns the full masked set when nothing has been revealed', () => {
    const masked = new Set(['a', 'b']);
    expect(effectiveMasked(masked, new Set())).toEqual(new Set(['a', 'b']));
  });

  it('drops a revealed id from the result', () => {
    const masked = new Set(['a', 'b', 'c']);
    expect(effectiveMasked(masked, new Set(['b']))).toEqual(new Set(['a', 'c']));
  });

  it('is empty once every masked id has been revealed', () => {
    const masked = new Set(['a', 'b']);
    expect(effectiveMasked(masked, new Set(['a', 'b']))).toEqual(new Set());
  });

  it('ignores a revealed id that was never masked in the first place', () => {
    const masked = new Set(['a']);
    expect(effectiveMasked(masked, new Set(['z']))).toEqual(new Set(['a']));
  });

  it('does not mutate its inputs', () => {
    const masked = new Set(['a', 'b']);
    const revealed = new Set(['a']);
    effectiveMasked(masked, revealed);
    expect(masked).toEqual(new Set(['a', 'b']));
    expect(revealed).toEqual(new Set(['a']));
  });
});

describe('maskedCount', () => {
  it('counts a masked cloze', () => {
    const blocks: NoteBlock[] = [
      { kind: 'prose', text: 'MTU is 1500 bytes.', clozes: [{ start: 7, end: 17, cardId: 'c1', answer: '1500 bytes' }] }
    ];
    expect(maskedCount(blocks, new Set(['c1']))).toBe(1);
  });

  it('counts a masked qa answer', () => {
    const blocks: NoteBlock[] = [{ kind: 'qa', cardId: 'c1', prompt: 'p', answer: 'a' }];
    expect(maskedCount(blocks, new Set(['c1']))).toBe(1);
  });

  it('counts a masked mcq, which always has something to blur', () => {
    const blocks: NoteBlock[] = [
      { kind: 'card', cardId: 'c1', format: 'mcq', prompt: 'p', choices: [{ text: 'x', correct: true }] }
    ];
    expect(maskedCount(blocks, new Set(['c1']))).toBe(1);
  });

  it('counts a masked recall that carries a model answer', () => {
    const blocks: NoteBlock[] = [{ kind: 'card', cardId: 'c1', format: 'recall', prompt: 'p', answer: 'a' }];
    expect(maskedCount(blocks, new Set(['c1']))).toBe(1);
  });

  it('does NOT count a masked recall with no model answer -- there is nothing to blur', () => {
    const blocks: NoteBlock[] = [{ kind: 'card', cardId: 'c1', format: 'recall', prompt: 'p' }];
    expect(maskedCount(blocks, new Set(['c1']))).toBe(0);
  });

  it('is zero for a note whose only due cards are answerless recalls', () => {
    const blocks: NoteBlock[] = [
      { kind: 'card', cardId: 'c1', format: 'recall', prompt: 'p1' },
      { kind: 'card', cardId: 'c2', format: 'recall', prompt: 'p2' }
    ];
    expect(maskedCount(blocks, new Set(['c1', 'c2']))).toBe(0);
  });

  it('ignores an unmasked card entirely', () => {
    const blocks: NoteBlock[] = [{ kind: 'qa', cardId: 'c1', prompt: 'p', answer: 'a' }];
    expect(maskedCount(blocks, new Set())).toBe(0);
  });

  it('sums across mixed block kinds', () => {
    const blocks: NoteBlock[] = [
      { kind: 'prose', text: 'x', clozes: [{ start: 0, end: 1, cardId: 'c1', answer: 'x' }] },
      { kind: 'qa', cardId: 'c2', prompt: 'p', answer: 'a' },
      { kind: 'card', cardId: 'c3', format: 'mcq', prompt: 'p', choices: [{ text: 'x', correct: true }] },
      { kind: 'card', cardId: 'c4', format: 'recall', prompt: 'p' }
    ];
    expect(maskedCount(blocks, new Set(['c1', 'c2', 'c3', 'c4']))).toBe(3);
  });
});
