import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { loadNotes, findNote, resetNotesCache } from '../src/db/notes.js';
import type { Notes } from '../../pipeline/src/types.js';

const sample: Notes = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  notes: [{
    path: 'vault/a/consensus.md', title: 'Consensus',
    topic: 'db', category: 'db', tags: [], citations: [],
    blocks: [{ kind: 'prose', text: 'hello', clozes: [] }]
  }]
};

describe('loadNotes', () => {
  beforeEach(() => { resetNotesCache(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('fetches notes.json and returns it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(sample), { status: 200 })));
    await expect(loadNotes()).resolves.toEqual(sample);
  });

  it('fetches only once across repeated calls', async () => {
    // The whole file is held for the session; re-parsing ~1MB of JSON on
    // every note open would be pure waste.
    const spy = vi.fn(async () => new Response(JSON.stringify(sample), { status: 200 }));
    vi.stubGlobal('fetch', spy);
    await loadNotes();
    await loadNotes();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns null when offline with nothing cached, instead of throwing', async () => {
    // A fresh install that went offline before idling has no notes.json.
    // The viewer must say so plainly; review is unaffected either way.
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(loadNotes()).resolves.toBeNull();
  });

  it('returns null on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));
    await expect(loadNotes()).resolves.toBeNull();
  });

  it('retries after a failure rather than caching the null', async () => {
    const spy = vi.fn()
      .mockImplementationOnce(async () => { throw new TypeError('offline'); })
      .mockImplementationOnce(async () => new Response(JSON.stringify(sample), { status: 200 }));
    vi.stubGlobal('fetch', spy);
    await expect(loadNotes()).resolves.toBeNull();
    await expect(loadNotes()).resolves.toEqual(sample);
  });
});

describe('findNote', () => {
  it('finds a note by its exact vault path', () => {
    expect(findNote(sample, 'vault/a/consensus.md')?.title).toBe('Consensus');
  });

  it('returns null for an unknown path', () => {
    expect(findNote(sample, 'vault/nope.md')).toBeNull();
  });
});
