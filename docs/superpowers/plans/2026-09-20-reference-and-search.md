# Reference and Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-text search over the vault and make reading a note unconditionally free, by replacing answer-masking with a read-suppression filter that defers a read note's due cards instead of hiding its prose.

**Architecture:** Three independent pieces. (1) A `noteReads` timestamp record in the existing IndexedDB `meta` store feeds two new pure filters in `scheduler/queue.ts`, composed by `main.ts` before `buildSession`. (2) The masking layer (`ui/note-mask.ts` and every `masked` parameter under it) is deleted, replaced by an in-flight session filter applied when the review screen resumes from a note. (3) A dependency-free scanning search module over the already-loaded `notes.json`, surfaced at a new `#search` route.

**Tech Stack:** TypeScript (strict), Vitest (`environment: 'node'` — **no DOM**), `idb` for IndexedDB, Vite. No new dependencies are added by this plan.

**Spec:** `docs/superpowers/specs/2026-09-20-reference-and-search-design.md`

## Global Constraints

- **No new runtime dependencies.** The budget is three (`gray-matter`, `idb`, `ts-fsrs`) and this plan adds none.
- **No new generated artifact.** Search is a scan. Do not create a search index file — `ci.yml`'s deck-drift check would have to cover it.
- **No IndexedDB schema version bump.** `noteReads` is a key in the existing `meta` store, exactly as `settings` already is. `openDb` stays at version 1.
- **Never write to the `reviews` object store** for anything in this plan. Suppression is a filter, not a review.
- **Tests run in `environment: 'node'`. There is no DOM, no `document`, no `jsdom`.** Every new UI unit must be a pure function returning an HTML **string**, tested as a string. DOM wiring is hand-verified (Task 13).
- **Escape before markup, slice before escape.** `note-render.ts`'s contract: offsets index the RAW string, so slice raw and escape each piece afterwards. Escaping first shifts every offset past the first `<` or `&`.
- **Branch naming:** `<type>/<short-kebab-description>`, Conventional Commits types. Never `claude/`.
- **Pre-PR gate:** `npm test && npm run typecheck && npm run build:deck && git status --porcelain` — the last must print nothing.
- **Before any `build:deck`,** run `git status --porcelain | grep '^?? vault/'` and confirm nothing unrelated is untracked.

## File Structure

**Created:**
- `app/src/db/note-reads.ts` — load/record/prune the `noteReads` map. One responsibility: read timestamps.
- `app/src/search.ts` — pure search over `Notes`. No DOM, no IndexedDB.
- `app/src/ui/search.ts` — pure HTML-string rendering of results + DOM wiring for the `#search` screen.
- `app/src/styles/search.css`
- `app/tests/note-reads.test.ts`, `app/tests/search.test.ts`, `app/tests/search-render.test.ts`

**Modified:**
- `pipeline/src/types.ts`, `pipeline/src/build.ts` — `tags` on `NoteDoc`
- `app/src/db/schema.ts`, `app/src/db/settings.ts`, `app/src/ui/settings.ts` — `readSuppressionHours`
- `app/src/scheduler/queue.ts` — `selectNotRecentlyRead`, `countSuppressed`
- `app/src/ui/review.ts` — `dropRecentlyRead`, the returned controller, `totalCards` becomes `let`
- `app/src/main.ts` — filter composition, `readAt` writes, resume hook, `#search` dispatch
- `app/src/route.ts` — `{ kind: 'search'; query: string }`
- `app/src/ui/dashboard.ts` — Search button, deferred-count line
- `app/src/ui/note.ts`, `app/src/ui/note-render.ts`, `app/src/styles/note.css` — masking removed, `data-block` added

**Deleted:**
- `app/src/ui/note-mask.ts`, `app/tests/note-mask.test.ts`

---

### Task 1: `tags` reaches `NoteDoc`

**Files:**
- Modify: `pipeline/src/types.ts` (the `NoteDoc` interface)
- Modify: `pipeline/src/build.ts:272-290` (`buildNotes`)
- Test: `pipeline/tests/notes-build.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `NoteDoc.tags: string[]`, consumed by Task 9's search over note-level fields.

- [ ] **Step 1: Write the failing test**

Append to `pipeline/tests/notes-build.test.ts`:

```ts
describe('buildNotes', () => {
  it('carries frontmatter tags onto the NoteDoc', () => {
    const body = 'MTU is ==1500 bytes==.';
    const cards = assignIds(parseCards(body, 0), new Set<string>());
    const note = {
      path: 'vault/t.md', topic: 'networking', category: 'networking',
      tags: ['tcp', 'mtu'], citations: [], cards
    };
    const notes = buildNotes([note], new Map([['vault/t.md', body]]), new Date('2026-09-20T00:00:00Z'));
    expect(notes.notes[0]?.tags).toEqual(['tcp', 'mtu']);
  });
});
```

Add `buildNotes` to the existing import from `../src/build.js` at the top of the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run pipeline/tests/notes-build.test.ts -t 'carries frontmatter tags'`
Expected: FAIL — `expected undefined to deeply equal [ 'tcp', 'mtu' ]`

- [ ] **Step 3: Add the field to the type**

In `pipeline/src/types.ts`, add `tags` to `NoteDoc`, after `category`:

```ts
export interface NoteDoc {
  path: string;
  title: string;
  topic: string;
  category: string;
  tags: string[];
  citations: string[];
  blocks: NoteBlock[];
}
```

- [ ] **Step 4: Populate it in `buildNotes`**

In `pipeline/src/build.ts`, in the object literal returned from the `notes.map` callback, add `tags` after `category`:

```ts
    return {
      path: note.path,
      title: noteTitle(note.path, blocks),
      topic: note.topic,
      category: note.category,
      tags: note.tags,
      citations: note.citations,
      blocks
    };
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS. `ParsedNote extends NoteMeta`, so `note.tags` already exists and is typed `string[]`.

- [ ] **Step 6: Rebuild the deck**

Run: `git status --porcelain | grep '^?? vault/'`
Expected: no output. If anything appears, stop — commit it on its own branch or move it out of the tree first (see `CLAUDE.md`).

Then run: `npm run build:deck`
Expected: `deck/notes.json` changes (every note gains a `tags` array). `deck/deck.json` should NOT change — card content is untouched.

- [ ] **Step 7: Commit**

```bash
git add pipeline/src/types.ts pipeline/src/build.ts pipeline/tests/notes-build.test.ts deck/notes.json
git commit -m "feat: carry note tags into notes.json

Search needs to match a note tagged tcp that never spells the word in
prose. Tags already reach DeckCard; buildNotes was dropping them."
```

---

### Task 2: The `readSuppressionHours` setting

**Files:**
- Modify: `app/src/db/schema.ts` (the `Settings` interface)
- Modify: `app/src/db/settings.ts` (`DEFAULT_SETTINGS`, `sanitizeSettings`)
- Test: `app/tests/settings.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `Settings.readSuppressionHours: number`, default `24`, clamped to `[0, 168]`. Consumed by Tasks 4, 5, 6.

- [ ] **Step 1: Write the failing tests**

Append to `app/tests/settings.test.ts`:

```ts
describe('readSuppressionHours', () => {
  it('defaults to 24 when absent', () => {
    expect(sanitizeSettings({}).readSuppressionHours).toBe(24);
  });

  it('accepts 0, which disables suppression entirely', () => {
    expect(sanitizeSettings({ readSuppressionHours: 0 }).readSuppressionHours).toBe(0);
  });

  it('clamps a negative value to 0 rather than scheduling into the past', () => {
    expect(sanitizeSettings({ readSuppressionHours: -5 }).readSuppressionHours).toBe(0);
  });

  it('clamps an absurd value to one week', () => {
    expect(sanitizeSettings({ readSuppressionHours: 10000 }).readSuppressionHours).toBe(168);
  });

  it('falls back to the default for a non-finite value', () => {
    expect(sanitizeSettings({ readSuppressionHours: Number.NaN }).readSuppressionHours).toBe(24);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/tests/settings.test.ts -t 'readSuppressionHours'`
Expected: FAIL — `expected undefined to be 24`

- [ ] **Step 3: Add the field to the type**

In `app/src/db/schema.ts`, add to the `Settings` interface after `obsidianVault`:

```ts
  /**
   * How long after opening a note its DUE cards stay out of review.
   *
   * FSRS estimates retention across elapsed time, so testing a card
   * moments after reading its note measures nothing and writes an
   * inflated stability score. Suppression declines to take that
   * measurement. `0` disables the mechanic entirely and is the intended
   * escape hatch -- there is deliberately no separate on/off flag.
   */
  readSuppressionHours: number;
```

- [ ] **Step 4: Add the default and the sanitizer line**

In `app/src/db/settings.ts`, add to `DEFAULT_SETTINGS`:

```ts
  readSuppressionHours: 24
```

and inside `sanitizeSettings`, alongside the other `clampFinite` calls:

```ts
  const readSuppressionHours = clampFinite(record['readSuppressionHours'], 0, 168, DEFAULT_SETTINGS.readSuppressionHours);
```

then add `readSuppressionHours` to the returned object literal.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/db/schema.ts app/src/db/settings.ts app/tests/settings.test.ts
git commit -m "feat: add readSuppressionHours setting

The window is a guess, not a derived constant -- a re-read elevates
recall for days, so 24h shrinks stability inflation without removing
it. That makes it a setting rather than a constant pretending to be
principled."
```

---

### Task 3: The `noteReads` store

**Files:**
- Create: `app/src/db/note-reads.ts`
- Test: `app/tests/note-reads.test.ts`

**Interfaces:**
- Consumes: `FactotumDb` from `./schema.js`.
- Produces:
  - `export type NoteReads = Record<string, number>`
  - `export function pruneReads(reads: NoteReads, now: Date, windowHours: number): NoteReads`
  - `export function isRecentlyRead(reads: NoteReads, path: string, now: Date, windowHours: number): boolean`
  - `export function sanitizeReads(value: unknown): NoteReads`
  - `export async function loadNoteReads(db: FactotumDb): Promise<NoteReads>`
  - `export async function recordNoteRead(db: FactotumDb, path: string, now: Date, windowHours: number): Promise<NoteReads>`

- [ ] **Step 1: Write the failing tests**

Create `app/tests/note-reads.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/tests/note-reads.test.ts`
Expected: FAIL — cannot resolve `../src/db/note-reads.js`

- [ ] **Step 3: Write the implementation**

Create `app/src/db/note-reads.ts`:

```ts
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

