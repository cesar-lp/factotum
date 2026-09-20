import { describe, it, expect } from 'vitest';
import { maskedSummary, effectiveMasked } from '../src/ui/note.js';

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
