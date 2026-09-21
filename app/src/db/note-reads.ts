import type { FactotumDb } from './schema.js';

/**
 * When each note was last opened, by vault path.
 *
 * Lives in the existing `meta` store beside `settings`, deliberately NOT in
 * a store of its own: `openDb` stays at version 1, and IndexedDB's one
 * irreplaceable payload is FSRS review history, which a reading feature has
 * no business sitting next to. Losing this record is harmless -- the worst
 * case is a card you read about returning a day early.
 */
export type NoteReads = Record<string, number>;

const KEY = 'noteReads';

/** Bounds a corrupt write; far above any plausible vault. */
const MAX_ENTRIES = 5000;

export function sanitizeReads(value: unknown): NoteReads {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: NoteReads = {};
  let kept = 0;
  for (const [path, at] of Object.entries(value as Record<string, unknown>)) {
    if (typeof at !== 'number' || !Number.isFinite(at)) continue;
    out[path] = at;
    if (++kept >= MAX_ENTRIES) break;
  }
  return out;
}

export function isRecentlyRead(
  reads: NoteReads, path: string, now: Date, windowHours: number
): boolean {
  if (windowHours <= 0) return false;
  const at = reads[path];
  if (at === undefined) return false;
  const age = now.getTime() - at;
  // A negative age means a clock change put the stamp in the future.
  // Treating that as "not recent" fails open: you get tested, which is
  // the normal state of affairs, rather than suppressed indefinitely.
  if (age < 0) return false;
  return age < windowHours * 3600_000;
}

/** The floor on retention, independent of `windowHours` -- see `pruneReads`. */
const MIN_RETENTION_HOURS = 24 * 7;

export function pruneReads(reads: NoteReads, now: Date, windowHours: number): NoteReads {
  // Retention deliberately does NOT use windowHours directly: this store
  // also drives the "Recently read" landing screen, which has no reason to
  // track the suppression window. With the default 24h it would show only
  // today's notes, and with the documented `windowHours: 0` escape hatch --
  // meant to just turn suppression off -- pruneReads would run with a
  // window of 0 on every write, and the landing screen would strand at
  // exactly one row forever. A week-long floor keeps the record useful for
  // that screen without weakening `isRecentlyRead`, which still enforces
  // the real window unchanged wherever suppression actually matters.
  const retentionHours = Math.max(windowHours, MIN_RETENTION_HOURS);
  const out: NoteReads = {};
  for (const path of Object.keys(reads)) {
    if (isRecentlyRead(reads, path, now, retentionHours)) out[path] = reads[path] as number;
  }
  return out;
}

export async function loadNoteReads(db: FactotumDb): Promise<NoteReads> {
  return sanitizeReads(await db.get('meta', KEY));
}

export async function recordNoteRead(
  db: FactotumDb, path: string, now: Date, windowHours: number
): Promise<NoteReads> {
  const current = await loadNoteReads(db);
  // Prune before inserting, so the record self-limits and a window of 0
  // still records the read (the filter, not the store, decides relevance).
  const next = { ...pruneReads(current, now, windowHours), [path]: now.getTime() };
  await db.put('meta', next, KEY);
  return next;
}