export function pruneReads(reads: NoteReads, now: Date, windowHours: number): NoteReads {
  const out: NoteReads = {};
  for (const path of Object.keys(reads)) {
    if (isRecentlyRead(reads, path, now, windowHours)) out[path] = reads[path] as number;
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/tests/note-reads.test.ts && npm run typecheck`
Expected: PASS.

Note: if `pruneReads` with `windowHours: 0` empties the record, that is correct and the `recordNoteRead` test still passes because the freshly-read path is inserted after pruning.

- [ ] **Step 5: Commit**

```bash
git add app/src/db/note-reads.ts app/tests/note-reads.test.ts
git commit -m "feat: record when each note was last opened

A key in the existing meta store, not a new object store: openDb stays
at version 1, and this sits beside settings rather than beside the FSRS
history it must never touch."
```

---

### Task 4: The suppression filters

**Files:**
- Modify: `app/src/scheduler/queue.ts` (add after `selectEnabled`, which ends at line 117)
- Test: `app/tests/queue.test.ts`

**Interfaces:**
- Consumes: `NoteReads`, `isRecentlyRead` from Task 3.
- Produces:
  - `export function selectNotRecentlyRead(cards: StoredCard[], reviews: Map<string, ReviewState>, reads: NoteReads, now: Date, windowHours: number): StoredCard[]`
  - `export function countSuppressed(cards: StoredCard[], reviews: Map<string, ReviewState>, reads: NoteReads, now: Date, windowHours: number): number`

Both are consumed by Task 5.

**Why `reviews` is a parameter:** suppression applies to DUE cards only, never new ones, so the filter must know which cards have review state. See the comment block in Step 3.

- [ ] **Step 1: Write the failing tests**

Append to `app/tests/queue.test.ts` (the file already defines `card`, `due`, and `now` helpers at the top — reuse them; add `selectNotRecentlyRead` and `countSuppressed` to the existing import from `../src/scheduler/queue.js`):

```ts
describe('selectNotRecentlyRead', () => {
  const read = (hoursAgo: number) => ({ 'vault/a.md': now.getTime() - hoursAgo * 3600_000 });

  it('drops a due card whose note was just read', () => {
    const cards = [card('card-due1', 'net')];
    const reviews = new Map([['card-due1', due('card-due1')]]);
    expect(selectNotRecentlyRead(cards, reviews, read(1), now, 24)).toEqual([]);
  });

  it('keeps a due card whose note was read outside the window', () => {
    const cards = [card('card-due1', 'net')];
    const reviews = new Map([['card-due1', due('card-due1')]]);
    expect(selectNotRecentlyRead(cards, reviews, read(30), now, 24).map((c) => c.id)).toEqual(['card-due1']);
  });

  it('NEVER suppresses a new card -- reading a note is how you meet it', () => {
    const cards = [card('card-new1', 'net')];
    expect(selectNotRecentlyRead(cards, new Map(), read(1), now, 24).map((c) => c.id)).toEqual(['card-new1']);
  });

  it('keeps a due card from a different note in the same category', () => {
    const other = { ...card('card-due2', 'net'), source: { path: 'vault/b.md', block: 'card-due2' } };
    const reviews = new Map([['card-due2', due('card-due2')]]);
    expect(selectNotRecentlyRead([other], reviews, read(1), now, 24).map((c) => c.id)).toEqual(['card-due2']);
  });

  it('is a no-op when the window is 0', () => {
    const cards = [card('card-due1', 'net')];
    const reviews = new Map([['card-due1', due('card-due1')]]);
    expect(selectNotRecentlyRead(cards, reviews, read(1), now, 0).map((c) => c.id)).toEqual(['card-due1']);
  });

  it('preserves order', () => {
    const a = card('card-a', 'net');
    const b = { ...card('card-b', 'net'), source: { path: 'vault/b.md', block: 'card-b' } };
    const c = card('card-c', 'net');
    const reviews = new Map([['card-a', due('card-a')], ['card-c', due('card-c')]]);
    expect(selectNotRecentlyRead([a, b, c], reviews, read(1), now, 24).map((x) => x.id)).toEqual(['card-b']);
  });
});

describe('countSuppressed', () => {
  it('counts exactly what selectNotRecentlyRead removed', () => {
    const cards = [card('card-due1', 'net'), card('card-new1', 'net')];
    const reviews = new Map([['card-due1', due('card-due1')]]);
    const reads = { 'vault/a.md': now.getTime() };
    expect(countSuppressed(cards, reviews, reads, now, 24)).toBe(1);
    expect(selectNotRecentlyRead(cards, reviews, reads, now, 24)).toHaveLength(1);
  });

  it('is 0 when nothing was read', () => {
    const cards = [card('card-due1', 'net')];
    const reviews = new Map([['card-due1', due('card-due1')]]);
    expect(countSuppressed(cards, reviews, {}, now, 24)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/tests/queue.test.ts -t 'RecentlyRead'`
Expected: FAIL — `selectNotRecentlyRead is not a function`

- [ ] **Step 3: Write the implementation**

Add to `app/src/scheduler/queue.ts`, immediately after `selectEnabled`. Also add the import at the top: `import { isRecentlyRead, type NoteReads } from '../db/note-reads.js';`

```ts
/**
 * Drops DUE cards whose note was opened within the suppression window.
 *
 * FSRS estimates retention across elapsed time. A card tested moments
 * after its note was read measures nothing about memory and writes an
 * inflated stability score into the one store this app cannot rebuild.
 * Deferring the test is how that measurement is declined.
 *
 * Like `selectEnabled` above, this is a filter, not a freeze: FSRS state
 * is untouched and due dates keep advancing while a note is suppressed.
 *
 * NEW CARDS ARE NEVER SUPPRESSED, and the reason is the one `note-mask.ts`
 * gave before this replaced it: suppression protects a pending test, and a
 * card never asked has none. Reading a note and then learning its cards is
 * the normal order of operations, not contamination -- and under the
 * planned path feature, reading a note is precisely what INTRODUCES its
 * cards, so suppressing them here would only have to be undone there.
 */
export function selectNotRecentlyRead(
  cards: StoredCard[],
  reviews: Map<string, ReviewState>,
  reads: NoteReads,
  now: Date,
  windowHours: number
): StoredCard[] {
  if (windowHours <= 0) return cards;
  return cards.filter((card) => {
    if (!reviews.has(card.id)) return true; // new: nothing to protect
    return !isRecentlyRead(reads, card.source.path, now, windowHours);
  });
}

/**
 * How many cards `selectNotRecentlyRead` would remove. Kept separate from
 * `buildSession`'s return type so the dashboard can say what happened
 * without every existing session call site changing shape.
 *
 * A card that leaves the queue with no explanation is the same defect the
 * silently-dropped re-queued card already is (state-and-roadmap §6).
 */
export function countSuppressed(
  cards: StoredCard[],
  reviews: Map<string, ReviewState>,
  reads: NoteReads,
  now: Date,
  windowHours: number
): number {
  return cards.length - selectNotRecentlyRead(cards, reviews, reads, now, windowHours).length;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test && npm run typecheck`
Expected: PASS, including all pre-existing queue tests unchanged.

- [ ] **Step 5: Commit**

```bash
git add app/src/scheduler/queue.ts app/tests/queue.test.ts
git commit -m "feat: filter due cards whose note was just read

Same species as selectEnabled and stated the same way: a filter, not a
freeze. New cards are exempt for the reason note-mask.ts gave -- a card
never asked has no pending test to protect."
```

---

### Task 5: Compose the filter into the session builders

**Files:**
- Modify: `app/src/main.ts:5-26` (`DashboardState` lives in `route.ts` — see below), `app/src/main.ts:79-108` (`loadDashboardState`), `app/src/main.ts:173-181` (the `focus` branch)
- Modify: `app/src/route.ts:5-26` (`DashboardState` interface)

**Interfaces:**
- Consumes: Task 3's `loadNoteReads`, Task 4's `selectNotRecentlyRead` / `countSuppressed`.
- Produces: `DashboardState.deferredCount: number`, consumed by Task 6.

**Note on placement:** `DashboardState` is declared in `app/src/route.ts` (lines 5-26), not `main.ts`. `loadDashboardState` in `main.ts` constructs it.

- [ ] **Step 1: Add the field to `DashboardState`**

In `app/src/route.ts`, add to the `DashboardState` interface:

```ts
  /** Due cards held back because their note was read inside the window. */
  deferredCount: number;
```

- [ ] **Step 2: Load reads and apply the filter in `loadDashboardState`**

In `app/src/main.ts`, add `loadNoteReads` to the `Promise.all` destructure and array:

```ts
  const [cards, reviews, settings, seen, streak, lastSevenDays, reads] = await Promise.all([
    db.getAll('cards'),
    loadReviews(db),
    getSettings(db),
    newCardsSeenToday(db, now),
    getStreak(db, now),
    getLastSevenDays(db, now),
    loadNoteReads(db)
  ]);
```

(Keep the existing comment above `getStreak` exactly as it is.)

Then, after the existing `const enabled = selectEnabled(...)` line, add:

```ts
  // Suppression composes AFTER muting and BEFORE the builders, the same
  // seam selectEnabled already occupies, so neither filter knows about the
  // other and `buildSession` keeps exactly one job.
  const servable = selectNotRecentlyRead(enabled, reviews, reads, now, settings.readSuppressionHours);
  const deferredCount = countSuppressed(enabled, reviews, reads, now, settings.readSuppressionHours);
```

Change `buildSession`'s `cards:` and `buildExtension`'s `cards:` from `enabled` to `servable`, and add `deferredCount` to the returned object:

```ts
  const session = buildSession({
    cards: servable,
    reviews,
    now,
    newCardsPerDay: settings.newCardsPerDay,
    newCardsSeenToday: seen
  });
  const extension = buildExtension({ cards: servable, reviews });
  const topics = summarizeTopics(cards, reviews, now);

  return { session, extension, newCardsSeenToday: seen, streak, lastSevenDays, topics, deferredCount };
```

Add the imports: `import { loadNoteReads } from './db/note-reads.js';` and add `selectNotRecentlyRead, countSuppressed` to the existing `./scheduler/queue.js` import.

- [ ] **Step 3: Apply suppression to focused sessions too**

`buildFocusSession` filters by category itself and deliberately ignores `disabledCategories`, so the caller must apply suppression. In `main.ts`'s `decision.kind === 'focus'` branch (line 173), change the body to:

```ts
  if (decision.kind === 'focus') {
    const [cards, reviews, settings, reads] = await Promise.all([
      db.getAll('cards'), loadReviews(db), getSettings(db), loadNoteReads(db)
    ]);
    // Muting is a preference the user is overriding on purpose by choosing
    // this category, so `selectEnabled` stays out of focus mode. Suppression
    // is not a preference -- it is a measurement-validity rule, and there is
    // no version of "test me on the paragraph I read four minutes ago" worth
    // honouring. Hence the asymmetry.
    const servable = selectNotRecentlyRead(cards, reviews, reads, now, settings.readSuppressionHours);
    await begin(
      buildFocusSession({ cards: servable, reviews, now, category: decision.category }),
      () => { window.location.hash = '#topics'; }
    );
    return;
  }
```

- [ ] **Step 4: Fix the type error in `route.test.ts`**

`app/tests/route.test.ts` builds `DashboardState` fixtures. Adding a required field breaks them. Find the fixture helper that constructs a `DashboardState` and add `deferredCount: 0`.

Run: `npm run typecheck`
Expected: errors pointing at the fixture(s); fix each by adding `deferredCount: 0`.

- [ ] **Step 5: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/main.ts app/src/route.ts app/tests/route.test.ts
git commit -m "feat: apply read-suppression to the daily and focused queues

Focus mode gets suppression although it deliberately skips muting:
muting is a preference being overridden on purpose, suppression is a
validity rule. The asymmetry is intentional and commented as such."
```

---

### Task 6: Say what was deferred

**Files:**
- Modify: `app/src/ui/dashboard.ts` (the `DashboardProps` interface at lines 3-39; the `newCardsLine` block at lines 91-95; the `innerHTML` template)
- Modify: `app/src/main.ts:284-295` (the `renderDashboard` call)
- Test: `app/tests/dashboard.test.ts` (create if absent)

**Interfaces:**
- Consumes: `DashboardState.deferredCount` from Task 5.
- Produces: `export function deferredLine(count: number): string` — an HTML string, `''` when `count === 0`.

- [ ] **Step 1: Write the failing test**

Create (or append to) `app/tests/dashboard.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/tests/dashboard.test.ts`
Expected: FAIL — `deferredLine is not exported`

- [ ] **Step 3: Implement and render it**

In `app/src/ui/dashboard.ts`, add the exported helper near `newCardsLine`'s construction:

```ts
/**
 * A card leaving the queue without explanation is the same defect as the
 * silently-dropped re-queued card (state-and-roadmap §6). Suppression is
 * deliberate, so it is stated.
 */
export function deferredLine(count: number): string {
  if (count <= 0) return '';
  const noun = count === 1 ? 'card' : 'cards';
  const theirs = count === 1 ? 'its note' : 'their notes';
  return `<div style="color:var(--dim);font-size:13px;margin-top:4px">${count} ${noun} deferred &mdash; you read ${theirs} recently</div>`;
}
```

Add `deferredCount: number;` to `DashboardProps`, and render it immediately after `${newCardsLine}` in the `innerHTML` template:

```ts
      ${newCardsLine}
      ${deckUnavailable ? '' : deferredLine(props.deferredCount)}
```

- [ ] **Step 4: Pass it from `main.ts`**

In the `renderDashboard` call, add after `newCardsSeenToday`:

```ts
    deferredCount: state.deferredCount,
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/ui/dashboard.ts app/src/main.ts app/tests/dashboard.test.ts
git commit -m "feat: name the cards read-suppression held back

The count is surfaced rather than left silent, so the queue shrinking
is never mistaken for cards going missing."
```

---

### Task 7: Record the read when a note opens

**Files:**
- Modify: `app/src/main.ts:184-204` (the `decision.kind === 'note'` branch)

**Interfaces:**
- Consumes: Task 3's `recordNoteRead`.
- Produces: nothing new; this is the write side of the mechanic.

- [ ] **Step 1: Record on open**

In the `decision.kind === 'note'` branch, after `const note = notes ? findNote(notes, decision.path) : null;`, add:

```ts
    // Recorded on OPEN, not on dwell time or scroll depth. Opening and
    // immediately backing out defers that note's due cards by a day, which
    // is trivially recoverable -- whereas a dwell threshold means timers,
    // visibility handling and a new class of flaky test for a problem that
    // resolves itself tomorrow.
    //
    // Only for a note that actually exists: a stale or mistyped path must
    // not write a read for something the reader never saw.
    if (note) await recordNoteRead(db, decision.path, now, settings.readSuppressionHours);
```

Add the import: `import { recordNoteRead } from './db/note-reads.js';`

- [ ] **Step 2: Typecheck and hand-verify**

Run: `npm run typecheck && npm test`
Expected: PASS.

Then hand-verify in the browser (`npm run dev`):
1. Note the dashboard's due count.
2. Open a note that has at least one due card (topics → a category → a note title).
3. Go back to the dashboard.
4. The due count is lower and the deferred line names the difference.

- [ ] **Step 3: Commit**

```bash
git add app/src/main.ts
git commit -m "feat: record a note read when its viewer opens

On open rather than on dwell: the cost of an accidental open is one
day's deferral, and a dwell threshold buys timers and flaky tests to
avoid it."
```

---

### Task 8: Filter the in-flight session on resume

**Files:**
- Modify: `app/src/ui/review.ts` (add `dropRecentlyRead` near `distinctCardCount` at line 148; `totalCards` at line 200 becomes `let`; `startReview` returns a controller)
- Modify: `app/src/main.ts:122-124` and `app/src/main.ts:134-136` (both resume paths), `app/src/main.ts:57` (`suspendedReview` shape), `app/src/main.ts:152-161` (`begin`)
- Test: `app/tests/review-requeue.test.ts`

**Interfaces:**
- Consumes: Task 3's `NoteReads` / `isRecentlyRead`.
- Produces:
  - `export function dropRecentlyRead(session: StoredCard[], index: number, drop: ReadonlySet<string>, arrivedFrom: string | null): StoredCard[]`
  - `export interface ReviewController { dropRead(reads: NoteReads, now: Date, windowHours: number): void }`
  - `startReview` now returns `Promise<ReviewController>` instead of `Promise<void>`.

**Why a controller is needed:** `main.ts`'s resume path does `appRoot.replaceChildren(suspendedReview.node); return;` — no code in `review.ts` runs. And `deps.session` is owned by `main.ts` and mutated **by reference**, so the survivors must be written back with `splice`, never by rebinding.

- [ ] **Step 1: Write the failing tests**

Append to `app/tests/review-requeue.test.ts` (add `dropRecentlyRead` to the existing import from `../src/ui/review.js`):

```ts
describe('dropRecentlyRead', () => {
  const s = (...ids: string[]): StoredCard[] => ids.map((id) => ({
    id, format: 'qa', topic: 't', category: 'c', tags: [], prompt: id, answer: 'a',
    source: { path: 'vault/a.md', block: id }, citations: [], tombstoned: false
  }));

  it('removes a matching card ahead of the cursor', () => {
    const out = dropRecentlyRead(s('a', 'b', 'c', 'd'), 1, new Set(['c']), null);
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'd']);
  });

  it('NEVER removes a card at or before the cursor -- those are rated or owed', () => {
    const out = dropRecentlyRead(s('a', 'b', 'c'), 1, new Set(['a', 'b']), null);
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('never removes the arrived-from card, even ahead of the cursor', () => {
    const out = dropRecentlyRead(s('a', 'b', 'c'), 0, new Set(['b', 'c']), 'b');
    expect(out.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('leaves the cursor pointing at the same card', () => {
    const session = s('a', 'b', 'c', 'd');
    const index = 1;
    const before = session[index];
    const out = dropRecentlyRead(session, index, new Set(['c', 'd']), null);
    expect(out[index]).toBe(before);
  });

  it('does not mutate its input', () => {
    const session = s('a', 'b');
    dropRecentlyRead(session, 0, new Set(['b']), null);
    expect(session).toHaveLength(2);
  });

  it('is a no-op when nothing matches', () => {
    const session = s('a', 'b');
    expect(dropRecentlyRead(session, 0, new Set(['z']), null)).toEqual(session);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/tests/review-requeue.test.ts -t 'dropRecentlyRead'`
Expected: FAIL — `dropRecentlyRead is not a function`

- [ ] **Step 3: Write the pure function**

Add to `app/src/ui/review.ts`, immediately after `distinctPosition`:

```ts
/**
 * Removes cards from a LIVE session whose notes were read during a detour
 * into the note viewer, returning the survivors.
 *
 * Three invariants, all pinned by tests:
 *
 * 1. Nothing at or before `index` is removed. Those cards are already
 *    rated, or are the one on screen that still owes a rating.
 * 2. `arrivedFrom` is never removed. Currently subsumed by rule 1 (a note
 *    is only ever opened from the card at `index`), but stated separately
 *    so a future change to how notes are reached cannot silently break it.
 * 3. Removals happen strictly AFTER the cursor, so `index` stays valid.
 *    This is what keeps the change away from requeueIndex/promoteReady,
 *    which are the most delicate code in this file: neither ever observes
 *    a shifted cursor.
 */
export function dropRecentlyRead(
  session: StoredCard[],
  index: number,
  drop: ReadonlySet<string>,
  arrivedFrom: string | null
): StoredCard[] {
  return session.filter((card, i) => {
    if (i <= index) return true;
    if (card.id === arrivedFrom) return true;
    return !drop.has(card.id);
  });
}
```

- [ ] **Step 4: Return a controller from `startReview`**

In `app/src/ui/review.ts`:

Add the import: `import { isRecentlyRead, type NoteReads } from '../db/note-reads.js';`

Add the exported interface above `ReviewDeps`:

```ts
/**
 * The handle `main.ts` keeps on a suspended review screen. The screen is
 * resumed by reattaching its detached DOM node, so NO code in this module
 * runs on resume -- this is the only hook through which the outside world
 * can tell a live session that something changed while it was set aside.
 */
export interface ReviewController {
  dropRead(reads: NoteReads, now: Date, windowHours: number): void;
}
```

Change line 200 from `const totalCards = ...` to:

```ts
  // `let`, not `const`: dropRead below shrinks the session when the reader
  // detours into a note, and the denominator has to follow or the progress
  // bar overruns 100%.
  let totalCards = distinctCardCount(deps.session);
```

Change the signature to `export async function startReview(root: HTMLElement, deps: ReviewDeps): Promise<ReviewController> {`.

Replace the final `draw(false);` at the end of the function with:

```ts
  const dropRead = (reads: NoteReads, at: Date, windowHours: number): void => {
    const drop = new Set(
      deps.session
        // A card with review state is a due card; a new card is never
        // suppressed (see selectNotRecentlyRead's comment for why).
        .filter((c) => reviewStates.has(c.id) && isRecentlyRead(reads, c.source.path, at, windowHours))
        .map((c) => c.id)
    );
    if (drop.size === 0) return;

    const current = deps.session[index] ?? null;
    const survivors = dropRecentlyRead(deps.session, index, drop, current?.id ?? null);
    if (survivors.length === deps.session.length) return;

    // splice, never reassign: deps.session is owned by main.ts and this
    // module's closure captured THIS array. Rebinding it would leave the
    // screen rendering from an array nobody else can see.
    deps.session.splice(0, deps.session.length, ...survivors);
    totalCards = distinctCardCount(deps.session);

    // Patch the header in place rather than calling draw(): a redraw would
    // rebuild the current card and throw away the revealed state the
    // reader left it in, which the note detour exists to preserve.
    const position = distinctPosition(deps.session, index);
    const counter = root.querySelector('.review-counter');
    if (counter) counter.textContent = `${position} / ${totalCards}`;
    const bar = root.querySelector<HTMLElement>('.progress i');
    if (bar) bar.style.width = `${(position / totalCards) * 100}%`;
  };

  draw(false);

  return { dropRead };
}
```

- [ ] **Step 5: Store and call the controller from `main.ts`**

Change the `suspendedReview` declaration (line 57):

```ts
let suspendedReview: { hash: string; node: HTMLElement; controller: ReviewController } | null = null;
```

In `begin` (lines 152-161), capture the controller:

```ts
  const begin = async (session: StoredCard[], onDone: () => void): Promise<void> => {
    const node = document.createElement('div');
    node.className = 'screen-host';
    appRoot.replaceChildren(node);
    const controller = await startReview(node, { db, session, repo: REPO, onDone });
    suspendedReview = { hash, node, controller };
  };
```

(Note the reorder: `suspendedReview` is now assigned **after** `startReview` resolves, since the controller does not exist before then.)

Add a shared helper above `route`:

```ts
/**
 * Applied whenever a suspended review screen is reattached. Recomputed from
 * the store rather than from "which note did we just open", so a detour
 * through several notes is handled by the same code path as one.
 */
async function applyReadsToResumed(db: FactotumDb, controller: ReviewController): Promise<void> {
  const [settings, reads] = await Promise.all([getSettings(db), loadNoteReads(db)]);
  controller.dropRead(reads, new Date(), settings.readSuppressionHours);
}
```

Then change both resume paths. Lines 122-124 become:

```ts
  if (suspendedReview && resumesSuspendedSession(hash, suspendedReview.hash)) {
    appRoot.replaceChildren(suspendedReview.node);
    await applyReadsToResumed(db, suspendedReview.controller);
    return;
  }
```

Lines 134-136 become:

```ts
  if (decision.kind === 'resume' && suspendedReview) {
    appRoot.replaceChildren(suspendedReview.node);
    await applyReadsToResumed(db, suspendedReview.controller);
    return;
  }
```

Add `ReviewController` to the existing import from `./ui/review.js`.

- [ ] **Step 6: Run tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Hand-verify the loop (this is the interaction bug risk)**

`npm run dev`, then:
1. Start a review on a category where one note contributes several due cards.
2. Advance to card 4. Reveal it, but do **not** rate it.
3. Tap **open note**. Read the note. Tap Back.
4. **The same card is on screen, still revealed.** The counter denominator has dropped.
5. Rate it. The next card is **not** from the note you just read.
6. Rate through to the end; the session completes without a stall or an empty card.

- [ ] **Step 8: Commit**

```bash
git add app/src/ui/review.ts app/src/main.ts app/tests/review-requeue.test.ts
git commit -m "feat: drop just-read cards from a live review session

Suppression is computed when a session is BUILT, so reading a note
mid-session left its other cards sitting in the in-memory array. The
resume path reattaches a detached DOM node and runs no review code, so
startReview now returns a controller for main.ts to call.

Removals are strictly after the cursor, which is what keeps requeueIndex
and promoteReady from ever seeing a shifted index."
```

---

### Task 9: Delete masking

**Files:**
- Delete: `app/src/ui/note-mask.ts`, `app/tests/note-mask.test.ts`
- Modify: `app/src/ui/note-render.ts` (lines 13-15, 29, 44, 63, 94, 102, 118, 122, 134)
- Modify: `app/src/ui/note.ts` (lines 5-14, 17, 27, 47, 125-127, 147, 150-181, 184-193, 207-210)
- Modify: `app/src/styles/note.css` (lines 3-15, 46-50, 72)
- Modify: `app/src/main.ts:193` (the `masked:` prop)
- Modify: `app/tests/note-view.test.ts`, `app/tests/note-render.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `renderNoteBlocks(blocks: NoteBlock[], title?: string): string` — the `masked` parameter is gone. Consumed by Task 12's block-index scroll targets.

**Do this task AFTER Task 8.** Between deleting masking and having the in-flight filter, reading a note mid-review would spoil the cards still queued in that session.

- [ ] **Step 1: Delete the mask module and its test**

```bash
git rm app/src/ui/note-mask.ts app/tests/note-mask.test.ts
```

- [ ] **Step 2: Strip masking from `note-render.ts`**

- Delete `maskAttr` (lines 13-15) entirely.
- Rename `cardIdAttr` usage: every former `maskAttr(id, ...)` call site now uses `cardIdAttr(id)`. In `renderProse`, line 44 becomes:

```ts
    html += `<span ${cardIdAttr(cloze.cardId)}>${text(inner)}</span>`;
```

- Change `renderProse`'s signature to `function renderProse(block: Extract<NoteBlock, { kind: 'prose' }>): string` and drop the `masked` argument at its call site.
- Change the export to `export function renderNoteBlocks(blocks: NoteBlock[], title?: string): string`.
- Delete `const hidden = masked.has(block.cardId);` at lines 94 and 102.
- Line 118 becomes `const correct = choice.correct ? ' is-correct' : '';` — **the mcq answer key is now always visible in the viewer.** That is the intended behaviour under read-suppression, and it is a visible change.
- Line 122 becomes `` `${head}<ul class="note-choices">${items}</ul></div>` ``.
- Line 134 becomes `` `<p class="note-card-answer">${text(block.answer)}</p>` ``.
- Remove the now-unused `hidden` references in the `qa` branch, so the answer paragraph renders without a conditional class.

- [ ] **Step 3: Strip masking from `note.ts`**

- Delete the exports `maskedSummary` (line 17), `effectiveMasked` (line 27) and `maskedCount` (line 47).
- Delete `masked: Set<string>;` from `NoteProps`.
- Delete the `revealed` set (line 147), the masked-bar markup (lines 125-127), the `.is-masked` click wiring (lines 156-168), `updateBar` (lines 184-193) and the `reveal-all` listener (lines 207-210).
- `renderArticle` becomes:

```ts
  function renderArticle(): void {
    article.innerHTML = renderNoteBlocks(note.blocks, note.title);
    if (props.arrivedFrom) {
      const target = article.querySelector<HTMLElement>(`[data-card="${CSS.escape(props.arrivedFrom)}"]`);
      if (target) {
        target.classList.add('is-arrived');
        if (!arrivedScrolled) {
          target.scrollIntoView({ block: 'center' });
          arrivedScrolled = true;
        }
      }
    }
  }
```

- `rerender` (lines 195-202) loses its `updateBar()` call. If nothing else calls `rerender` after the deletions, delete it too and call `renderArticle()` directly.
- **Keep `data-card` attributes.** `arrivedFrom` scrolling queries `[data-card="..."]`; removing them breaks it.

- [ ] **Step 4: Strip the CSS**

In `app/src/styles/note.css`, delete the `.is-masked` rule (lines 3-11, including its leading comment), the `prefers-reduced-motion` block that only contains `.is-masked` (lines 13-15), `.note-masked-bar` (lines 46-50) and its themed override (line 72). Leave `.note-choice.is-correct` (line 75) and `.is-arrived` (line 77) alone — neither is masking.

- [ ] **Step 5: Drop the prop in `main.ts`**

Delete the `masked:` line from the `renderNote` call (line 193) and remove the `maskedCardIds` import. `reviews` may become unused in that branch — if so, drop it from the `Promise.all` too, and verify with typecheck.

- [ ] **Step 6: Delete the obsolete tests**

From `app/tests/note-view.test.ts`, delete the `describe('maskedSummary')`, `describe('effectiveMasked')` and `describe('maskedCount')` blocks in full. Keep `describe('noteHeadHtml')`.

From `app/tests/note-render.test.ts`, delete these tests (they assert masking):
`'renders an unmasked cloze visibly, without the masked class'`, `'marks a masked cloze and keeps its text in the document'`, `'hides the correct-choice marking on a masked mcq'`, `'blurs only the choice list on a masked mcq, never the question'`, `'masks a qa answer but never its prompt'`, `'masks a recall model answer but never its prompt'`.

**Rewrite, do not delete,** these two — they test offset arithmetic, which still matters and is the highest-risk code in the file:
`'renders multiple clozes in one block without corrupting offsets'` and `'keeps cloze offsets correct when preceding text needs escaping'`. Drop the masked-set argument and assert the rendered text and `data-card` attributes instead of `is-masked`.

Update every remaining `renderNoteBlocks(blocks, someSet, title)` call in both test files to the two-argument form.

- [ ] **Step 7: Add a test pinning the new mcq behaviour**

Append to `app/tests/note-render.test.ts`:

```ts
  it('always marks the correct mcq choice now that masking is gone', () => {
    const html = renderNoteBlocks([{
      kind: 'card', cardId: 'card-aaaa', format: 'mcq', prompt: 'Which?',
      choices: [{ text: 'right', correct: true }, { text: 'wrong', correct: false }]
    }]);
    expect(html).toContain('is-correct');
    expect(html).not.toContain('is-masked');
  });
```

- [ ] **Step 8: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: PASS, with no reference to `note-mask.js` anywhere.

Run: `grep -rn "is-masked\|maskedCardIds\|effectiveMasked\|maskedSummary\|maskedCount" app/src app/tests`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add -A app/src app/tests
git commit -m "refactor: delete answer masking, replaced by read-suppression

Masking hid the material to protect a pending test. Suppression defers
the test instead, which is what makes reference reading work at all --
you look something up exactly when its card is due, which is exactly
when masking hid it.

The mcq answer key is now always visible in the viewer. That is the
intended consequence, not an oversight."
```

---

### Task 10: The search module

**Files:**
- Create: `app/src/search.ts`
- Test: `app/tests/search.test.ts`

**Interfaces:**
- Consumes: `NoteBlock`, `NoteDoc`, `Notes` from `pipeline/src/types.js`, including Task 1's `tags`.
- Produces: `BlockHit`, `NoteResult`, `parseQuery`, `escapeRegExp`, `blockText`, `snippetAround`, `search`, and the weight constants. Consumed by Tasks 11 and 12.

- [ ] **Step 1: Write the failing tests**

Create `app/tests/search.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { blockText, parseQuery, search, snippetAround } from '../src/search.js';
import type { NoteDoc, Notes } from '../../pipeline/src/types.js';

const note = (over: Partial<NoteDoc> = {}): NoteDoc => ({
  path: 'vault/a.md', title: 'DNS', topic: 'networking', category: 'networking',
  tags: [], citations: [], blocks: [], ...over
});
const corpus = (...notes: NoteDoc[]): Notes => ({ generatedAt: '2026-09-20T00:00:00Z', notes });

describe('parseQuery', () => {
  it('lowercases and splits on whitespace', () => {
    expect(parseQuery('  Consistent   Hashing ')).toEqual(['consistent', 'hashing']);
  });

  it('returns an empty list for a blank query', () => {
    expect(parseQuery('   ')).toEqual([]);
  });
});

describe('blockText', () => {
  it('joins a qa prompt and its answer', () => {
    const out = blockText({ kind: 'qa', cardId: 'card-aaaa', prompt: 'What is X?', answer: 'A thing.' });
    expect(out.text).toContain('What is X?');
    expect(out.text).toContain('A thing.');
  });

  it('includes mcq choice texts', () => {
    const out = blockText({
      kind: 'card', cardId: 'card-aaaa', format: 'mcq', prompt: 'Which layer?',
      choices: [{ text: 'Transport', correct: true }, { text: 'Network', correct: false }]
    });
    expect(out.text).toContain('Transport');
    expect(out.text).toContain('Network');
  });

  it('includes code fences -- syntax lookup is a stated purpose of this app', () => {
    expect(blockText({ kind: 'code', lang: 'sql', text: 'SELECT 1' }).text).toBe('SELECT 1');
  });
});

describe('search', () => {
  it('returns nothing for a query below the minimum length', () => {
    expect(search(corpus(note({ title: 'DNS' })), 'a')).toEqual([]);
  });

  it('matches a note title', () => {
    const results = search(corpus(note({ title: 'DNS' })), 'dns');
    expect(results.map((r) => r.path)).toEqual(['vault/a.md']);
  });

  it('matches a tag the prose never spells', () => {
    const results = search(corpus(note({ title: 'Transport', tags: ['tcp'] })), 'tcp');
    expect(results).toHaveLength(1);
  });

  it('requires EVERY term to match somewhere in the note', () => {
    const n = note({ blocks: [{ kind: 'prose', text: 'consistent hashing is useful', clozes: [] }] });
    expect(search(corpus(n), 'consistent hashing')).toHaveLength(1);
    expect(search(corpus(n), 'consistent zebra')).toHaveLength(0);
  });

  it('matches a word prefix, so hash finds hashing', () => {
    const n = note({ blocks: [{ kind: 'prose', text: 'consistent hashing', clozes: [] }] });
    expect(search(corpus(n), 'hash')).toHaveLength(1);
  });

  it('does not match mid-word, so ip does not find multiple', () => {
    const n = note({ title: 'x', blocks: [{ kind: 'prose', text: 'multiple things', clozes: [] }] });
    expect(search(corpus(n), 'ip')).toHaveLength(0);
  });

  it('does not throw on regex metacharacters in the query', () => {
    const n = note({ blocks: [{ kind: 'code', lang: 'cpp', text: 'c++ vector' }] });
    expect(() => search(corpus(n), 'c++')).not.toThrow();
    expect(search(corpus(n), 'c++')).toHaveLength(1);
  });

  it('ranks a title match above a body-only match', () => {
    const titled = note({ path: 'vault/t.md', title: 'Consistent hashing' });
    const bodied = note({
      path: 'vault/b.md', title: 'Other',
      blocks: [{ kind: 'prose', text: 'consistent hashing appears here', clozes: [] }]
    });
    const results = search(corpus(bodied, titled), 'consistent hashing');
    expect(results[0]?.path).toBe('vault/t.md');
  });

  it('ranks all-terms-in-one-block above terms scattered across blocks', () => {
    const together = note({
      path: 'vault/1.md', title: 'x',
      blocks: [{ kind: 'prose', text: 'alpha and beta together', clozes: [] }]
    });
    const apart = note({
      path: 'vault/2.md', title: 'x',
      blocks: [
        { kind: 'prose', text: 'alpha alone', clozes: [] },
        { kind: 'prose', text: 'beta alone', clozes: [] }
      ]
    });
    const results = search(corpus(apart, together), 'alpha beta');
    expect(results[0]?.path).toBe('vault/1.md');
  });

  it('carries hits with the block index they came from', () => {
    const n = note({
      blocks: [
        { kind: 'heading', level: 1, text: 'DNS' },
        { kind: 'prose', text: 'records carry a ttl', clozes: [] }
      ]
    });
    expect(search(corpus(n), 'ttl')[0]?.hits[0]?.blockIndex).toBe(1);
  });

  it('finds a cloze answer, which lives inside the prose text', () => {
    const n = note({
      title: 'x',
      blocks: [{
        kind: 'prose', text: 'Default MTU is 1500 bytes.',
        clozes: [{ start: 18, end: 28, cardId: 'card-aaaa', answer: '1500 bytes' }]
      }]
    });
    expect(search(corpus(n), '1500')).toHaveLength(1);
  });

  it('caps the number of notes returned', () => {
    const many = Array.from({ length: 50 }, (_, i) => note({ path: `vault/${i}.md`, title: 'DNS' }));
    expect(search(corpus(...many), 'dns').length).toBeLessThanOrEqual(30);
  });
});

describe('snippetAround', () => {
  it('returns the whole text when it is shorter than the window', () => {
    const out = snippetAround('short text', [{ start: 0, end: 5 }], 80);
    expect(out.snippet).toBe('short text');
    expect(out.matches).toEqual([{ start: 0, end: 5 }]);
  });

  it('ellipsises and re-bases offsets when it trims the front', () => {
    const text = 'x'.repeat(200) + ' needle tail';
    const start = text.indexOf('needle');
    const out = snippetAround(text, [{ start, end: start + 6 }], 20);
    expect(out.snippet.startsWith('…')).toBe(true);
    expect(out.snippet.slice(out.matches[0]!.start, out.matches[0]!.end)).toBe('needle');
  });

  it('keeps offsets pointing at the matched text when nothing is trimmed', () => {
    const text = 'the needle here';
    const out = snippetAround(text, [{ start: 4, end: 10 }], 80);
    expect(out.snippet.slice(out.matches[0]!.start, out.matches[0]!.end)).toBe('needle');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/tests/search.test.ts`
Expected: FAIL — cannot resolve `../src/search.js`

- [ ] **Step 3: Write the implementation**

Create `app/src/search.ts`:

```ts
import type { NoteBlock, Notes } from '../../pipeline/src/types.js';

export interface Match { start: number; end: number }

export interface BlockHit {
  blockIndex: number;
  snippet: string;
  /** Offsets into `snippet`, ascending. */
  matches: Match[];
  score: number;
}

export interface NoteResult {
  path: string;
  title: string;
  topic: string;
  category: string;
  score: number;
  hits: BlockHit[];
}

/**
 * Guesses, deliberately gathered in one table rather than scattered as
 * magic numbers, because tuning them against real queries is inevitable.
 */
export const FIELD_WEIGHTS = {
  title: 10, tags: 7, heading: 5, prompt: 4, prose: 3, list: 3, citations: 2, code: 2
} as const;

/** The raw query appearing contiguously is a much stronger signal than its terms appearing apart. */
export const PHRASE_BONUS = 12;

/** Every term inside ONE block beats the same terms scattered over four paragraphs. */
export const ALL_TERMS_IN_BLOCK_BONUS = 8;

export const MAX_NOTE_RESULTS = 30;
export const MAX_HITS_PER_NOTE = 5;
export const MIN_QUERY_LENGTH = 2;
export const SNIPPET_RADIUS = 80;

export function parseQuery(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter((t) => t !== '');
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A term matches at a word boundary with an OPEN right edge, so `hash`
 * finds `hashing` while `ip` does not find `multiple`. The term is escaped
 * because it comes straight from the user: `c++` must neither throw nor
 * match everything.
 */
function termPattern(term: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(term)}`, 'g');
}

export function blockText(block: NoteBlock): { text: string; weight: number } {
  switch (block.kind) {
    case 'heading': return { text: block.text, weight: FIELD_WEIGHTS.heading };
    case 'code': return { text: block.text, weight: FIELD_WEIGHTS.code };
    case 'list': return { text: block.items.join('\n'), weight: FIELD_WEIGHTS.list };
    case 'prose': return { text: block.text, weight: FIELD_WEIGHTS.prose };
    case 'qa': return { text: `${block.prompt}\n${block.answer}`, weight: FIELD_WEIGHTS.prompt };
    case 'card': {
      const choices = (block.choices ?? []).map((c) => c.text).join('\n');
      const answer = block.answer ?? '';
      return { text: [block.prompt, choices, answer].filter((s) => s !== '').join('\n'), weight: FIELD_WEIGHTS.prompt };
    }
  }
}

function findMatches(text: string, terms: string[]): { matches: Match[]; found: Set<string> } {
  const lower = text.toLowerCase();
  const matches: Match[] = [];
  const found = new Set<string>();
  for (const term of terms) {
    const pattern = termPattern(term);
    let hit = pattern.exec(lower);
    while (hit) {
      matches.push({ start: hit.index, end: hit.index + term.length });
      found.add(term);
      hit = pattern.exec(lower);
    }
  }
  matches.sort((a, b) => a.start - b.start);
  return { matches, found };
}

/**
 * A window around the first match. Offsets are re-based into the snippet's
 * own coordinate space, and matches falling outside the window are dropped
 * -- a caller highlighting by offset must never be handed one that points
 * past the end of the string it is highlighting.
 */
export function snippetAround(text: string, matches: Match[], radius: number): { snippet: string; matches: Match[] } {
  const first = matches[0];
  if (!first) return { snippet: text.slice(0, radius * 2), matches: [] };

  const from = Math.max(0, first.start - radius);
  const to = Math.min(text.length, first.end + radius);
  const head = from > 0 ? '…' : '';
  const tail = to < text.length ? '…' : '';
  const body = text.slice(from, to);
  const shift = head.length - from;

  const rebased = matches
    .filter((m) => m.start >= from && m.end <= to)
    .map((m) => ({ start: m.start + shift, end: m.end + shift }));

  return { snippet: `${head}${body}${tail}`, matches: rebased };
}

export function search(notes: Notes, query: string): NoteResult[] {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];
  const terms = parseQuery(trimmed);
  if (terms.length === 0) return [];
  const phrase = trimmed.toLowerCase();

  const results: NoteResult[] = [];

  for (const note of notes.notes) {
    const found = new Set<string>();
    let score = 0;
    const hits: BlockHit[] = [];

    // Note-level fields. These never become hits -- there is no block to
    // scroll to -- but they rank and they make a note findable by a tag
    // its prose never spells.
    const fields: { text: string; weight: number }[] = [
      { text: note.title, weight: FIELD_WEIGHTS.title },
      { text: note.tags.join('\n'), weight: FIELD_WEIGHTS.tags },
      { text: `${note.topic}\n${note.category}`, weight: FIELD_WEIGHTS.tags },
      { text: note.citations.join('\n'), weight: FIELD_WEIGHTS.citations }
    ];
    for (const field of fields) {
      if (field.text === '') continue;
      const { found: f } = findMatches(field.text, terms);
      for (const term of f) found.add(term);
      score += f.size * field.weight;
      if (f.size > 0 && field.text.toLowerCase().includes(phrase)) score += PHRASE_BONUS;
    }

    note.blocks.forEach((block, blockIndex) => {
      const { text, weight } = blockText(block);
      if (text === '') return;
      const { matches, found: f } = findMatches(text, terms);
      if (f.size === 0) return;
      for (const term of f) found.add(term);

      // Presence, not occurrence count: otherwise a long note wins by
      // repeating one word, which is the opposite of relevance.
      let blockScore = f.size * weight;
      if (text.toLowerCase().includes(phrase)) blockScore += PHRASE_BONUS;
      if (f.size === terms.length) blockScore += ALL_TERMS_IN_BLOCK_BONUS;

      score += blockScore;
      const windowed = snippetAround(text, matches, SNIPPET_RADIUS);
      hits.push({ blockIndex, snippet: windowed.snippet, matches: windowed.matches, score: blockScore });
    });

    // AND: every term must appear somewhere in the note.
    if (found.size !== terms.length) continue;

    hits.sort((a, b) => b.score - a.score || a.blockIndex - b.blockIndex);
    results.push({
      path: note.path, title: note.title, topic: note.topic, category: note.category,
      score, hits: hits.slice(0, MAX_HITS_PER_NOTE)
    });
  }

  results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return results.slice(0, MAX_NOTE_RESULTS);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/tests/search.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Add a corpus test against the real notes.json**

`app/tests/note-render.test.ts` already loads the real `deck/notes.json` (see its `renderNoteBlocks over the real notes corpus` describe block) — copy that loading idiom. Append to `app/tests/search.test.ts`:

```ts
import { beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The real, built notes.json -- not a fixture. Same idiom as
// note-render.test.ts's corpus block.
const NOTES_PATH = resolve(__dirname, '../../deck/notes.json');

describe('search over the real notes corpus', () => {
  let real: Notes;

  beforeAll(() => {
    real = JSON.parse(readFileSync(NOTES_PATH, 'utf8')) as Notes;
  });

  it('loaded a real, substantial notes.json (sanity guard against a broken path)', () => {
    expect(real.notes.length).toBeGreaterThan(100);
  });

  it('finds a term that certainly exists in the vault', () => {
    const results = search(real, 'tcp');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.hits.length).toBeGreaterThan(0);
  });

  it('returns nothing for a term that certainly does not', () => {
    expect(search(real, 'zzzzqqqx')).toEqual([]);
  });

  it('every hit offset lands inside its own snippet', () => {
    // The offset bug this guards is silent: a match pointing past the end
    // of its snippet renders as a highlight of nothing.
    for (const result of search(real, 'consistent hashing')) {
      for (const hit of result.hits) {
        for (const match of hit.matches) {
          expect(match.start).toBeGreaterThanOrEqual(0);
          expect(match.end).toBeLessThanOrEqual(hit.snippet.length);
        }
      }
    }
  });
});
```

- [ ] **Step 6: Measure the scan on the real corpus**

Add a temporary timing assertion (delete before committing) or run in the browser console on the phone. The spec commits to single-digit milliseconds; **record the real number** and, if it is materially worse, stop and raise it rather than shipping the claim unverified.

- [ ] **Step 7: Commit**

```bash
git add app/src/search.ts app/tests/search.test.ts
git commit -m "feat: scanning search over the notes corpus

No index and no dependency: ~197k words already sit in memory, and an
index would cost more to maintain than the scan costs to run. Terms AND
together and match at a word boundary with an open right edge, so hash
finds hashing but ip does not find multiple."
```

---

### Task 11: The `#search` route

**Files:**
- Modify: `app/src/route.ts` (the `RouteDecision` union at lines 28-42; `decideRoute` at lines 169-225)
- Test: `app/tests/route.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `{ kind: 'search'; query: string }` on `RouteDecision`; `export const SEARCH_PREFIX = '#search'`; `export function searchHash(query: string): string`. Consumed by Task 13.

**Note:** no existing route parses a query string, and `#topics` / `#settings` / `#review` are matched by **strict equality**. `#search` must be prefix-matched so `#search?q=...` resolves.

- [ ] **Step 1: Write the failing tests**

Append to `app/tests/route.test.ts`:

```ts
describe('#search routing', () => {
  it('routes a bare #search with an empty query', () => {
    expect(decideRoute('#search', state())).toEqual({ kind: 'search', query: '' });
  });

  it('carries a query from the q parameter', () => {
    expect(decideRoute('#search?q=dns', state())).toEqual({ kind: 'search', query: 'dns' });
  });

  it('decodes a multi-word query', () => {
    expect(decideRoute('#search?q=consistent%20hashing', state())).toEqual({ kind: 'search', query: 'consistent hashing' });
  });

  it('decodes + as a space', () => {
    expect(decideRoute('#search?q=consistent+hashing', state())).toEqual({ kind: 'search', query: 'consistent hashing' });
  });

  it('falls back to an empty query on a malformed percent-escape instead of throwing', () => {
    expect(decideRoute('#search?q=%E0%A4%A', state())).toEqual({ kind: 'search', query: '' });
  });

  it('ends a suspended session, like every other non-session route', () => {
    expect(retainsSuspendedSession('search')).toBe(false);
  });
});

describe('searchHash', () => {
  it('round-trips a query needing encoding', () => {
    const hash = searchHash('a & b');
    expect(decideRoute(hash, state())).toEqual({ kind: 'search', query: 'a & b' });
  });

  it('is bare for an empty query', () => {
    expect(searchHash('')).toBe('#search');
  });
});
```

Use whatever the file's existing `DashboardState` fixture helper is named in place of `state()`; add `searchHash` and `SEARCH_PREFIX` to the imports.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/tests/route.test.ts -t 'search'`
Expected: FAIL — `searchHash is not a function`, and `decideRoute` returns `{ kind: 'dashboard' }`.

- [ ] **Step 3: Implement**

In `app/src/route.ts`, add to the `RouteDecision` union:

```ts
  | { kind: 'search'; query: string }
```

Add near the other prefixes:

```ts
export const SEARCH_PREFIX = '#search';

export function searchHash(query: string): string {
  const trimmed = query.trim();
  return trimmed === '' ? SEARCH_PREFIX : `${SEARCH_PREFIX}?q=${encodeURIComponent(trimmed)}`;
}

/**
 * The only route carrying a query string. Parsed rather than strict-matched
 * so the live query can live in the hash -- which is what makes Back from a
 * note return to populated results instead of an empty box.
 */
function searchQuery(hash: string): string {
  const rest = hash.slice(SEARCH_PREFIX.length);
  if (rest === '') return '';
  if (!rest.startsWith('?')) return '';
  const raw = new URLSearchParams(rest.slice(1)).get('q');
  if (raw === null) return '';
  try {
    // URLSearchParams already decodes; this guards a value it could not.
    return raw;
  } catch {
    return '';
  }
}
```

**Note:** `URLSearchParams` decodes `+` as a space and does not throw on a malformed escape — it substitutes U+FFFD. If the malformed-escape test fails because a replacement character comes back rather than `''`, add an explicit guard rejecting a value containing `�`.

In `decideRoute`, before the final dashboard fallback, add:

```ts
  if (hash === SEARCH_PREFIX || hash.startsWith(`${SEARCH_PREFIX}?`)) {
    return { kind: 'search', query: searchQuery(hash) };
  }
```

`retainsSuspendedSession` currently enumerates kinds; ensure `'search'` returns `false` there (same as `topics`/`settings`). The existing test `'agrees with decideRoute about every kind it can return'` will fail until this is handled.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test && npm run typecheck`
Expected: PASS, including the pre-existing exhaustiveness test over `RouteDecision['kind']`.

- [ ] **Step 5: Commit**

```bash
git add app/src/route.ts app/tests/route.test.ts
git commit -m "feat: add the #search route

The first route carrying a query string. The query lives in the hash so
that Back from a note returns to populated results rather than an empty
search box, and so a reload does not lose it."
```

---

### Task 12: Render search results as a string

**Files:**
- Create: `app/src/ui/search.ts`
- Create: `app/src/styles/search.css`
- Test: `app/tests/search-render.test.ts`

**Interfaces:**
- Consumes: Task 10's `NoteResult`, `BlockHit`, `Match`; `escapeHtml` from `./renderers.js`.
- Produces:
  - `export function highlight(text: string, matches: Match[]): string`
  - `export function renderResults(results: NoteResult[], expanded: ReadonlySet<string>): string`
  - `export function renderSearchState(kind: 'empty' | 'no-matches' | 'unavailable', query: string): string`

  Consumed by Task 13.

**Critical:** highlighting has the same offset hazard as clozes. Match offsets index the **raw** string, so slice raw and escape each piece. Escaping first shifts every offset past the first `<` or `&`. See `note-render.ts`'s `renderProse` for the precedent.

- [ ] **Step 1: Write the failing tests**

Create `app/tests/search-render.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { highlight, renderRecent, renderResults, renderSearchState } from '../src/ui/search.js';
import type { NoteResult } from '../src/search.js';
import type { NoteDoc } from '../../pipeline/src/types.js';

const result = (over: Partial<NoteResult> = {}): NoteResult => ({
  path: 'vault/a.md', title: 'DNS', topic: 'networking', category: 'networking',
  score: 10, hits: [], ...over
});

describe('highlight', () => {
  it('wraps the matched span', () => {
    expect(highlight('the needle here', [{ start: 4, end: 10 }]))
      .toBe('the <mark>needle</mark> here');
  });

  it('escapes html OUTSIDE the match', () => {
    expect(highlight('<b> needle', [{ start: 4, end: 10 }]))
      .toBe('&lt;b&gt; <mark>needle</mark>');
  });

  it('escapes html INSIDE the match', () => {
    expect(highlight('x <b>', [{ start: 2, end: 5 }]))
      .toBe('x <mark>&lt;b&gt;</mark>');
  });

  it('does not shift offsets when earlier text needs escaping -- the cloze bug', () => {
    // Escaping first would turn '&' into '&amp;', pushing every later
    // offset 4 characters right and highlighting the wrong span.
    expect(highlight('a & needle', [{ start: 4, end: 10 }]))
      .toBe('a &amp; <mark>needle</mark>');
  });

  it('handles multiple matches in order', () => {
    expect(highlight('ab cd', [{ start: 0, end: 2 }, { start: 3, end: 5 }]))
      .toBe('<mark>ab</mark> <mark>cd</mark>');
  });

  it('returns escaped text when there are no matches', () => {
    expect(highlight('a & b', [])).toBe('a &amp; b');
  });
});

describe('renderResults', () => {
  it('renders one row per note, carrying the path', () => {
    const html = renderResults([result({ path: 'vault/a.md' })], new Set());
    expect(html).toContain('data-path="vault/a.md"');
    expect(html).toContain('DNS');
  });

  it('does NOT render snippets for a collapsed row', () => {
    const html = renderResults([result({
      hits: [{ blockIndex: 2, snippet: 'secret answer', matches: [], score: 1 }]
    })], new Set());
    expect(html).not.toContain('secret answer');
  });

  it('renders snippets once the row is expanded', () => {
    const html = renderResults([result({
      hits: [{ blockIndex: 2, snippet: 'secret answer', matches: [], score: 1 }]
    })], new Set(['vault/a.md']));
    expect(html).toContain('secret answer');
    expect(html).toContain('data-block="2"');
  });

  it('escapes a title containing html', () => {
    expect(renderResults([result({ title: '<script>' })], new Set())).not.toContain('<script>');
  });

  it('shows the hit count', () => {
    const html = renderResults([result({
      hits: [
        { blockIndex: 0, snippet: 'a', matches: [], score: 1 },
        { blockIndex: 1, snippet: 'b', matches: [], score: 1 }
      ]
    })], new Set());
    expect(html).toContain('2');
  });
});

describe('renderRecent', () => {
  it('is empty when nothing has been read', () => {
    expect(renderRecent([], [])).toBe('');
  });

  it('lists a read note by title, newest first', () => {
    const notes = [
      { path: 'vault/a.md', title: 'DNS' },
      { path: 'vault/b.md', title: 'TCP' }
    ] as NoteDoc[];
    const html = renderRecent(notes, ['vault/b.md', 'vault/a.md']);
    expect(html.indexOf('TCP')).toBeLessThan(html.indexOf('DNS'));
  });

  it('skips a path no longer in the corpus rather than rendering a dead row', () => {
    const notes = [{ path: 'vault/a.md', title: 'DNS' }] as NoteDoc[];
    expect(renderRecent(notes, ['vault/gone.md'])).toBe('');
  });

  it('escapes a title containing html', () => {
    const notes = [{ path: 'vault/a.md', title: '<script>' }] as NoteDoc[];
    expect(renderRecent(notes, ['vault/a.md'])).not.toContain('<script>');
  });
});

describe('renderSearchState', () => {
  it('says notes are unavailable rather than claiming no matches', () => {
    const html = renderSearchState('unavailable', 'dns');
    expect(html).toMatch(/download|offline|unavailable/i);
    expect(html).not.toMatch(/no matches/i);
  });

  it('says no matches, naming the query', () => {
    expect(renderSearchState('no-matches', 'zebra')).toContain('zebra');
  });

  it('escapes the query in the no-matches message', () => {
    expect(renderSearchState('no-matches', '<script>')).not.toContain('<script>');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/tests/search-render.test.ts`
Expected: FAIL — cannot resolve `../src/ui/search.js`

- [ ] **Step 3: Write the renderers**

Create `app/src/ui/search.ts`:

```ts
import type { Match, NoteResult } from '../search.js';
import type { NoteDoc } from '../../../pipeline/src/types.js';
import { escapeHtml } from './renderers.js';

/**
 * Wraps matched spans in <mark>, escaping as it goes.
 *
 * Offsets index the RAW string, so the string is SLICED first and each
 * piece escaped afterwards. Escaping first would rewrite `&` as `&amp;`
 * and push every later offset four characters right -- the exact bug
 * note-render.ts's renderProse documents for cloze spans.
 */
export function highlight(text: string, matches: Match[]): string {
  if (matches.length === 0) return escapeHtml(text);
  let html = '';
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue; // overlapping; already covered
    html += escapeHtml(text.slice(cursor, match.start));
    html += `<mark>${escapeHtml(text.slice(match.start, match.end))}</mark>`;
    cursor = match.end;
  }
  html += escapeHtml(text.slice(cursor));
  return html;
}

/**
 * Note rows, each with two separate targets: the row body opens the note,
 * the chevron expands it. A row that did both would leave one gesture with
 * nowhere to live -- and the split is also what keeps snippets (the only
 * unmasked prose a result list shows) behind a deliberate second tap
 * rather than on the way past.
 */
export function renderResults(results: NoteResult[], expanded: ReadonlySet<string>): string {
  return results.map((result) => {
    const open = expanded.has(result.path);
    const snippets = open
      ? `<ul class="search-hits">${result.hits.map((hit) =>
          `<li class="search-hit" data-block="${hit.blockIndex}" data-path="${escapeHtml(result.path)}">`
          + `${highlight(hit.snippet, hit.matches)}</li>`
        ).join('')}</ul>`
      : '';

    return `<li class="search-result">`
      + `<div class="search-row">`
      + `<button class="search-open" data-role="open" data-path="${escapeHtml(result.path)}">`
      + `<span class="search-title">${escapeHtml(result.title)}</span>`
      + `<span class="search-meta">${escapeHtml(result.category)} &middot; ${result.hits.length}</span>`
      + `</button>`
      + `<button class="search-expand" data-role="expand" data-path="${escapeHtml(result.path)}"`
      + ` aria-expanded="${open}" aria-label="Show matches">${open ? '∨' : '›'}</button>`
      + `</div>${snippets}</li>`;
  }).join('');
}

/**
 * The landing screen: what you read most recently, newest first.
 *
 * Free from `noteReads`, which the suppression mechanic already
 * maintains -- no extra state, and it happens to be the most likely
 * thing you want when you open search without a query in mind.
 */
export const MAX_RECENT = 10;

export function renderRecent(notes: NoteDoc[], paths: string[]): string {
  const byPath = new Map(notes.map((note) => [note.path, note]));
  const rows = paths
    .map((path) => byPath.get(path))
    // A path can outlive its note across a deck rebuild. Skip it rather
    // than render a row that opens nothing.
    .filter((note): note is NoteDoc => note !== undefined)
    .slice(0, MAX_RECENT)
    .map((note) =>
      `<li class="search-result"><div class="search-row">`
      + `<button class="search-open" data-role="open" data-path="${escapeHtml(note.path)}">`
      + `<span class="search-title">${escapeHtml(note.title)}</span>`
      + `<span class="search-meta">${escapeHtml(note.category)}</span>`
      + `</button></div></li>`
    );
  if (rows.length === 0) return '';
  return `<p class="search-state">Recently read</p><ul class="search-results">${rows.join('')}</ul>`;
}

export function renderSearchState(kind: 'empty' | 'no-matches' | 'unavailable', query: string): string {
  if (kind === 'unavailable') {
    // NEVER an empty result list: that asserts "no matches", which is a
    // different and false statement when the corpus was never downloaded.
    return `<p class="search-state">Notes haven’t been downloaded yet &mdash; search needs a connection the first time.</p>`;
  }
  if (kind === 'no-matches') {
    return `<p class="search-state">No notes match &ldquo;${escapeHtml(query)}&rdquo;.</p>`;
  }
  return `<p class="search-state">Search your notes.</p>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/tests/search-render.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Add the stylesheet**

Create `app/src/styles/search.css` following the conventions in `app/src/styles/topics.css` (same CSS custom properties, same spacing scale). Minimum: `.search-result`, `.search-row` (flex, space-between), `.search-open` (grows, left-aligned, quiet button), `.search-expand` (fixed width, ≥44px tap target), `.search-hits`, `.search-hit` (tappable, dimmed text), `mark` (uses `--accent-soft` / `--accent-text`), `.search-state` (dimmed, centred). Import it wherever the other screen stylesheets are imported.

- [ ] **Step 6: Commit**

```bash
git add app/src/ui/search.ts app/src/styles/search.css app/tests/search-render.test.ts
git commit -m "feat: render search results

Row body opens the note, chevron expands it — snippets stay behind a
deliberate second tap. Highlighting slices raw and escapes afterwards,
the same offset rule cloze rendering already follows."
```

---

### Task 13: Wire the search screen up

**Files:**
- Modify: `app/src/ui/search.ts` (add the DOM-wiring entry point)
- Modify: `app/src/main.ts` (dispatch `decision.kind === 'search'`)
- Modify: `app/src/ui/dashboard.ts` (Search button + `onSearch` prop)
- Modify: `app/src/ui/note-render.ts` (emit `data-block`)
- Modify: `app/src/ui/note.ts` (scroll to a block index)
- Modify: `app/src/route.ts` (`#note` carries an optional block index)

**Interfaces:**
- Consumes: Tasks 10-12.
- Produces: `export function renderSearch(root: HTMLElement, props: SearchProps): void`.

**No DOM in tests.** Everything in this task is hand-verified (Step 7).

- [ ] **Step 1: Emit a block index in rendered notes**

In `app/src/ui/note-render.ts`, give every rendered block a `data-block` attribute carrying its index in `blocks`. In `renderNoteBlocks`, the `map` callback already has the index; add `data-block="${i}"` to each block's outermost element (heading, `<pre>`, `<ul>`, `<p>`, and the `.note-card` divs).

Add a test to `app/tests/note-render.test.ts`:

```ts
  it('tags every block with its index so search can scroll to one', () => {
    const html = renderNoteBlocks([
      { kind: 'heading', level: 2, text: 'A' },
      { kind: 'prose', text: 'B', clozes: [] }
    ]);
    expect(html).toContain('data-block="0"');
    expect(html).toContain('data-block="1"');
  });
```

- [ ] **Step 2: Carry a block index on the note route**

In `app/src/route.ts`, extend the note decision to `{ kind: 'note'; path: string; cardId: string | null; block: number | null }`, parsed from a `#note/<path>/b<N>` trailing segment alongside the existing `card-xxxx` form. Extend `noteHash(path, cardId?)` with a sibling `noteBlockHash(path: string, block: number): string`.

Add tests mirroring the existing `#note routing` block:

```ts
  it('carries a block index', () => {
    expect(decideRoute('#note/vault%2Fa.md/b3', state()))
      .toEqual({ kind: 'note', path: 'vault/a.md', cardId: null, block: 3 });
  });

  it('treats a non-numeric b-segment as part of the path', () => {
    expect(decideRoute('#note/vault%2Fbx.md', state()))
      .toEqual({ kind: 'note', path: 'vault/bx.md', cardId: null, block: null });
  });
```

Add `block: null` to every existing `{ kind: 'note', ... }` expectation in `route.test.ts`.

- [ ] **Step 3: Scroll to the block**

In `app/src/ui/note.ts`, add `arrivedAtBlock: number | null` to `NoteProps`, and in `renderArticle` — after the existing `arrivedFrom` handling — add:

```ts
    if (props.arrivedFrom === null && props.arrivedAtBlock !== null && !arrivedScrolled) {
      // Block indices are EPHEMERAL. They are generated from the
      // notes.json currently in memory and followed within seconds, so a
      // deck rebuild shifting them is harmless here. Never persist one,
      // and never treat it as a durable anchor -- ^card-xxxx is that.
      const target = article.querySelector<HTMLElement>(`[data-block="${props.arrivedAtBlock}"]`);
      if (target) {
        target.scrollIntoView({ block: 'center' });
        arrivedScrolled = true;
      }
    }
```

Pass `arrivedAtBlock: decision.block` from `main.ts`'s `renderNote` call.

- [ ] **Step 4: Add the search screen renderer**

Append to `app/src/ui/search.ts`:

```ts
export interface SearchProps {
  query: string;
  notes: Notes | null;
  /** Note paths, most recently read first. Drives the empty-query screen. */
  recentPaths: string[];
  onQueryChange: (query: string) => void;
  onOpen: (path: string, block: number | null) => void;
  onBack: () => void;
}

const DEBOUNCE_MS = 150;

export function renderSearch(root: HTMLElement, props: SearchProps): void {
  const expanded = new Set<string>();
  let query = props.query;

  root.innerHTML = `
    <section class="screen">
      <div class="top">
        <button class="btn-quiet" data-role="back">back</button>
        <span>search</span>
      </div>
      <input class="search-input" type="search" autocomplete="off"
        placeholder="search notes" value="${escapeHtml(query)}" />
      <div class="search-out"></div>
    </section>`;

  const out = root.querySelector<HTMLElement>('.search-out');
  const input = root.querySelector<HTMLInputElement>('.search-input');

  const paint = (): void => {
    if (!out) return;
    if (query.trim().length < MIN_QUERY_LENGTH) {
      const recent = props.notes ? renderRecent(props.notes.notes, props.recentPaths) : '';
      out.innerHTML = recent === '' ? renderSearchState('empty', query) : recent;
      return;
    }
    if (props.notes === null) { out.innerHTML = renderSearchState('unavailable', query); return; }
    const results = search(props.notes, query);
    out.innerHTML = results.length === 0
      ? renderSearchState('no-matches', query)
      : `<ul class="search-results">${renderResults(results, expanded)}</ul>`;
  };

  let timer: ReturnType<typeof setTimeout> | null = null;
  input?.addEventListener('input', () => {
    query = input.value;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { expanded.clear(); paint(); props.onQueryChange(query); }, DEBOUNCE_MS);
  });

  out?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const hit = target.closest<HTMLElement>('.search-hit');
    if (hit) {
      const path = hit.dataset['path'];
      const block = Number(hit.dataset['block']);
      if (path) props.onOpen(path, Number.isFinite(block) ? block : null);
      return;
    }
    const button = target.closest<HTMLElement>('[data-role]');
    if (!button) return;
    const path = button.dataset['path'];
    if (!path) return;
    if (button.dataset['role'] === 'open') { props.onOpen(path, null); return; }
    if (expanded.has(path)) expanded.delete(path); else expanded.add(path);
    paint();
  });

  root.querySelector('[data-role="back"]')?.addEventListener('click', props.onBack);
  paint();
  input?.focus();
}
```

Add the needed imports at the top of the file: `import { MIN_QUERY_LENGTH, search } from '../search.js';` and `import type { Notes } from '../../../pipeline/src/types.js';`

- [ ] **Step 5: Dispatch the route in `main.ts`**

Add, before the dashboard fallback:

```ts
  if (decision.kind === 'search') {
    const [notes, reads] = await Promise.all([loadNotes(), loadNoteReads(db)]);
    // Newest first. `noteReads` is already maintained by suppression, so
    // the landing screen costs no extra state.
    const recentPaths = Object.entries(reads)
      .sort(([, a], [, b]) => b - a)
      .map(([path]) => path);
    renderSearch(appRoot, {
      query: decision.query,
      notes,
      recentPaths,
      // replaceState, not assignment: typing must not stack a history
      // entry per keystroke, but the hash still has to carry the query so
      // Back from a note returns to populated results.
      onQueryChange: (q) => { window.history.replaceState(null, '', searchHash(q)); },
      onOpen: (path, block) => {
        window.location.hash = block === null ? noteHash(path) : noteBlockHash(path, block);
      },
      onBack: () => { window.location.hash = ''; }
    });
    return;
  }
```

- [ ] **Step 6: Add the dashboard button**

In `app/src/ui/dashboard.ts`, add a `search` button beside `topics` (line 135):

```html
          <button class="btn-quiet" id="search">search</button>
          <button class="btn-quiet" id="topics">topics</button>
```

Add `onSearch: () => void;` to `DashboardProps`, wire it beside the topics listener:

```ts
  root.querySelector<HTMLButtonElement>('#search')?.addEventListener('click', props.onSearch);
```

and pass `onSearch: () => { window.location.hash = '#search'; }` from `main.ts`.

- [ ] **Step 7: Run the suite, then hand-verify**

Run: `npm test && npm run typecheck`
Expected: PASS.

Then `npm run dev` and walk both flows:

**Search:** dashboard → search → type `consistent hash` → results appear, ranked, no snippets visible → tap a chevron → snippets appear with matches marked → tap a snippet → the note opens scrolled to that paragraph → Back → **the query is still in the box and the results are still there** → reload the page → the query survives.

**States:** clear the query (the landing screen lists notes you read recently, newest first), type `zzzzqqqx` (no-matches names the query), and — in DevTools, offline with caches cleared — confirm the unavailable message rather than an empty list.

**Escaping:** search for `<` and confirm nothing renders as markup.

- [ ] **Step 8: Commit**

```bash
git add -A app/src app/tests
git commit -m "feat: the search screen

Rows open the note; the chevron expands snippets. The query lives in
the hash via replaceState, so typing does not stack history entries but
Back from a note still lands on populated results.

Block-index scroll targets are ephemeral by construction — generated
from the notes.json in memory and followed within seconds — and are
commented as such so they are never mistaken for durable anchors."
```

---

### Task 14: Documentation and the pre-PR gate

**Files:**
- Modify: `README.md` (the note viewer section, and the Topics/search entry points)
- Modify: `CLAUDE.md` — no change expected; confirm.

- [ ] **Step 1: Correct the note viewer section**

`README.md` currently states that an answer "is masked when its card is currently due, and shown for new cards and for cards still inside their retention window". That is no longer true. Replace that paragraph with a description of read-suppression: the viewer always shows everything, and opening a note defers its due cards for `readSuppressionHours`.

- [ ] **Step 2: Correct the mid-review promise**

`README.md` promises the progress counter survives a note detour intact. It no longer does — reading a note mid-session can shorten the session. Say so explicitly, and say that the deferred cards are counted on the dashboard.

- [ ] **Step 3: Document search**

Add a short section covering: the Search button, that the query lives in the hash, what is searched (titles, tags, headings, prose including cloze answers, qa/mcq/recall text, code fences, citations), that terms AND together and match at word boundaries with an open right edge, and that search needs `notes.json` so it is unavailable on a cold offline start.

- [ ] **Step 4: Document the setting**

Add `readSuppressionHours` to whatever list of settings the README carries, including that `0` disables suppression.

- [ ] **Step 5: Run the full pre-PR gate**

```bash
git status --porcelain | grep '^?? vault/'
```
Expected: no output.

```bash
npm test && npm run typecheck && npm run build:deck && git status --porcelain
```
Expected: all pass, and the last command prints **nothing**.

- [ ] **Step 6: Re-sync with main before opening the PR**

```bash
git fetch origin && git rebase origin/main
```

If the rebase pulled in vault changes, rebuild and re-check:

```bash
npm run build:deck && git status --porcelain
```

- [ ] **Step 7: Commit and open the PR**

```bash
git add README.md
git commit -m "docs: describe read-suppression and search

Corrects two statements masking made true and this change made false:
that answers are hidden while due, and that the progress counter
survives a note detour intact."
```

---

## Notes for the executor

**Ordering matters in two places.** Task 8 (in-flight filter) must land before Task 9 (delete masking) — between them, reading a note mid-review would spoil cards still queued in that session. And Tasks 1-7 must land before Task 9 for the same reason at the daily-session level.

**Tasks 10-12 are independent of Tasks 1-9.** They touch no shared file except `route.ts` (Task 11) and can be worked in parallel if you are dispatching agents.

**Two claims in the spec are unverified and must be checked, not assumed.** The scan's per-query cost on a real iPhone (Task 10, Step 6), and the whole review-detour loop (Task 8, Step 7). The project's own history says every defect that mattered was found by using the app rather than reviewing it.

**If the scan measures badly,** stop and raise it. The spec names the fallback — a runtime inverted index behind the same `search(notes, query)` signature — but swapping to it is a decision, not an implementation detail.
