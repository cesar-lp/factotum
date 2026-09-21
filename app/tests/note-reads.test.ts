import { describe, it, expect } from 'vitest';
import { openDb } from '../src/db/schema.js';
import {
  isRecentlyRead, loadNoteReads, pruneReads, recordNoteRead, sanitizeReads
} from '../src/db/note-reads.js';

const now = new Date('2026-09-20T12:00:00Z');
const hoursAgo = (n: number) => now.getTime() - n * 3600_000;

describe('isRecentlyRead', () => {
  it('is true inside the window', () => {
    expect(isRecentlyRead({ 'a.md': hoursAgo(5) }, 'a.md', now, 24)).toBe(true);
  });

  it('is false outside the window', () => {
    expect(isRecentlyRead({ 'a.md': hoursAgo(30) }, 'a.md', now, 24)).toBe(false);
  });

  it('is false for a path never read', () => {
    expect(isRecentlyRead({}, 'a.md', now, 24)).toBe(false);
  });

  it('is false for every path when the window is 0, which disables the mechanic', () => {
    expect(isRecentlyRead({ 'a.md': now.getTime() }, 'a.md', now, 0)).toBe(false);
  });

  it('is false for a timestamp in the future rather than suppressing forever', () => {
    expect(isRecentlyRead({ 'a.md': now.getTime() + 3600_000 }, 'a.md', now, 24)).toBe(false);
  });
});

describe('pruneReads', () => {
  it('drops entries past the 7-day retention floor and keeps the rest', () => {
    // Retention is decoupled from windowHours (see the tests below) and
    // floored at 7 days, so demonstrating an actual drop needs an entry
    // older than that floor, not just older than the 24h window.
    const pruned = pruneReads({ 'old.md': hoursAgo(24 * 8), 'new.md': hoursAgo(2) }, now, 24);
    expect(Object.keys(pruned)).toEqual(['new.md']);
  });

  it('does not mutate its input', () => {
    const input = { 'old.md': hoursAgo(50) };
    pruneReads(input, now, 24);
    expect(input['old.md']).toBe(hoursAgo(50));
  });

  it('keeps an entry older than the window but inside the 7-day retention floor', () => {
    // 50h is outside a 24h suppression window but well inside 7 days.
    const pruned = pruneReads({ 'mid.md': hoursAgo(50) }, now, 24);
    expect(Object.keys(pruned)).toEqual(['mid.md']);
  });

  it('still drops an entry older than the 7-day retention floor', () => {
    const pruned = pruneReads({ 'ancient.md': hoursAgo(24 * 8) }, now, 24);
    expect(Object.keys(pruned)).toEqual([]);
  });

  it('with windowHours: 0, a prior entry still survives (retention is not tied to the disabled window)', () => {
    const pruned = pruneReads({ 'mid.md': hoursAgo(50) }, now, 0);
    expect(Object.keys(pruned)).toEqual(['mid.md']);
  });
});

describe('isRecentlyRead still honours the real window, unaffected by retention', () => {
  it('reports an entry inside the 7-day retention floor but outside a 24h window as NOT recent', () => {
    expect(isRecentlyRead({ 'mid.md': hoursAgo(50) }, 'mid.md', now, 24)).toBe(false);
  });
});

describe('sanitizeReads', () => {
  it('returns an empty record for a non-object', () => {
    expect(sanitizeReads('nope')).toEqual({});
    expect(sanitizeReads(null)).toEqual({});
  });

  it('drops non-numeric and non-finite values', () => {
    expect(sanitizeReads({ 'a.md': 'x', 'b.md': Number.NaN, 'c.md': 5 })).toEqual({ 'c.md': 5 });
  });
});

describe('recordNoteRead', () => {
  it('round-trips through the meta store and prunes on write', async () => {
    const db = await openDb();
    // Past the 7-day retention floor, not just past the 24h window --
    // see pruneReads's tests for why 24h alone would no longer prune this.
    await db.put('meta', { 'stale.md': hoursAgo(24 * 8) }, 'noteReads');
    const after = await recordNoteRead(db, 'fresh.md', now, 24);
    expect(after['fresh.md']).toBe(now.getTime());
    expect(after['stale.md']).toBeUndefined();
    expect(await loadNoteReads(db)).toEqual(after);
  });
});
