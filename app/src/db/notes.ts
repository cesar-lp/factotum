import type { Notes, NoteDoc } from '../../../pipeline/src/types.js';

/**
 * Notes are NOT stored in IndexedDB, unlike the deck.
 *
 * deck.json goes through mergeDeck because cards need review state joined
 * to them and need tombstoning across rebuilds. Notes need neither -- there
 * is no per-note state, and a removed note simply stops being listed. So
 * this is a session-lifetime memo over a fetch, and the Cache API (via the
 * service worker's network-first rule) provides persistence.
 *
 * The payoff is that openDb stays at version 1: no migration, no new object
 * store. IndexedDB holds the one irreplaceable thing in this app -- FSRS
 * review history -- and a reading feature has no business touching it.
 */
let cached: Notes | null = null;
let inFlight: Promise<Notes | null> | null = null;

/** Test seam. Not called by the app. */
export function resetNotesCache(): void {
  cached = null;
  inFlight = null;
}

export async function loadNotes(): Promise<Notes | null> {
  if (cached) return cached;
  // Collapse concurrent callers (a note open racing the idle prefetch)
  // onto one request rather than fetching the whole note corpus twice.
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await fetch('./notes.json', { cache: 'no-cache' });
      if (!response.ok) return null;
      const notes = (await response.json()) as Notes;
      cached = notes;
      return notes;
    } catch {
      // Offline with nothing cached. Deliberately NOT memoized as null:
      // connectivity comes back, and the next open should try again.
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function findNote(notes: Notes, path: string): NoteDoc | null {
  return notes.notes.find((note) => note.path === path) ?? null;
}

/**
 * Warms the cache once the dashboard is up, so opening a note offline
 * usually works. Fire-and-forget by design: nothing on screen depends on
 * it, and a failure just leaves the lazy path to retry.
 *
 * requestIdleCallback is unavailable on Safari, which is the app's primary
 * target, hence the timeout fallback.
 */
export function prefetchNotes(): void {
  const warm = (): void => { void loadNotes(); };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(warm, { timeout: 5000 });
  else setTimeout(warm, 2000);
}
