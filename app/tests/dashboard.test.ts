import { describe, it, expect } from 'vitest';
import { deferredLine } from '../src/ui/dashboard.js';

describe('deferredLine', () => {
  it('is empty when nothing was deferred, so the dashboard stays quiet', () => {
    expect(deferredLine(0)).toBe('');
  });

  it('reads singular for one', () => {
    expect(deferredLine(1)).toContain('1 card deferred');
  });

  it('reads plural for more', () => {
    expect(deferredLine(3)).toContain('3 cards deferred');
  });

  it('says why, not just how many', () => {
    expect(deferredLine(3)).toContain('you read their notes');
  });
});
