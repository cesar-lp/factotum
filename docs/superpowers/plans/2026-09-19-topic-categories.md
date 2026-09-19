# Topic Categories, Toggles, and Focused Sessions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `topic` grouping above `category`, let individual categories be
switched off so they never enter the daily queue, and add an on-demand focused
session over a single category.

**Architecture:** A new optional `topic` frontmatter key flows through the
pipeline onto every `DeckCard` (defaulting to the note's own `category` when
absent). The app stores a `disabledCategories` list inside the existing
`Settings` object — no IndexedDB version bump — and filters cards through one
new pure function before the untouched `buildSession`/`buildExtension` run. A
focused session is composed from those same two builders rather than being a
third scheduling path. A new pure `topics.ts` module summarises the deck by
topic/category and is consumed by both the route guard and the new `#topics`
screen.

**Tech Stack:** TypeScript (ESM, `.js` import specifiers), Vitest (`node`
environment, `globals: true`, `fake-indexeddb/auto` setup), `gray-matter` for
frontmatter, `idb` for IndexedDB, `ts-fsrs` for scheduling. No new
dependencies.

**Spec:** `docs/superpowers/specs/2026-09-19-topic-categories-design.md`

## Global Constraints

- **No new dependencies.** Everything below uses what `package.json` already has.
- **No `openDb` version bump.** `openDb` stays at version 1. Settings live as a
  single value in the existing `meta` store and `sanitizeSettings` falls back
  field-by-field, which is what makes the new field backward-compatible.
- **`buildSession` and `buildExtension` are not modified.** Any task that needs
  different selection composes them or filters their input.
- **Regression bar:** with `disabledCategories: []`, every existing test must
  pass unchanged in substance. The feature is inert until used.
- **Import specifiers end in `.js`** even for TypeScript sources (`import ...
  from './queue.js'`) — this repo is ESM with `moduleResolution` requiring it.
- **Tests live in `<package>/tests/*.test.ts`** and import from `../src/...`.
  `vitest.config.ts` includes `**/tests/**/*.test.ts`.
- **Test environment is `node`, not a DOM.** There is no `document` in tests.
  Put logic in pure exported functions and test those; DOM-rendering functions
  (like `renderDashboard`) are deliberately untested in this repo — follow that.
- **Agents must not run any `git` command.** Multiple agents share one worktree;
  the orchestrator stages and commits after verifying each task. Run tests, edit
  files, report — nothing else.
- **Verification commands:** `npm test` (full suite), `npx vitest run <path>`
  (one file), `npm run typecheck`, `npm run build:deck`.

---

## File Structure

**Created**

- `app/src/topics.ts` — pure deck summarisation: groups cards into
  topic → category with per-category due/new counts. Consumed by the route
  guard and the topics screen. No DOM, no IndexedDB.
- `app/src/ui/topics.ts` — the `#topics` screen renderer. DOM only; all
  decisions come in as props.
- `app/tests/topics.test.ts` — tests for `app/src/topics.ts`.

**Modified**

- `pipeline/src/types.ts` — `topic` on `NoteMeta` and `DeckCard`.
- `pipeline/src/frontmatter.ts` — parse `topic`, default it to `category`.
- `pipeline/src/build.ts` — copy `topic` onto each built `DeckCard`.
- `pipeline/tests/frontmatter.test.ts`, `pipeline/tests/build.test.ts` — coverage.
- `vault/**/*.md` (66 files) — backfilled `topic:` line.
- `deck/deck.json` — rebuilt.
- `app/src/db/schema.ts` — `disabledCategories` on `Settings`.
- `app/src/db/settings.ts` — default + sanitisation for the new field.
- `app/src/ui/settings.ts` — stop the settings form from clobbering the new field.
- `app/src/scheduler/queue.ts` — `selectEnabled`, `buildFocusSession`.
- `app/src/route.ts` — discriminated-union `RouteDecision`, `topics` + `focus`.
- `app/src/main.ts` — wire filtering, the new routes, and the new screen.
- `app/src/ui/dashboard.ts` — a "Topics" button.
- `app/tests/{settings,queue,route}.test.ts` — coverage and shape updates.
- `README.md` — document `topic`, the topics screen, and focused sessions.

---

## Task 1: `topic` through the pipeline

**Files:**
- Modify: `pipeline/src/types.ts`
- Modify: `pipeline/src/frontmatter.ts:22-40`
- Modify: `pipeline/src/build.ts` (the `deckCard` literal inside `buildDeck`)
- Test: `pipeline/tests/frontmatter.test.ts`, `pipeline/tests/build.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `NoteMeta.topic: string` and `DeckCard.topic: string`, both always
  populated (never `undefined`). Tasks 2, 5 and 7 depend on `DeckCard.topic`
  existing on every card.

- [ ] **Step 1: Write the failing frontmatter tests**

Add to `pipeline/tests/frontmatter.test.ts` inside the existing
`describe('parseFrontmatter', ...)`:

```ts
  it('extracts topic when present', () => {
    const raw = '---\ntopic: aws\ncategory: aws-dynamodb\n---\nbody';
    expect(parseFrontmatter(raw).meta).toEqual({
      topic: 'aws',
      category: 'aws-dynamodb',
      tags: [],
      citations: []
    });
  });

  it('trims a padded topic', () => {
    const raw = '---\ntopic: "  aws  "\ncategory: aws-s3\n---\nbody';
    expect(parseFrontmatter(raw).meta?.topic).toBe('aws');
  });

  it('defaults an absent topic to the category', () => {
    const raw = '---\ncategory: networking\n---\nbody';
    expect(parseFrontmatter(raw).meta?.topic).toBe('networking');
  });

  it('defaults a blank or non-string topic to the category', () => {
    expect(parseFrontmatter('---\ntopic: "   "\ncategory: networking\n---\nb').meta?.topic)
      .toBe('networking');
    expect(parseFrontmatter('---\ntopic: 7\ncategory: networking\n---\nb').meta?.topic)
      .toBe('networking');
  });

  it('still ignores a note that has a topic but no category', () => {
    expect(parseFrontmatter('---\ntopic: aws\n---\nbody').meta).toBeNull();
  });
```

The first existing test in that file asserts the whole `meta` object with
`toEqual`; it now needs `topic: 'networking'` added. Do the same for the
`defaults tags and citations to empty arrays` case (`topic: 'algorithms'`) and
any other whole-object `toEqual` on `meta` in the file.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run pipeline/tests/frontmatter.test.ts`
Expected: FAIL — the new assertions report `topic` as `undefined`, and the
updated whole-object assertions report a missing `topic` key.

- [ ] **Step 3: Add `topic` to the types**

In `pipeline/src/types.ts`, add the field to `NoteMeta` and `DeckCard`:

```ts
export interface NoteMeta {
  /**
   * The shelf this note sits on — a book, a subject, a cloud provider.
   * Grouping and bulk-toggling happen at this level; interleaving and
   * mastery stay keyed on `category`. Always populated: a note that omits
   * `topic` gets its own `category` as its topic, so a single-category
   * shelf is the floor, never an absent one.
   */
  topic: string;
  category: string;
  tags: string[];
  citations: string[];
}
```

```ts
export interface DeckCard {
  id: string;
  format: CardFormat;
  topic: string;
  category: string;
  tags: string[];
  prompt: string;
  answer?: string;
  choices?: Choice[];
  source: { path: string; block: string };
  citations: string[];
}
```

- [ ] **Step 4: Parse `topic` in `parseFrontmatter`**

