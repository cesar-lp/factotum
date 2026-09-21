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
  it('drops entries older than the window and keeps the rest', () => {
    const pruned = pruneReads({ 'old.md': hoursAgo(50), 'new.md': hoursAgo(2) }, now, 24);
    expect(Object.keys(pruned)).toEqual(['new.md']);
  });

  it('does not mutate its input', () => {
    const input = { 'old.md': hoursAgo(50) };
    pruneReads(input, now, 24);
    expect(input['old.md']).toBe(hoursAgo(50));
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
    await db.put('meta', { 'stale.md': hoursAgo(99) }, 'noteReads');
    const after = await recordNoteRead(db, 'fresh.md', now, 24);
    expect(after['fresh.md']).toBe(now.getTime());
    expect(after['stale.md']).toBeUndefined();
    expect(await loadNoteReads(db)).toEqual(after);
  });
});
