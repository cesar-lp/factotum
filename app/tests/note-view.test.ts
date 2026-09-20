import { describe, it, expect } from 'vitest';
import { maskedSummary } from '../src/ui/note.js';

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