In `pipeline/src/frontmatter.ts`, after the existing `category` guard, derive
the topic and include it in the returned `meta`:

```ts
  const trimmedCategory = category.trim();
  const rawTopic = parsed.data['topic'];
  // A missing, blank or non-string topic falls back to the note's own
  // category, so a build can never fail on a missing topic and an
  // un-migrated note simply becomes a single-category shelf.
  const topic =
    typeof rawTopic === 'string' && rawTopic.trim() !== '' ? rawTopic.trim() : trimmedCategory;

  const consumed = raw.length - parsed.content.length;
  const bodyStartLine = raw.slice(0, consumed).split('\n').length - 1;

  return {
    meta: {
      topic,
      category: trimmedCategory,
      tags: toStringArray(parsed.data['tags'], 'tags'),
      citations: toStringArray(parsed.data['citations'], 'citations')
    },
    body: parsed.content,
    bodyStartLine
  };
```

- [ ] **Step 5: Run the frontmatter tests to verify they pass**

Run: `npx vitest run pipeline/tests/frontmatter.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing build test**

Add to `pipeline/tests/build.test.ts`. Match the existing file's style for
constructing a `ParsedNote` — read the top of that file first and reuse its
helper if one exists; otherwise:

```ts
  it('carries topic onto every deck card', () => {
    const deck = buildDeck(
      [
        {
          path: 'vault/aws/dynamodb.md',
          topic: 'aws',
          category: 'aws-dynamodb',
          tags: [],
          citations: [],
          cards: [{ id: 'card-a1', format: 'qa', prompt: 'q', answer: 'a', anchorLine: 3 }]
        },
        {
          path: 'vault/networking/dns.md',
          topic: 'networking',
          category: 'networking',
          tags: [],
          citations: [],
          cards: [{ id: 'card-n1', format: 'qa', prompt: 'q', answer: 'a', anchorLine: 3 }]
        }
      ],
      new Date('2026-09-19T00:00:00Z')
    );

    expect(deck.cards.map((c) => c.topic)).toEqual(['aws', 'networking']);
  });
```

Any existing test in that file that builds a `ParsedNote` literal now fails to
type-check without a `topic` key — add one to each (its value can equal the
note's `category`).

- [ ] **Step 7: Run the build test to verify it fails**

Run: `npx vitest run pipeline/tests/build.test.ts`
Expected: FAIL — `topic` is `undefined` on the produced cards.

- [ ] **Step 8: Copy `topic` onto the deck card**

In `pipeline/src/build.ts`, inside `buildDeck`'s `deckCard` literal, add
`topic` directly above `category`:

```ts
      const deckCard: DeckCard = {
        id: card.id,
        format: card.format,
        topic: note.topic,
        category: note.category,
        tags: note.tags,
        prompt: card.prompt,
        source: { path: note.path, block: card.id },
        citations: note.citations
      };
```

- [ ] **Step 9: Run the full pipeline suite and typecheck**

Run: `npx vitest run pipeline && npm run typecheck`
Expected: PASS for both. `smoke.test.ts` and `cards-*.test.ts` should be
unaffected; if a `ParsedNote` literal in any of them fails to type-check, add a
`topic` key equal to its `category`.

- [ ] **Step 10: Report**

Report to the orchestrator: files changed, test output. **Do not run `git`.**

---

## Task 2: Backfill the vault and rebuild the deck

**Depends on:** Task 1 (the pipeline must accept and emit `topic` first).

**Files:**
- Modify: all 66 files under `vault/**/*.md`
- Modify: `deck/deck.json` (regenerated, never hand-edited)

**Interfaces:**
- Consumes: `NoteMeta.topic` / `DeckCard.topic` from Task 1.
- Produces: a vault where every note states its shelf, and a `deck.json` that
  CI's deck-drift check will accept.

- [ ] **Step 1: Apply the backfill**

Every note gets a `topic:` line inserted immediately **above** its `category:`
line, mapped by its current category:

| category | topic |
|---|---|
| `networking` | `networking` |
| `data-systems` | `data-systems` |
| `database-internals` | `database-internals` |
| `amp` | `concurrency` |
| `os-concurrency` | `concurrency` |
| `os-virtualization` | `operating-systems` |
| `os-persistence` | `operating-systems` |

`amp` and `os-concurrency` share the `concurrency` shelf deliberately — a topic
groups by subject, not by source book. They remain separate categories, so
interleaving is unchanged.

Run this from the repo root:

```bash
python3 - <<'PY'
import pathlib, re

TOPICS = {
    'networking': 'networking',
    'data-systems': 'data-systems',
    'database-internals': 'database-internals',
    'amp': 'concurrency',
    'os-concurrency': 'concurrency',
    'os-virtualization': 'operating-systems',
    'os-persistence': 'operating-systems',
}

changed = 0
for path in sorted(pathlib.Path('vault').rglob('*.md')):
    text = path.read_text()
    lines = text.split('\n')
    if not lines or lines[0].strip() != '---':
        print(f'SKIP (no frontmatter): {path}')
        continue
    try:
        end = lines.index('---', 1)
    except ValueError:
        print(f'SKIP (unterminated frontmatter): {path}')
        continue
    head = lines[1:end]
    if any(l.startswith('topic:') for l in head):
        continue
    idx = next((i for i, l in enumerate(head) if l.startswith('category:')), None)
    if idx is None:
        print(f'SKIP (no category): {path}')
        continue
    category = head[idx].split(':', 1)[1].strip().strip('"\'')
    topic = TOPICS.get(category)
    if topic is None:
        raise SystemExit(f'UNMAPPED category {category!r} in {path}')
    head.insert(idx, f'topic: {topic}')
    path.write_text('\n'.join([lines[0]] + head + lines[end:]))
    changed += 1

print(f'backfilled {changed} notes')
PY
```

Expected: `backfilled 66 notes`, no `SKIP` and no `UNMAPPED` lines. If any note
is skipped or unmapped, stop and report it rather than proceeding — a skipped
note would silently fall back to a single-category shelf.

- [ ] **Step 2: Verify the mapping landed**

```bash
grep -rh '^topic:' vault | sort | uniq -c | sort -rn
```

Expected exactly:

```
  19 topic: concurrency
  20 topic: operating-systems
  10 topic: networking
   9 topic: data-systems
   8 topic: database-internals
```

(`concurrency` = 10 `amp` + 9 `os-concurrency`; `operating-systems` = 10
`os-virtualization` + 10 `os-persistence`. Order of the lines will differ; the
counts must not.)

- [ ] **Step 3: Rebuild the deck**

Run: `npm run build:deck`
Expected: `Wrote N cards from 66 notes to deck/deck.json`.

- [ ] **Step 4: Verify the deck carries topics and nothing else moved**

```bash
node -e "const d=require('./deck/deck.json');console.log(d.cards.length, [...new Set(d.cards.map(c=>c.topic))].sort().join(','), d.cards.filter(c=>!c.topic).length)"
```

Expected: the card count, then
`concurrency,data-systems,database-internals,networking,operating-systems`,
then `0` (no card missing a topic).

Then confirm the only change to existing cards is the added key:

```bash
git diff --stat deck/deck.json
git diff deck/deck.json | grep '^[-+]' | grep -v '^[-+][-+]' | grep -v 'topic\|generatedAt' | head
```

Expected: the second command prints nothing. Any other changed line means a
card's content moved, which this task must not do — stop and report.

- [ ] **Step 5: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Report**

Report the backfill counts, the deck card count, and the test output. **Do not
run `git`.**

---

## Task 3: `disabledCategories` in settings

**Files:**
- Modify: `app/src/db/schema.ts` (the `Settings` interface)
- Modify: `app/src/db/settings.ts`
- Modify: `app/src/ui/settings.ts` (the `persist` closure inside `renderSettings`)
- Test: `app/tests/settings.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `Settings.disabledCategories: string[]`, defaulting to `[]`;
  `sanitizeSettings` coerces it. Tasks 7 reads and writes it via the existing
  `getSettings` / `saveSettings`.

**Critical detail:** `renderSettings`'s `persist()` currently rebuilds the whole
`Settings` object from three form inputs and saves it. Left alone, saving the
settings form would **wipe `disabledCategories`**. Step 6 fixes that. Do not
skip it.

- [ ] **Step 1: Write the failing tests**

Add to `app/tests/settings.test.ts`:

```ts
describe('sanitizeSettings — disabledCategories', () => {
  it('defaults to an empty list', () => {
    expect(sanitizeSettings({}).disabledCategories).toEqual([]);
  });

  it('coerces a non-array to an empty list', () => {
    expect(sanitizeSettings({ disabledCategories: 'aws' }).disabledCategories).toEqual([]);
  });

  it('drops non-string and blank entries and trims the rest', () => {
    const result = sanitizeSettings({ disabledCategories: ['  aws-s3  ', 7, '', '   ', 'amp'] });
    expect(result.disabledCategories).toEqual(['aws-s3', 'amp']);
  });

  it('removes duplicates, including ones that differ only by padding', () => {
    const result = sanitizeSettings({ disabledCategories: ['amp', 'amp', ' amp '] });
    expect(result.disabledCategories).toEqual(['amp']);
  });

  it('caps a corrupt oversized list', () => {
    const many = Array.from({ length: 500 }, (_, i) => `cat-${i}`);
    expect(sanitizeSettings({ disabledCategories: many }).disabledCategories).toHaveLength(200);
  });

  it('reads back the default for a settings record written before this field existed', () => {
    const legacy = { desiredRetention: 0.85, newCardsPerDay: 20, theme: 'night' };
    expect(sanitizeSettings(legacy).disabledCategories).toEqual([]);
  });
});
```

Every existing whole-object `toEqual` on a settings value in this file now needs
`disabledCategories: []` added. Those are at (current) lines 13, 35, 42, 49 and
63 — verify by running the file rather than trusting the line numbers.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/tests/settings.test.ts`
Expected: FAIL — `disabledCategories` is `undefined`.

- [ ] **Step 3: Add the field to `Settings`**

In `app/src/db/schema.ts`:

```ts
export interface Settings {
  desiredRetention: number;
  newCardsPerDay: number;
  theme: 'auto' | 'day' | 'night';
  /**
   * Categories kept out of the daily session and its extension. Stored as
   * the DISABLED set, not an allowlist, so a newly authored category is
   * reviewable the moment it lands rather than silently inert until
   * someone remembers to opt in. A name here that no longer exists in the
   * deck is harmless and is deliberately not pruned — a temporarily
   * missing deck must not silently un-mute a shelf.
   */
  disabledCategories: string[];
}
```

- [ ] **Step 4: Default and sanitise it**

In `app/src/db/settings.ts`:

```ts
/** Bounds a corrupt or malicious write; far above any plausible real vault. */
const MAX_DISABLED_CATEGORIES = 200;

export const DEFAULT_SETTINGS: Settings = {
  desiredRetention: 0.9,
  newCardsPerDay: 10,
  theme: 'auto',
  disabledCategories: []
};

function toCategoryList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (trimmed === '' || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= MAX_DISABLED_CATEGORIES) break;
  }
  return out;
}
```

and extend the returned object in `sanitizeSettings`:

```ts
  return {
    desiredRetention,
    newCardsPerDay,
    theme,
    disabledCategories: toCategoryList(record['disabledCategories'])
  };
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run app/tests/settings.test.ts`
Expected: PASS.

- [ ] **Step 6: Stop the settings form from clobbering the field**

In `app/src/ui/settings.ts`, `persist()` builds a fresh object from the three
inputs. Re-read the stored settings inside `persist` and carry the field
through — re-reading rather than closing over the render-time snapshot means a
toggle made on the topics screen between render and save is not lost:

```ts
  const persist = async (): Promise<void> => {
    const rawTheme = themeSelect ? themeSelect.value : DEFAULT_SETTINGS.theme;
    // Re-read rather than reusing the render-time `settings` snapshot: this
    // form owns three fields, and must not write stale values over any
    // field it does not render (disabledCategories, owned by the topics
    // screen).
    const current = await getSettings(db);
    const next = clampSettings({
      ...current,
      theme: (THEMES as string[]).includes(rawTheme) ? (rawTheme as Settings['theme']) : DEFAULT_SETTINGS.theme,
      desiredRetention: retentionInput ? Number(retentionInput.value) : DEFAULT_SETTINGS.desiredRetention,
      newCardsPerDay: newCardsInput ? Number(newCardsInput.value) : DEFAULT_SETTINGS.newCardsPerDay
    });
    await saveSettings(db, next);
```

The rest of `persist` (applying the theme, reflecting clamped values back into
the inputs) is unchanged.

- [ ] **Step 7: Write a test proving the form no longer clobbers it**

`renderSettings` needs a DOM and the test environment is `node`, so test the
guarantee at the level that is reachable — that `clampSettings` preserves a
field it does not render. Add to `app/tests/settings.test.ts`:

```ts
  it('clampSettings preserves disabledCategories it was handed', () => {
    const result = clampSettings({
      desiredRetention: 0.9,
      newCardsPerDay: 10,
      theme: 'auto',
      disabledCategories: ['amp']
    });
    expect(result.disabledCategories).toEqual(['amp']);
  });
```

- [ ] **Step 8: Run the app suite and typecheck**

Run: `npx vitest run app && npm run typecheck`
Expected: PASS.

- [ ] **Step 9: Report**

Report files changed and test output. **Do not run `git`.**

---

## Task 4: `selectEnabled` and `buildFocusSession`

**Files:**
- Modify: `app/src/scheduler/queue.ts` (additions only — `buildSession`,
  `buildExtension` and `interleave` are not touched)
- Test: `app/tests/queue.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  ```ts
  export function selectEnabled(
    cards: StoredCard[],
    disabled: ReadonlySet<string>
  ): StoredCard[];

  export interface FocusInput {
    cards: StoredCard[];
    reviews: Map<string, ReviewState>;
    now: Date;
    category: string;
  }
  export function buildFocusSession(input: FocusInput): StoredCard[];
  ```
  Task 7 calls both from `main.ts`.

- [ ] **Step 1: Write the failing tests**

Add to `app/tests/queue.test.ts` (reuse the file's existing `card` and `due`
helpers at the top):

```ts
describe('selectEnabled', () => {
  it('is a no-op for an empty disabled set', () => {
    const cards = [card('card-a', 'algo'), card('card-n', 'net')];
    expect(selectEnabled(cards, new Set())).toEqual(cards);
  });

  it('removes cards in disabled categories and preserves order', () => {
    const cards = [card('card-a', 'algo'), card('card-n', 'net'), card('card-a2', 'algo')];
    expect(selectEnabled(cards, new Set(['net'])).map((c) => c.id))
      .toEqual(['card-a', 'card-a2']);
  });

  it('keeps a disabled name that matches nothing harmless', () => {
    const cards = [card('card-a', 'algo')];
    expect(selectEnabled(cards, new Set(['gone']))).toEqual(cards);
  });
});

describe('disabled categories and the daily queue', () => {
  it('keeps a disabled category out of both the session and the extension', () => {
    const cards = [
      card('card-due-net', 'net'), card('card-new-net', 'net'),
      card('card-due-algo', 'algo'), card('card-new-algo', 'algo')
    ];
    const reviews = new Map([
      ['card-due-net', due('card-due-net')],
      ['card-due-algo', due('card-due-algo')]
    ]);
    const enabled = selectEnabled(cards, new Set(['net']));

    const session = buildSession({
      cards: enabled, reviews, now, newCardsPerDay: 10, newCardsSeenToday: 0
    });
    const extension = buildExtension({ cards: enabled, reviews });

    expect(session.map((c) => c.id)).toEqual(['card-due-algo', 'card-new-algo']);
    expect(extension.map((c) => c.id)).toEqual(['card-new-algo']);
  });
});

describe('buildFocusSession', () => {
  it('serves the category\'s due cards before its new cards', () => {
    const cards = [card('card-new', 'algo'), card('card-due', 'algo')];
    const reviews = new Map([['card-due', due('card-due')]]);
    const focus = buildFocusSession({ cards, reviews, now, category: 'algo' });
    expect(focus.map((c) => c.id)).toEqual(['card-due', 'card-new']);
  });

  it('ignores other categories entirely', () => {
    const cards = [card('card-algo', 'algo'), card('card-net', 'net')];
    const focus = buildFocusSession({ cards, reviews: new Map(), now, category: 'algo' });
    expect(focus.map((c) => c.id)).toEqual(['card-algo']);
  });

  it('is uncapped — every new card in the category, past any daily allowance', () => {
    const cards = Array.from({ length: 25 }, (_, i) => card(`card-n${i}`, 'algo'));
    const focus = buildFocusSession({ cards, reviews: new Map(), now, category: 'algo' });
    expect(focus).toHaveLength(25);
  });

  it('excludes cards that are not yet due, so it cannot pull a schedule forward', () => {
    const cards = [card('card-future', 'algo'), card('card-due', 'algo')];
    const reviews = new Map([
      ['card-future', { ...due('card-future'), due: now.getTime() + 86_400_000 }],
      ['card-due', due('card-due')]
    ]);
    const focus = buildFocusSession({ cards, reviews, now, category: 'algo' });
    expect(focus.map((c) => c.id)).toEqual(['card-due']);
  });

  it('excludes suspended and tombstoned cards', () => {
    const cards = [
      { ...card('card-tomb', 'algo'), tombstoned: true },
      card('card-susp', 'algo'),
      card('card-ok', 'algo')
    ];
    const reviews = new Map([
      ['card-susp', { ...due('card-susp'), suspended: true }],
      ['card-ok', due('card-ok')]
    ]);
    const focus = buildFocusSession({ cards, reviews, now, category: 'algo' });
    expect(focus.map((c) => c.id)).toEqual(['card-ok']);
  });

  it('returns nothing for a category that does not exist', () => {
    const cards = [card('card-algo', 'algo')];
    expect(buildFocusSession({ cards, reviews: new Map(), now, category: 'gone' })).toEqual([]);
  });
});
```

Extend the file's top import to
`import { buildExtension, buildFocusSession, buildSession, dayKey, selectEnabled } from '../src/scheduler/queue.js';`

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/tests/queue.test.ts`
Expected: FAIL — `selectEnabled is not a function` / `buildFocusSession is not a function`.

- [ ] **Step 3: Implement both, appended to `queue.ts`**

```ts
/**
 * Drops cards whose category the user has switched off. Order-preserving,
 * and applied BEFORE `buildSession`/`buildExtension` rather than inside
 * them, so those two keep exactly one job and stay byte-identical in
 * behaviour when nothing is disabled.
 *
 * This is a filter, not a freeze: FSRS state is untouched, so due dates
 * keep advancing while a category is off and re-enabling surfaces whatever
 * became overdue. That is deliberate — FSRS models forgetting over real
 * elapsed time, and pretending the clock stopped would overstate how much
 * of that material is still retained.
 */
export function selectEnabled(cards: StoredCard[], disabled: ReadonlySet<string>): StoredCard[] {
  if (disabled.size === 0) return cards;
  return cards.filter((card) => !disabled.has(card.category));
}

export interface FocusInput {
  cards: StoredCard[];
  reviews: Map<string, ReviewState>;
  now: Date;
  category: string;
}

/**
 * The on-demand session: one category, its due cards first, then every one
 * of its unseen cards with no daily cap.
 *
 * Composed from the two existing builders rather than written as a third
 * scheduling path — `newCardsPerDay: 0` makes `buildSession` contribute due
 * cards only, and `buildExtension` contributes the uncapped new cards.
 * Suspension, tombstoning and the not-yet-due test are therefore inherited
 * rather than reimplemented, and there is no second notion of "due" to
 * drift out of sync.
 *
 * Not-yet-due cards are deliberately absent: a focused session is a real
 * review that writes FSRS state, so including them would pull their
 * schedules forward. Cards are NOT filtered by `disabledCategories` here —
 * disabling keeps a category out of the DAILY queue, and deliberately
 * picking it on demand is exactly the case that should still work.
 */
export function buildFocusSession(input: FocusInput): StoredCard[] {
  const { cards, reviews, now, category } = input;
  const inCategory = cards.filter((card) => card.category === category);

  return [
    ...buildSession({
      cards: inCategory,
      reviews,
      now,
      newCardsPerDay: 0,
      newCardsSeenToday: 0
    }),
    ...buildExtension({ cards: inCategory, reviews })
  ];
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/tests/queue.test.ts`
Expected: PASS, including every pre-existing case in the file.

- [ ] **Step 5: Run the app suite and typecheck**

Run: `npx vitest run app && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Report**

Report files changed and test output. **Do not run `git`.**

---

## Task 5: The topics summary module

**Depends on:** Task 1 (`DeckCard.topic`).

**Files:**
- Create: `app/src/topics.ts`
- Create: `app/tests/topics.test.ts`

**Interfaces:**
- Consumes: `StoredCard.topic` (Task 1), `isDue` from `./scheduler/fsrs.js`.
- Produces:
  ```ts
  export interface CategorySummary {
    category: string;
    dueCount: number;
    newCount: number;
  }
  export interface TopicSummary {
    topic: string;
    categories: CategorySummary[];
  }
  export function summarizeTopics(
    cards: StoredCard[],
    reviews: Map<string, ReviewState>,
    now: Date
  ): TopicSummary[];
  export function hasFocusableCards(topics: TopicSummary[], category: string): boolean;
  ```
  Task 6 uses `TopicSummary` and `hasFocusableCards`; Task 7 renders
  `TopicSummary[]`.

- [ ] **Step 1: Write the failing tests**

Create `app/tests/topics.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { summarizeTopics, hasFocusableCards } from '../src/topics.js';
import { initialState } from '../src/scheduler/fsrs.js';
import type { StoredCard, ReviewState } from '../src/db/schema.js';

const now = new Date('2026-09-19T09:00:00Z');

const card = (id: string, topic: string, category: string): StoredCard => ({
  id, format: 'qa', topic, category, tags: [], prompt: id, answer: 'a',
  source: { path: 'vault/a.md', block: id }, citations: [], tombstoned: false
});

const due = (id: string): ReviewState => ({ ...initialState(id, now), due: now.getTime() - 1000, reps: 3 });
const notYetDue = (id: string): ReviewState => ({
  ...initialState(id, now), due: now.getTime() + 86_400_000, reps: 3
});

describe('summarizeTopics', () => {
  it('groups categories under their topic, both sorted by name', () => {
    const cards = [
      card('c1', 'operating-systems', 'os-persistence'),
      card('c2', 'concurrency', 'os-concurrency'),
      card('c3', 'concurrency', 'amp'),
      card('c4', 'operating-systems', 'os-virtualization')
    ];
    const result = summarizeTopics(cards, new Map(), now);
    expect(result.map((t) => t.topic)).toEqual(['concurrency', 'operating-systems']);
    expect(result[0]?.categories.map((c) => c.category)).toEqual(['amp', 'os-concurrency']);
    expect(result[1]?.categories.map((c) => c.category)).toEqual(['os-persistence', 'os-virtualization']);
  });

  it('counts due and new cards per category', () => {
    const cards = [
      card('c-due', 'concurrency', 'amp'),
      card('c-new1', 'concurrency', 'amp'),
      card('c-new2', 'concurrency', 'amp')
    ];
    const reviews = new Map([['c-due', due('c-due')]]);
    const [topic] = summarizeTopics(cards, reviews, now);
    expect(topic?.categories[0]).toEqual({ category: 'amp', dueCount: 1, newCount: 2 });
  });

  it('counts neither not-yet-due nor suspended nor tombstoned cards', () => {
    const cards = [
      card('c-future', 'concurrency', 'amp'),
      card('c-susp', 'concurrency', 'amp'),
      { ...card('c-tomb', 'concurrency', 'amp'), tombstoned: true },
      card('c-due', 'concurrency', 'amp')
    ];
    const reviews = new Map([
      ['c-future', notYetDue('c-future')],
      ['c-susp', { ...due('c-susp'), suspended: true }],
      ['c-due', due('c-due')]
    ]);
    const [topic] = summarizeTopics(cards, reviews, now);
    expect(topic?.categories[0]).toEqual({ category: 'amp', dueCount: 1, newCount: 0 });
  });

  it('omits a category whose only cards are tombstoned', () => {
    const cards = [{ ...card('c-tomb', 'concurrency', 'amp'), tombstoned: true }];
    expect(summarizeTopics(cards, new Map(), now)).toEqual([]);
  });

  it('returns an empty list for an empty deck', () => {
    expect(summarizeTopics([], new Map(), now)).toEqual([]);
  });
});

describe('hasFocusableCards', () => {
  const topics = summarizeTopics(
    [card('c-new', 'concurrency', 'amp')],
    new Map(),
    now
  );

  it('is true for a category with cards waiting', () => {
    expect(hasFocusableCards(topics, 'amp')).toBe(true);
  });

  it('is false for a category that does not exist', () => {
    expect(hasFocusableCards(topics, 'gone')).toBe(false);
  });

  it('is false for a category with nothing due and nothing new', () => {
    const settled = summarizeTopics(
      [card('c-future', 'concurrency', 'amp')],
      new Map([['c-future', notYetDue('c-future')]]),
      now
    );
    expect(hasFocusableCards(settled, 'amp')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/tests/topics.test.ts`
Expected: FAIL — cannot resolve `../src/topics.js`.

- [ ] **Step 3: Implement `app/src/topics.ts`**

```ts
import type { ReviewState, StoredCard } from './db/schema.js';
import { isDue } from './scheduler/fsrs.js';

export interface CategorySummary {
  category: string;
  dueCount: number;
  newCount: number;
}

export interface TopicSummary {
  topic: string;
  categories: CategorySummary[];
}

/**
 * Groups the deck into topic → category with per-category due and new
 * counts, sorted by name at both levels so the picker's ordering is stable
 * across renders and independent of card insertion order.
 *
 * Counts deliberately ignore `disabledCategories`: they describe the
 * MATERIAL, not the daily queue, so a muted shelf still shows what is
 * waiting behind it. The same "due" and "new" tests the scheduler uses
 * apply here (no state = new; state, not suspended, past its due time =
 * due), so a category's counts always match what a focused session over it
 * would actually serve.
 *
 * A category whose cards are all tombstoned disappears entirely — there is
 * nothing to offer and nothing to toggle.
 */
export function summarizeTopics(
  cards: StoredCard[],
  reviews: Map<string, ReviewState>,
  now: Date
): TopicSummary[] {
  const byTopic = new Map<string, Map<string, CategorySummary>>();

  for (const card of cards) {
    if (card.tombstoned) continue;
    const state = reviews.get(card.id);
    if (state?.suspended) continue;

    const isNew = !state;
    if (!isNew && !isDue(state, now)) continue;

    const categories = byTopic.get(card.topic) ?? new Map<string, CategorySummary>();
    const summary = categories.get(card.category) ?? { category: card.category, dueCount: 0, newCount: 0 };
    if (isNew) summary.newCount += 1;
    else summary.dueCount += 1;
    categories.set(card.category, summary);
    byTopic.set(card.topic, categories);
  }

  return [...byTopic.entries()]
    .map(([topic, categories]) => ({
      topic,
      categories: [...categories.values()].sort((a, b) => a.category.localeCompare(b.category))
    }))
    .sort((a, b) => a.topic.localeCompare(b.topic));
}

/**
 * Whether a focused session over `category` would serve anything. Used to
 * validate a `#focus/...` hash, which — like any hash — can arrive from a
 * stale history entry, a reload or a bookmark rather than from a tap on a
 * button that only renders when the category is real.
 */
export function hasFocusableCards(topics: TopicSummary[], category: string): boolean {
  return topics.some((topic) =>
    topic.categories.some((c) => c.category === category && c.dueCount + c.newCount > 0)
  );
}
```

Note: a category with only not-yet-due cards is absent from the summary
entirely, which is why the last `hasFocusableCards` test passes. That is
intentional — such a category has nothing to show and nothing to serve.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/tests/topics.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the app suite and typecheck**

Run: `npx vitest run app && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Report**

Report files created and test output. **Do not run `git`.**

---

## Task 6: Routing for `#topics` and `#focus/<category>`

**Depends on:** Task 5 (`TopicSummary`, `hasFocusableCards`).

**Files:**
- Modify: `app/src/route.ts`
- Test: `app/tests/route.test.ts`

**Interfaces:**
- Consumes: `TopicSummary`, `hasFocusableCards` from `./topics.js`.
- Produces:
  ```ts
  export interface DashboardState {
    session: StoredCard[];
    extension: StoredCard[];
    newCardsSeenToday: number;
    topics: TopicSummary[];
  }
  export type RouteDecision =
    | { kind: 'review' }
    | { kind: 'review-extend' }
    | { kind: 'focus'; category: string }
    | { kind: 'topics' }
    | { kind: 'settings' }
    | { kind: 'dashboard' };
  export const FOCUS_PREFIX = '#focus/';
  export function focusHash(category: string): string;
  ```
  Task 7's `main.ts` switches on `decision.kind` and calls `focusHash`.

**Note:** `RouteDecision` changes from a bare string union to a discriminated
union so `'focus'` can carry its category. Every existing assertion in
`route.test.ts` changes from `toBe('review')` to `toEqual({ kind: 'review' })`.
Keep the existing test *cases* — they encode the precedence invariant — and
change only their shape.

- [ ] **Step 1: Write the failing tests**

Update `app/tests/route.test.ts`. The `state` helper gains a topics argument,
and the card helper gains `topic`:

```ts
import { describe, it, expect } from 'vitest';
import { decideRoute, focusHash, type DashboardState } from '../src/route.js';
import type { TopicSummary } from '../src/topics.js';
import type { StoredCard } from '../src/db/schema.js';

const card = (id: string): StoredCard => ({
  id, format: 'qa', topic: 'net', category: 'net', tags: [], prompt: id, answer: 'a',
  source: { path: 'vault/a.md', block: id }, citations: [], tombstoned: false
});

const topics = (...categories: string[]): TopicSummary[] => [
  { topic: 'net', categories: categories.map((category) => ({ category, dueCount: 1, newCount: 0 })) }
];

const state = (
  session: StoredCard[],
  extension: StoredCard[],
  topicList: TopicSummary[] = []
): DashboardState => ({
  session,
  extension,
  newCardsSeenToday: 0,
  topics: topicList
});
```

Then update the existing assertions to the object shape and add:

```ts
  it('sends #topics to topics regardless of state', () => {
    expect(decideRoute('#topics', state([card('due-1')], []))).toEqual({ kind: 'topics' });
    expect(decideRoute('#topics', state([], []))).toEqual({ kind: 'topics' });
  });

  it('sends #focus/<category> to focus, carrying the category', () => {
    const s = state([], [], topics('amp'));
    expect(decideRoute('#focus/amp', s)).toEqual({ kind: 'focus', category: 'amp' });
  });

  it('allows focus even when due cards are waiting — it is an extra, not a fallback', () => {
    const s = state([card('due-1')], [], topics('amp'));
    expect(decideRoute('#focus/amp', s)).toEqual({ kind: 'focus', category: 'amp' });
  });

  it('decodes a percent-encoded category', () => {
    const s = state([], [], topics('data systems'));
    expect(decideRoute('#focus/data%20systems', s))
      .toEqual({ kind: 'focus', category: 'data systems' });
  });

  it('sends a stale #focus for an unknown category back to the dashboard', () => {
    expect(decideRoute('#focus/gone', state([], [], topics('amp'))))
      .toEqual({ kind: 'dashboard' });
  });

  it('sends #focus for a category with nothing to serve back to the dashboard', () => {
    const empty: TopicSummary[] = [
      { topic: 'net', categories: [{ category: 'amp', dueCount: 0, newCount: 0 }] }
    ];
    expect(decideRoute('#focus/amp', state([], [], empty))).toEqual({ kind: 'dashboard' });
  });

  it('sends a bare #focus/ with no category back to the dashboard', () => {
    expect(decideRoute('#focus/', state([], [], topics('amp')))).toEqual({ kind: 'dashboard' });
  });

  it('sends a malformed percent-escape back to the dashboard instead of throwing', () => {
    expect(decideRoute('#focus/%E0%A4%A', state([], [], topics('amp'))))
      .toEqual({ kind: 'dashboard' });
  });
});

describe('focusHash', () => {
  it('round-trips a category containing characters that need encoding', () => {
    const s = state([], [], topics('data systems'));
    expect(decideRoute(focusHash('data systems'), s))
      .toEqual({ kind: 'focus', category: 'data systems' });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/tests/route.test.ts`
Expected: FAIL — `focusHash` is not exported, and the existing assertions now
compare a string against an object.

- [ ] **Step 3: Rewrite `decideRoute`**

Replace the type and function in `app/src/route.ts`, keeping the existing
file-level doc comments about purity and stale hashes:

```ts
import type { StoredCard } from './db/schema.js';
import { hasFocusableCards, type TopicSummary } from './topics.js';

export interface DashboardState {
  /** Due cards plus new cards up to the day's remaining allowance. */
  session: StoredCard[];
  /**
   * New cards left over once `session` is exhausted — unbounded, only ever
   * served via the opt-in "keep going" extension, never automatically.
   */
  extension: StoredCard[];
  /** Today's new-card count so far (includes cards taken via `extension`). */
  newCardsSeenToday: number;
  /**
   * The whole deck grouped topic → category, INCLUDING categories the user
   * has disabled — this drives the picker (which must show what is muted)
   * and validates a `#focus/...` hash. Not filtered by
   * `disabledCategories`, unlike `session` and `extension`.
   */
  topics: TopicSummary[];
}

export type RouteDecision =
  | { kind: 'review' }
  | { kind: 'review-extend' }
  | { kind: 'focus'; category: string }
  | { kind: 'topics' }
  | { kind: 'settings' }
  | { kind: 'dashboard' };

export const FOCUS_PREFIX = '#focus/';

/** Builds the hash for a focused session, encoding the free-form category name. */
export function focusHash(category: string): string {
  return `${FOCUS_PREFIX}${encodeURIComponent(category)}`;
}

/**
 * Decodes the category segment of a focus hash. Returns null for a bare
 * `#focus/` and for a malformed percent-escape — `decodeURIComponent`
 * throws a URIError on input like `%E0%A4%A`, and a hash is plain client
 * state that can arrive hand-edited, so it is caught rather than allowed
 * to take down the route.
 */
function focusCategory(hash: string): string | null {
  const raw = hash.slice(FOCUS_PREFIX.length);
  if (raw === '') return null;
  try {
    const decoded = decodeURIComponent(raw);
    return decoded === '' ? null : decoded;
  } catch {
    return null;
  }
}

export function decideRoute(hash: string, state: DashboardState): RouteDecision {
  if (hash === '#review' && state.session.length > 0) return { kind: 'review' };

  // Due cards always come first — this re-checks the same condition the
  // dashboard button's own visibility already enforces, because the hash is
  // plain client state: reachable by a stale back/forward history entry, a
  // reload, or a bookmark, not just a click on a button that only renders
  // when the queue is actually empty. Never trust the route to only be
  // entered the way the UI currently intends it.
  if (hash === '#review-extend' && state.session.length === 0 && state.extension.length > 0) {
    return { kind: 'review-extend' };
  }

  // Focus is deliberately NOT gated on an empty session: it is an extra
  // available whenever asked for, not a fallback for a finished day. It is
  // still validated against the deck for the same stale-hash reasons as
  // above — an unknown category, or one with nothing to serve, falls back.
  if (hash.startsWith(FOCUS_PREFIX)) {
    const category = focusCategory(hash);
    if (category !== null && hasFocusableCards(state.topics, category)) {
      return { kind: 'focus', category };
    }
    return { kind: 'dashboard' };
  }

  if (hash === '#topics') return { kind: 'topics' };

  if (hash === '#settings') return { kind: 'settings' };

  return { kind: 'dashboard' };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/tests/route.test.ts`
Expected: PASS, including every pre-existing precedence case.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: FAIL in `app/src/main.ts` only — it still compares `decision` against
string literals and does not supply `topics`. That is Task 7's job; leave it.
Report the failure explicitly so the orchestrator knows it is expected.

- [ ] **Step 6: Report**

Report files changed, test output, and the expected `main.ts` typecheck
failure. **Do not run `git`.**

---

## Task 7: The topics screen and wiring

**Depends on:** Tasks 3, 4, 5, 6.

**Files:**
- Create: `app/src/ui/topics.ts`
- Modify: `app/src/ui/dashboard.ts`
- Modify: `app/src/main.ts`

**Interfaces:**
- Consumes: `selectEnabled`, `buildFocusSession` (Task 4); `summarizeTopics`,
  `TopicSummary` (Task 5); `decideRoute`, `focusHash`, `DashboardState`
  (Task 6); `Settings.disabledCategories`, `getSettings`, `saveSettings`
  (Task 3).
- Produces: `renderTopics(root, props)` and `onTopics` on `DashboardProps`.

**Note:** the test environment is `node` with no DOM, so — like
`renderDashboard` — `renderTopics` gets no unit test. Keep it a dumb renderer:
every decision arrives as a prop, and `main.ts` owns the logic. This is the
repo's existing split, not a shortcut.

- [ ] **Step 1: Add the dashboard entry point**

In `app/src/ui/dashboard.ts`, add `onTopics: () => void;` to `DashboardProps`,
render a button next to the settings button in the `.top` bar, and bind it:

```ts
      <div class="top">
        <span>factotum</span>
        <span>
          <button class="btn-quiet" id="topics">topics</button>
          <button class="btn-quiet" id="settings">settings</button>
        </span>
      </div>
```

```ts
  root.querySelector<HTMLButtonElement>('#topics')?.addEventListener('click', props.onTopics);
```

The topics button is always available — it is a browsing surface, and it stays
reachable when the deck failed to load so the user can still see what is muted.

- [ ] **Step 2: Create `app/src/ui/topics.ts`**

```ts
import type { TopicSummary } from '../topics.js';

export interface TopicsProps {
  /** Every topic in the deck, disabled ones included — nothing is hidden. */
  topics: TopicSummary[];
  /** The categories currently switched off. */
  disabled: ReadonlySet<string>;
  /** Flip one category. `nextDisabled` is the state being moved TO. */
  onToggleCategory: (category: string, nextDisabled: boolean) => void;
  /** Flip a whole shelf. `nextDisabled` is the state being moved TO. */
  onToggleTopic: (topic: string, nextDisabled: boolean) => void;
  onLearn: (category: string) => void;
  onBack: () => void;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The topics screen: browse the deck by shelf, mute what you are not ready
 * for, and start a focused session on demand.
 *
 * A dumb renderer by design — every decision (what is disabled, what a
 * toggle means, what a tap does) arrives as a prop, so the logic lives in
 * main.ts where it is reachable from a node test environment. This mirrors
 * how renderDashboard is structured.
 *
 * Category names come from free-form vault frontmatter, so they are
 * HTML-escaped on the way into innerHTML and carried on data attributes
 * rather than being interpolated into element ids.
 */
export function renderTopics(root: HTMLElement, props: TopicsProps): void {
  const sections = props.topics
    .map((topic) => {
      const allDisabled = topic.categories.every((c) => props.disabled.has(c.category));
      // Mixed or fully-on shelves mute; only a fully-muted shelf un-mutes.
      const nextDisabled = !allDisabled;

      const rows = topic.categories
        .map((c) => {
          const off = props.disabled.has(c.category);
          return `
            <div class="topic-row" ${off ? 'data-off="true"' : ''}>
              <span class="topic-row-name">${escapeHtml(c.category)}</span>
              <span class="chip">${c.dueCount} due &middot; ${c.newCount} new</span>
              <button class="btn-quiet" data-learn="${escapeHtml(c.category)}">learn</button>
              <button class="btn-quiet" data-toggle="${escapeHtml(c.category)}" data-next="${off ? 'on' : 'off'}">
                ${off ? 'off' : 'on'}
              </button>
            </div>
          `;
        })
        .join('');

      return `
        <section class="topic">
          <div class="topic-head">
            <span>${escapeHtml(topic.topic)}</span>
            <button class="btn-quiet" data-toggle-topic="${escapeHtml(topic.topic)}" data-next="${nextDisabled ? 'off' : 'on'}">
              ${nextDisabled ? 'mute all' : 'unmute all'}
            </button>
          </div>
          ${rows}
        </section>
      `;
    })
    .join('');

  const body = props.topics.length === 0
    ? '<div style="color:var(--dim);text-align:center">no topics yet</div>'
    : sections;

  root.innerHTML = `
    <section class="screen">
      <div class="top"><button class="btn-quiet" id="back">← back</button><span>topics</span></div>
      ${body}
    </section>
  `;

  root.querySelector<HTMLButtonElement>('#back')?.addEventListener('click', props.onBack);

  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-learn]')) {
    const category = button.dataset['learn'];
    if (category !== undefined) button.addEventListener('click', () => props.onLearn(category));
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-toggle]')) {
    const category = button.dataset['toggle'];
    const next = button.dataset['next'] === 'off';
    if (category !== undefined) {
      button.addEventListener('click', () => props.onToggleCategory(category, next));
    }
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-toggle-topic]')) {
    const topic = button.dataset['toggleTopic'];
    const next = button.dataset['next'] === 'off';
    if (topic !== undefined) button.addEventListener('click', () => props.onToggleTopic(topic, next));
  }
}
```

- [ ] **Step 3: Add the screen's styles**

Append to `app/src/styles.css`, following the file's existing variable usage
(`var(--dim)`, etc. — read the file first and match its conventions):

```css
.topic { margin-top: 18px; }
.topic-head { display: flex; align-items: center; justify-content: space-between; color: var(--dim); font-size: 13px; text-transform: lowercase; }
.topic-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; }
.topic-row-name { flex: 1; }
.topic-row[data-off="true"] { opacity: 0.45; }
```

- [ ] **Step 4: Wire `main.ts`**

In `app/src/main.ts`:

Add imports:

```ts
import { buildExtension, buildFocusSession, buildSession, selectEnabled } from './scheduler/queue.js';
import { summarizeTopics } from './topics.js';
import { renderTopics } from './ui/topics.js';
import { decideRoute, focusHash, type DashboardState } from './route.js';
import { getSettings, saveSettings } from './db/settings.js';
```

Rewrite `loadDashboardState` so disabled categories are filtered out of the
daily queue while `topics` deliberately sees the whole deck:

```ts
export async function loadDashboardState(db: FactotumDb, now: Date): Promise<DashboardState> {
  const [cards, reviews, settings, seen] = await Promise.all([
    db.getAll('cards'),
    loadReviews(db),
    getSettings(db),
    newCardsSeenToday(db, now)
  ]);

  // The daily queue respects the user's mutes; the topics summary does not
  // — it has to show what is muted, and it validates focus hashes, which
  // are allowed to target a muted category on purpose.
  const enabled = selectEnabled(cards, new Set(settings.disabledCategories));

  const session = buildSession({
    cards: enabled,
    reviews,
    now,
    newCardsPerDay: settings.newCardsPerDay,
    newCardsSeenToday: seen
  });
  const extension = buildExtension({ cards: enabled, reviews });
  const topics = summarizeTopics(cards, reviews, now);

  return { session, extension, newCardsSeenToday: seen, topics };
}
```

Rewrite `route()` to switch on `decision.kind`:

```ts
async function route(appRoot: HTMLElement, db: FactotumDb, deckUnavailable: boolean): Promise<void> {
  const now = new Date();
  const state = await loadDashboardState(db, now);
  const hash = window.location.hash;
  const decision = decideRoute(hash, state);

  if (decision.kind === 'review') {
    await startReview(appRoot, {
      db, session: state.session, repo: REPO,
      onDone: () => { window.location.hash = ''; }
    });
    return;
  }

  if (decision.kind === 'review-extend') {
    await startReview(appRoot, {
      db, session: state.extension, repo: REPO,
      onDone: () => { window.location.hash = ''; }
    });
    return;
  }

  if (decision.kind === 'focus') {
    const [cards, reviews] = await Promise.all([db.getAll('cards'), loadReviews(db)]);
    await startReview(appRoot, {
      db,
      session: buildFocusSession({ cards, reviews, now, category: decision.category }),
      repo: REPO,
      // Back to the picker, not the dashboard — a focused session lands you
      // where you launched it.
      onDone: () => { window.location.hash = '#topics'; }
    });
    return;
  }

  if (decision.kind === 'topics') {
    const settings = await getSettings(db);
    const disabled = new Set(settings.disabledCategories);

    const save = async (next: Set<string>): Promise<void> => {
      // Re-read so this write carries whatever the settings form may have
      // changed since this screen rendered.
      const current = await getSettings(db);
      await saveSettings(db, { ...current, disabledCategories: [...next] });
      await route(appRoot, db, deckUnavailable);
    };

    renderTopics(appRoot, {
      topics: state.topics,
      disabled,
      onToggleCategory: (category, nextDisabled) => {
        const next = new Set(disabled);
        if (nextDisabled) next.add(category);
        else next.delete(category);
        void save(next);
      },
      onToggleTopic: (topic, nextDisabled) => {
        const next = new Set(disabled);
        const summary = state.topics.find((t) => t.topic === topic);
        for (const c of summary?.categories ?? []) {
          if (nextDisabled) next.add(c.category);
          else next.delete(c.category);
        }
        void save(next);
      },
      onLearn: (category) => { window.location.hash = focusHash(category); },
      onBack: () => { window.location.hash = ''; }
    });
    return;
  }

  if (decision.kind === 'settings') {
    await renderSettings(appRoot, db, () => { window.location.hash = ''; });
    return;
  }

  if (hash === '#review-extend' || hash.startsWith('#focus/')) {
    // Stale/invalid entry into a session route (due cards exist again,
    // nothing left to extend into, or a focus hash whose category is gone)
    // — clear it so a subsequent reload or back/forward doesn't land here
    // again. A hash mutation is a side effect, so it stays here rather than
    // in the pure decideRoute.
    window.location.hash = '';
  }

  renderDashboard(appRoot, {
    dueCount: state.session.length,
    newCardsRemaining: state.extension.length,
    newCardsSeenToday: state.newCardsSeenToday,
    deckUnavailable,
    onStart: () => { window.location.hash = '#review'; },
    onKeepGoing: () => { window.location.hash = '#review-extend'; },
    onTopics: () => { window.location.hash = '#topics'; },
    onSettings: () => { window.location.hash = '#settings'; }
  });
}
```

Note the `#focus/` prefix must be added to the stale-hash cleanup alongside
`#review-extend`; a dead focus hash left in the bar would otherwise keep
bouncing to the dashboard on every reload.

Also note `route()` is now called recursively by `save()`. That is the
existing re-render pattern (the hash-change listener already re-enters
`route`), just invoked directly because a toggle changes state without
changing the hash.

- [ ] **Step 5: Typecheck and run the full suite**

Run: `npm run typecheck && npm test`
Expected: PASS for both, including Task 6's previously-failing `main.ts` errors.

- [ ] **Step 6: Verify in the browser**

Run: `npm run build:deck` then start the dev server and check, in order:

1. Dashboard shows a `topics` button; tapping it opens the topics screen.
2. Five shelves render (`concurrency`, `data-systems`, `database-internals`,
   `networking`, `operating-systems`), each listing its categories with due/new
   counts.
3. Toggling one category off dims it; going back to the dashboard shows a
   smaller due count.
4. `mute all` on a shelf switches every category on it off in one tap; the
   button then reads `unmute all`.
5. `learn` on a muted category still starts a session — muting affects the
   daily queue only.
6. A focused session ends back on the topics screen.
7. Hand-editing the hash to `#focus/does-not-exist` lands on the dashboard with
   the hash cleared.

- [ ] **Step 7: Report**

Report files changed, test output, and the result of each browser check.
**Do not run `git`.**

---

## Task 8: Documentation

**Depends on:** Tasks 1–7 (documents shipped behaviour).

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the shipped behaviour. Produces no code.

- [ ] **Step 1: Update the frontmatter example**

In the "Vault and authoring" section, the example currently reads:

```markdown
---
category: networking
tags: [tcp, transport-layer]
---
```

Add a `topic` line above `category`, and amend the surrounding sentence — which
currently says only notes with a `category` key are scanned — to note that
`topic` is optional and defaults to the category.

- [ ] **Step 2: Add a `topic` paragraph to "Vault conventions"**

Directly after the existing "**Folder structure is free; `category` is not.**"
paragraph, add a paragraph covering:

- `topic` is the shelf (a book, a subject, a cloud provider); `category` is
  still the ~8–12-note unit that interleaving buckets on and that mastery bars
  will key to.
- `topic` is optional and defaults to the note's own `category`, so a note
  without one is a single-category shelf, never an error.
- Like `category`, it comes from frontmatter only — never from the folder path.
- `amp` and `os-concurrency` share the `concurrency` shelf as the worked
  example of grouping by subject rather than by source book.

- [ ] **Step 3: Add a "Topics and focused sessions" section**

After the "Card constructs" material and before "Stable ids", add a section
covering:

- The `topics` button opens a screen grouping every category under its topic,
  with due/new counts.
- **Categories are on by default.** Turning one off keeps it out of the daily
  session and the "keep going" extension. `mute all` does a whole shelf.
- Muting is a filter, not a freeze: FSRS due dates keep advancing while a
  category is off, so re-enabling surfaces whatever went overdue.
- `learn` starts a focused session over one category: its due cards first, then
  every unseen card with no daily cap. It works on muted categories too.
- A focused session is a **real review** — it writes FSRS state and counts
  toward the day's new-card total, which shrinks the daily allowance
  accordingly. It never serves not-yet-due cards, so it cannot pull a schedule
  forward.
- The mute list is stored in settings and therefore rides along in
  **Settings → Export**.

- [ ] **Step 4: Verify**

Run: `npm test && npm run typecheck && npm run build:deck`
Expected: PASS, and `git diff --stat` shows no change to `deck/deck.json` (a
docs-only task must not move the deck).

- [ ] **Step 5: Report**

Report the README sections changed. **Do not run `git`.**

---

## Execution Order

Tasks are grouped into waves by dependency. Everything within a wave touches
disjoint files and can run in parallel.

| Wave | Tasks | Why |
|---|---|---|
| 1 | 1 (pipeline), 3 (settings), 4 (queue) | No shared files, no shared types. |
| 2 | 2 (backfill + deck), 5 (topics module) | Both need `topic` from Task 1. |
| 3 | 6 (route) | Needs `TopicSummary` from Task 5. |
| 4 | 7 (UI + wiring) | Needs 3, 4, 5, 6. |
| 5 | 8 (docs) | Documents shipped behaviour. |

The orchestrator verifies (`npm test`, `npm run typecheck`) and commits after
each wave. Agents never run `git`.

## Final Verification

Before opening the PR:

- [ ] `npm test` — all suites pass.
- [ ] `npm run typecheck` — both `tsc` invocations clean.
- [ ] `npm run build:deck` then `git status --porcelain` — nothing left dirty.
      This is the same deck-drift condition `ci.yml` enforces on the PR.
- [ ] The browser checks in Task 7, Step 6 all pass.
