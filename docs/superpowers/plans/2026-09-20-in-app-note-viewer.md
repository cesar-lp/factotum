# In-app Note Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read the vault note a card came from, inside the app, with other cards' answers masked when they are due for review.

**Architecture:** The pipeline emits a second build output, `deck/notes.json`, containing each note pre-parsed into a block stream with card constructs tagged by card id. The app fetches it lazily (never on the review path), renders blocks through the existing escaping layer, and masks any construct whose card is currently due. Nothing is written to IndexedDB.

**Tech Stack:** TypeScript, vitest (`node` environment), Vite, `gray-matter`, `idb`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-20-in-app-note-viewer-design.md`

## Global Constraints

- **Never hand-write or edit a `^card-xxxx` anchor.** The build assigns them; review history is keyed by card id, so editing one orphans that card's FSRS state. (`CLAUDE.md`)
- **A cloze must not restate its own answer.** Enforced by `pipeline/tests/cloze-self-answer.test.ts`.
- **Branch is `feat/in-app-note-viewer`.** Never push to `main`. All work lands via PR.
- **Conventional Commits** for every commit: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`. Explain *why* in the body — this repo's history is its main design record.
- **Before opening the PR, all four must pass:**
  ```bash
  npm test && npm run typecheck && npm run build:deck && git status --porcelain
  ```
  The last must print nothing.
- **Tests run in vitest's `node` environment.** No DOM is available. Every new module holding logic must be importable without touching `window` or `document`, and must not import CSS. This is why `route.ts`, `sw-routing.ts`, and `shelfCounts` exist in the shapes they do.
- **No IndexedDB schema change.** `openDb` stays at version 1.
- **No change to `deck.json`'s shape, FSRS behaviour, the scheduler, or the vault format.**
- **Due-ness comes only from `isDue` in `app/src/scheduler/fsrs.ts:132`.** Never reimplement it.
- **All note text is HTML-escaped via `escapeHtml` from `app/src/ui/renderers.ts`.** Never introduce a second escaping path; inline markup always runs *after* escaping.

---

### Task 1: `parseBlocks()` — the block emitter

Emits a note body as a block stream, with card-bearing constructs carrying an **ordinal** (`cardIndex`) into the array `parseCards` produces from the same body. It does not know final card ids and must not try — `assignIds` fills those in later (Task 2).

**Files:**
- Modify: `pipeline/src/types.ts` (append the block types)
- Modify: `pipeline/src/cards.ts` (append `parseBlocks`; do not restructure `parseCards`)
- Test: `pipeline/tests/blocks.test.ts` (create)

**Interfaces:**
- Consumes: the existing exported regexes in `cards.ts` — `HIGHLIGHT`, `QA`, `FENCE`, `CALLOUT_OPEN`, `CALLOUT_LINE`, `CHOICE`; and `stripAnchor`.
- Produces: `parseBlocks(body: string): RawBlock[]`, and the types `RawBlock` / `NoteBlock` / `NoteDoc` / `Notes` in `types.ts`. Task 2 consumes all of these.

- [ ] **Step 1: Add the types**

Append to `pipeline/src/types.ts`:

```ts
/** A cloze highlight's span within its block's joined text. */
export interface RawCloze {
  start: number;
  end: number;
  /** Ordinal into the `ParsedCard[]` that `parseCards` yields for the same body. */
  cardIndex: number;
  answer: string;
}

export interface ResolvedCloze {
  start: number;
  end: number;
  cardId: string;
  answer: string;
}

/** A block as `parseBlocks` emits it: card references are ordinals. */
export type RawBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; lang: string | null; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'prose'; text: string; clozes: RawCloze[] }
  | { kind: 'qa'; cardIndex: number; prompt: string; answer: string }
  | { kind: 'card'; cardIndex: number; format: 'mcq' | 'recall'; prompt: string; choices?: Choice[]; answer?: string };

/** A block after `build.ts` resolves ordinals to ids. Only this form is serialized. */
export type NoteBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; lang: string | null; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'prose'; text: string; clozes: ResolvedCloze[] }
  | { kind: 'qa'; cardId: string; prompt: string; answer: string }
  | { kind: 'card'; cardId: string; format: 'mcq' | 'recall'; prompt: string; choices?: Choice[]; answer?: string };

export interface NoteDoc {
  path: string;
  title: string;
  topic: string;
  category: string;
  citations: string[];
  blocks: NoteBlock[];
}

export interface Notes {
  generatedAt: string;
  notes: NoteDoc[];
}
```

- [ ] **Step 2: Write the failing tests**

Create `pipeline/tests/blocks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseBlocks } from '../src/cards.js';

describe('parseBlocks', () => {
  it('emits a heading with its level', () => {
    expect(parseBlocks('# Consensus')).toEqual([
      { kind: 'heading', level: 1, text: 'Consensus' }
    ]);
  });

  it('emits a fenced code block verbatim, without parsing card syntax inside it', () => {
    // FENCE content must never be scanned: `==x==` and `::` inside a fence
    // are code, not cards. parseCards already skips fences; parseBlocks
    // must keep the text instead of dropping it.
    const body = '```ts\nconst a = b == c;\n```';
    expect(parseBlocks(body)).toEqual([
      { kind: 'code', lang: 'ts', text: 'const a = b == c;' }
    ]);
  });

  it('emits plain prose with no clozes', () => {
    expect(parseBlocks('Just a sentence.')).toEqual([
      { kind: 'prose', text: 'Just a sentence.', clozes: [] }
    ]);
  });

  it('joins wrapped prose into one block and offsets clozes into the joined text', () => {
    // THE case that makes offsets non-trivial: buildBlock joins the two
    // source lines with a single space, so the cloze's start/end index the
    // joined string, not either source line.
    const body = 'Default Ethernet MTU\nis ==1500 bytes== today.';
    const blocks = parseBlocks(body);
    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    if (block?.kind !== 'prose') throw new Error('expected a prose block');
    expect(block.text).toBe('Default Ethernet MTU is 1500 bytes today.');
    expect(block.clozes).toEqual([
      { start: 24, end: 34, cardIndex: 0, answer: '1500 bytes' }
    ]);
    expect(block.text.slice(24, 34)).toBe('1500 bytes');
  });

  it('numbers multiple clozes in one block by match order', () => {
    const blocks = parseBlocks('A ==one== and ==two== here.');
    const block = blocks[0];
    if (block?.kind !== 'prose') throw new Error('expected a prose block');
    expect(block.clozes.map((c) => c.cardIndex)).toEqual([0, 1]);
    expect(block.clozes.map((c) => c.answer)).toEqual(['one', 'two']);
  });

  it('emits a qa block with prompt and answer split', () => {
    expect(parseBlocks('What is X? :: It is Y.')).toEqual([
      { kind: 'qa', cardIndex: 0, prompt: 'What is X?', answer: 'It is Y.' }
    ]);
  });

  it('emits an mcq callout with its choices and correctness', () => {
    const body = [
      '> [!card] mcq',
      '> At which OSI layer does TCP operate?',
      '> - [x] Transport (4)',
      '> - [ ] Network (3)'
    ].join('\n');
    expect(parseBlocks(body)).toEqual([
      {
        kind: 'card', cardIndex: 0, format: 'mcq',
        prompt: 'At which OSI layer does TCP operate?',
        choices: [
          { text: 'Transport (4)', correct: true },
          { text: 'Network (3)', correct: false }
        ]
      }
    ]);
  });

  it('splits a recall callout on its > --- separator', () => {
    const body = ['> [!card] recall', '> Explain X.', '> ---', '> Because Y.'].join('\n');
    expect(parseBlocks(body)).toEqual([
      { kind: 'card', cardIndex: 0, format: 'recall', prompt: 'Explain X.', answer: 'Because Y.' }
    ]);
  });

  it('omits answer for a recall callout with no separator', () => {
    const body = ['> [!card] recall', '> Explain X.'].join('\n');
    expect(parseBlocks(body)).toEqual([
      { kind: 'card', cardIndex: 0, format: 'recall', prompt: 'Explain X.' }
    ]);
  });

  it('strips ^card-xxxx anchors from emitted text', () => {
    // Anchors are build metadata, never reading material.
    const blocks = parseBlocks('A ==term== here. ^card-abcd');
    const block = blocks[0];
    if (block?.kind !== 'prose') throw new Error('expected a prose block');
    expect(block.text).toBe('A term here.');
  });

  it('emits a list block', () => {
    expect(parseBlocks('- first\n- second')).toEqual([
      { kind: 'list', items: ['first', 'second'] }
    ]);
  });

  it('numbers cardIndex across the whole body in walk order', () => {
    const body = [
      'A ==one== here.',
      '',
      'Q? :: A.',
      '',
      '> [!card] recall',
      '> Explain.'
    ].join('\n');
    const indices = parseBlocks(body).flatMap((b) =>
      b.kind === 'prose' ? b.clozes.map((c) => c.cardIndex)
      : b.kind === 'qa' || b.kind === 'card' ? [b.cardIndex]
      : []
    );
    expect(indices).toEqual([0, 1, 2]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
npx vitest run pipeline/tests/blocks.test.ts
```

Expected: FAIL — `parseBlocks is not a function` (and TS errors on the missing export).

- [ ] **Step 4: Implement `parseBlocks`**

Append to `pipeline/src/cards.ts`. Note it mirrors `parseCards`'s walk exactly — same order, same constructs, same guards — because the ordinal correlation in Task 2 depends on that.

```ts
/**
 * Emits a note body as a stream of renderable blocks, the reading-side
 * counterpart to `parseCards`. Both walk the SAME structure in the SAME
 * order, which is what lets `build.ts` correlate the two by ordinal alone.
 *
 * Card references are ordinals (`cardIndex`) into the array `parseCards`
 * yields for this same body, not ids: `parseCards` returns `id: string |
 * null` and `assignIds` fills the nulls afterwards, so final ids do not
 * exist yet at this point. `build.ts` resolves them once they do.
 *
 * Deliberately a sibling rather than a refactor of `parseCards`: that
 * function's bugs orphan card ids, which is silent rather than loud, so it
 * is not restructured to serve a reading feature. The shared regexes above
 * are the coupling, and `notes-corpus.test.ts` is the guard against drift.
 */
export function parseBlocks(body: string): RawBlock[] {
  const blocks: RawBlock[] = [];
  const lines = body.split('\n');
  let cardIndex = 0;
  let i = 0;

  const flushProse = (memberLines: number[]): void => {
    if (memberLines.length === 0) return;
    // bodyStartLine is irrelevant here (nothing reports line numbers), so 0.
    const { blockText } = buildBlock(lines, memberLines, 0);
    if (blockText === '') return;

    const matches = [...blockText.matchAll(HIGHLIGHT)];
    if (matches.length > 0) {
      // Rebuild the text with the `==` markers removed, tracking how each
      // match's span shifts as earlier markers are dropped.
      let text = '';
      let cursor = 0;
      const clozes: RawCloze[] = [];
      for (const match of matches) {
        const inner = match[1] ?? '';
        text += blockText.slice(cursor, match.index);
        const start = text.length;
        text += inner;
        clozes.push({ start, end: text.length, cardIndex: cardIndex++, answer: inner.trim() });
        cursor = (match.index ?? 0) + match[0].length;
      }
      text += blockText.slice(cursor);
      blocks.push({ kind: 'prose', text, clozes });
      return;
    }

    const qa = blockText.match(QA);
    if (qa && qa[1] && qa[2]) {
      blocks.push({ kind: 'qa', cardIndex: cardIndex++, prompt: qa[1].trim(), answer: qa[2].trim() });
      return;
    }

    blocks.push({ kind: 'prose', text: blockText, clozes: [] });
  };

  let prose: number[] = [];
  let listItems: string[] = [];

  const flushList = (): void => {
    if (listItems.length === 0) return;
    blocks.push({ kind: 'list', items: listItems });
    listItems = [];
  };

  while (i < lines.length) {
    const rawLine = lines[i] ?? '';

    const fence = rawLine.match(FENCE);
    if (fence) {
      flushProse(prose); prose = []; flushList();
      const marker = fence[1] as string;
      const lang = rawLine.trim().slice(marker.length).trim() || null;
      const content: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i] ?? '')) {
        content.push(lines[i] ?? '');
        i++;
      }
      i++; // consume the closing fence (or run off the end on an unclosed one)
      blocks.push({ kind: 'code', lang, text: content.join('\n') });
      continue;
    }

    const open = rawLine.match(CALLOUT_OPEN);
    if (open && open[1]) {
      flushProse(prose); prose = []; flushList();
      const format = open[1].toLowerCase() as 'mcq' | 'recall';
      const { card, nextIndex } = parseCallout(lines, i, 0, format);
      if (card) {
        const block: RawBlock = card.choices !== undefined
          ? { kind: 'card', cardIndex: cardIndex++, format, prompt: card.prompt, choices: card.choices }
          : card.answer !== undefined
            ? { kind: 'card', cardIndex: cardIndex++, format, prompt: card.prompt, answer: card.answer }
            : { kind: 'card', cardIndex: cardIndex++, format, prompt: card.prompt };
        blocks.push(block);
      }
      i = nextIndex;
      continue;
    }

    if (BARE_ANCHOR.test(rawLine)) { i++; continue; }

    if (HEADING.test(rawLine)) {
      flushProse(prose); prose = []; flushList();
      const { text } = stripAnchor(rawLine);
      const hashes = text.match(/^#{1,6}/)?.[0].length ?? 1;
      blocks.push({ kind: 'heading', level: hashes, text: text.slice(hashes).trim() });
      i++;
      continue;
    }

    if (LIST_ITEM.test(rawLine)) {
      flushProse(prose); prose = [];
      const { text } = stripAnchor(rawLine);
      listItems.push(text.replace(LIST_ITEM, '').trim());
      i++;
      continue;
    }

    if (rawLine.trim() === '' || BLOCKQUOTE.test(rawLine)) {
      flushProse(prose); prose = []; flushList();
      // A blank line closes a block; a non-card blockquote is not reading
      // material this viewer renders, and carries no cards, so it is dropped
      // rather than given a block kind nothing consumes.
      i++;
      continue;
    }

    flushList();
    prose.push(i);
    i++;
  }

  flushProse(prose);
  flushList();
  return blocks;
}
```

Add `RawBlock`, `RawCloze`, `Choice` to the type import at the top of `cards.ts`:

```ts
import type { Choice, ParsedCard, RawBlock, RawCloze } from './types.js';
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx vitest run pipeline/tests/blocks.test.ts && npm run typecheck
```

Expected: all PASS, typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add pipeline/src/types.ts pipeline/src/cards.ts pipeline/tests/blocks.test.ts
git commit -m "feat: emit note bodies as a renderable block stream

The in-app note viewer needs note text, which deck.json does not carry, and
it cannot render raw markdown: card syntax is inline, so a note is literally
an answer key (a mcq callout renders its correct choice as [x]).

parseBlocks walks the same structure as parseCards, in the same order, and
keeps the blocks instead of discarding them. It is a sibling rather than a
refactor of parseCards because that function's bugs orphan card ids, which
is silent rather than loud, and restructuring it for a reading feature is a
bad trade. The shared exported regexes are the coupling.

Card references are ordinals, not ids: parseCards returns id: string | null
and assignIds fills the nulls afterwards, so ids do not exist at this point."
```

---

### Task 2: `buildNotes()` — resolve ordinals to card ids

Zips `parseBlocks` output against the id-assigned cards, and requires the zip to be **total**: every card consumed, every ordinal resolved. That turns the two-walk correlation from an assumption into an assertion on every build of every note.

**Files:**
- Modify: `pipeline/src/build.ts`
- Test: `pipeline/tests/notes-build.test.ts` (create)
- Test: `pipeline/tests/notes-corpus.test.ts` (create)

**Interfaces:**
- Consumes: `parseBlocks(body)` and the types from Task 1; the existing `ParsedNote`, `stableStringify`, `markdownFiles`, `processVault`.
- Produces: `resolveBlocks(blocks: RawBlock[], cards: ParsedCard[], path: string): NoteBlock[]`, `noteTitle(path: string, blocks: NoteBlock[]): string`, `buildNotes(notes: ParsedNote[], bodies: Map<string, string>, now: Date): Notes`, `readExistingNotes(path: string): Notes | null`, `withStableNotesGeneratedAt(next: Notes, existing: Notes | null): Notes`. Task 3 consumes `buildNotes`, `readExistingNotes`, `withStableNotesGeneratedAt`.

- [ ] **Step 1: Carry note bodies out of `processVault`**

`parseNote` in `build.ts` already reads each file and parses its frontmatter, but discards the body. `buildNotes` needs it. Extend `ParseNoteResult` and thread it through rather than re-reading files.

In `pipeline/src/build.ts`, change `ParseNoteResult`:

```ts
export interface ParseNoteResult {
  note: ParsedNote | null;
  updatedSource: string;
  /** The frontmatter-stripped body, kept so `buildNotes` need not re-read the file. */
  body: string;
}
```

and `parseNote`'s two returns:

```ts
export function parseNote(path: string, raw: string, taken: Set<string>): ParseNoteResult {
  const { meta, body, bodyStartLine } = parseFrontmatter(raw);
  if (!meta) return { note: null, updatedSource: raw, body };

  const cards = assignIds(parseCards(body, bodyStartLine), taken);
  const note: ParsedNote = { path, ...meta, cards };
  return { note, updatedSource: writeBackIds(raw, cards), body };
}
```

Then in `processVault`, collect bodies keyed by the note's `path` and return them alongside the notes. Change its return type to `{ notes: ParsedNote[]; bodies: Map<string, string> }`, pushing `bodies.set(note.path, body)` for each non-null note. Update its callers (`cli.ts` is handled in Task 3; any existing test that calls `processVault` must be updated to destructure).

- [ ] **Step 2: Write the failing tests**

Create `pipeline/tests/notes-build.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveBlocks, noteTitle, withStableNotesGeneratedAt } from '../src/build.js';
import { parseBlocks } from '../src/cards.js';
import { parseCards } from '../src/cards.js';
import { assignIds } from '../src/ids.js';
import type { Notes } from '../src/types.js';

const resolve = (body: string) => {
  const cards = assignIds(parseCards(body, 0), new Set<string>());
  return resolveBlocks(parseBlocks(body), cards, 'vault/t.md');
};

describe('resolveBlocks', () => {
  it('resolves a cloze ordinal to the assigned card id', () => {
    const blocks = resolve('MTU is ==1500 bytes==.');
    const block = blocks[0];
    if (block?.kind !== 'prose') throw new Error('expected a prose block');
    expect(block.clozes[0]?.cardId).toMatch(/^card-[a-z0-9]{4}$/);
  });

  it('resolves every construct in walk order to distinct ids', () => {
    const body = ['A ==one== here.', '', 'Q? :: A.'].join('\n');
    const cards = assignIds(parseCards(body, 0), new Set<string>());
    const blocks = resolveBlocks(parseBlocks(body), cards, 'vault/t.md');
    const prose = blocks[0];
    const qa = blocks[1];
    if (prose?.kind !== 'prose' || qa?.kind !== 'qa') throw new Error('unexpected block kinds');
    expect(prose.clozes[0]?.cardId).toBe(cards[0]?.id);
    expect(qa.cardId).toBe(cards[1]?.id);
  });

  it('throws when a block references an ordinal with no card', () => {
    // THE guard. If parseBlocks and parseCards ever disagree about how many
    // constructs a body holds, the build must fail loudly rather than emit
    // a note whose masking silently targets the wrong card.
    expect(() => resolveBlocks(
      [{ kind: 'qa', cardIndex: 3, prompt: 'Q', answer: 'A' }],
      [],
      'vault/t.md'
    )).toThrow(/vault\/t\.md/);
  });

  it('throws when a card is left unconsumed by any block', () => {
    const cards = assignIds(parseCards('Q? :: A.', 0), new Set<string>());
    expect(() => resolveBlocks([], cards, 'vault/t.md')).toThrow(/vault\/t\.md/);
  });
});

describe('noteTitle', () => {
  it('uses the first h1', () => {
    expect(noteTitle('vault/a/consensus.md', [
      { kind: 'prose', text: 'intro', clozes: [] },
      { kind: 'heading', level: 1, text: 'Consensus' }
    ])).toBe('Consensus');
  });

  it('falls back to the filename stem when there is no h1', () => {
    expect(noteTitle('vault/a/two-phase-commit.md', [])).toBe('two-phase-commit');
  });
});

describe('withStableNotesGeneratedAt', () => {
  it('keeps the existing timestamp when note content is unchanged', () => {
    // Without this, CI's deck-drift check (git status --porcelain must print
    // nothing) flaps on every unrelated PR.
    const notes = (generatedAt: string): Notes => ({
      generatedAt,
      notes: [{ path: 'vault/a.md', title: 'A', topic: 't', category: 'c', citations: [], blocks: [] }]
    });
    expect(withStableNotesGeneratedAt(notes('2026-02-02'), notes('2026-01-01')).generatedAt).toBe('2026-01-01');
  });

  it('takes the fresh timestamp when content changed', () => {
    const existing: Notes = { generatedAt: '2026-01-01', notes: [] };
    const next: Notes = {
      generatedAt: '2026-02-02',
      notes: [{ path: 'vault/a.md', title: 'A', topic: 't', category: 'c', citations: [], blocks: [] }]
    };
    expect(withStableNotesGeneratedAt(next, existing).generatedAt).toBe('2026-02-02');
  });
});
```

Create `pipeline/tests/notes-corpus.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { processVault, buildDeck, buildNotes } from '../src/build.js';
import type { NoteBlock } from '../src/types.js';

/** Every card id a block stream references, in walk order. */
function referencedIds(blocks: NoteBlock[]): string[] {
  return blocks.flatMap((block) =>
    block.kind === 'prose' ? block.clozes.map((c) => c.cardId)
    : block.kind === 'qa' || block.kind === 'card' ? [block.cardId]
    : []
  );
}

describe('notes.json over the real vault', () => {
  const { notes: parsed, bodies } = processVault('vault');
  const deck = buildDeck(parsed, new Date());
  const notes = buildNotes(parsed, bodies, new Date());

  it('references every deck card exactly once, and nothing else', () => {
    // THE drift guard. parseBlocks is a sibling of parseCards rather than a
    // refactor of it, so the two walks can diverge silently. This makes any
    // divergence a CI failure instead of a note whose masking targets the
    // wrong card -- or worse, silently reveals a due one.
    const referenced = notes.notes.flatMap((note) => referencedIds(note.blocks));
    const deckIds = deck.cards.map((card) => card.id);

    expect(referenced).toHaveLength(deckIds.length);
    expect(new Set(referenced).size).toBe(referenced.length);
    expect(new Set(referenced)).toEqual(new Set(deckIds));
  });

  it('covers every note the deck was built from', () => {
    expect(new Set(notes.notes.map((n) => n.path)))
      .toEqual(new Set(parsed.map((n) => n.path)));
  });

  it('never leaks a ^card-xxxx anchor into rendered text', () => {
    // Anchors are build metadata. One reaching the viewer is a rendering bug.
    for (const note of notes.notes) {
      for (const block of note.blocks) {
        const text = block.kind === 'prose' ? block.text
          : block.kind === 'heading' ? block.text
          : block.kind === 'qa' ? `${block.prompt} ${block.answer}`
          : block.kind === 'card' ? block.prompt
          : '';
        expect(text).not.toMatch(/\^card-/);
      }
    }
  });

  it('is deterministic across two builds', () => {
    const again = buildNotes(processVault('vault').notes, processVault('vault').bodies, new Date());
    expect(JSON.stringify(again.notes)).toBe(JSON.stringify(notes.notes));
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

```bash
npx vitest run pipeline/tests/notes-build.test.ts pipeline/tests/notes-corpus.test.ts
```

Expected: FAIL — `resolveBlocks`/`buildNotes`/`noteTitle` are not exported.

- [ ] **Step 4: Implement**

Append to `pipeline/src/build.ts`:

```ts
/**
 * Replaces each block's `cardIndex` ordinal with the id `assignIds` gave
 * the card at that position.
 *
 * The zip must be TOTAL: every ordinal resolves and every card is consumed.
 * `parseBlocks` and `parseCards` walk the same structure in the same order,
 * and this is where that claim is checked -- on every build of every note,
 * not only in the corpus test. A silent mismatch would mask the wrong card,
 * or reveal a due one, so it throws instead.
 */
export function resolveBlocks(blocks: RawBlock[], cards: ParsedCard[], path: string): NoteBlock[] {
  const consumed = new Set<number>();

  const idFor = (index: number): string => {
    const card = cards[index];
    if (!card?.id) {
      throw new Error(
        `${path}: block references card ordinal ${index}, but parseCards produced ${cards.length} card(s). ` +
        'parseBlocks and parseCards have drifted.'
      );
    }
    consumed.add(index);
    return card.id;
  };

  const resolved: NoteBlock[] = blocks.map((block) => {
    if (block.kind === 'prose') {
      return {
        kind: 'prose',
        text: block.text,
        clozes: block.clozes.map(({ start, end, answer, cardIndex }) => ({
          start, end, answer, cardId: idFor(cardIndex)
        }))
      };
    }
    if (block.kind === 'qa') {
      return { kind: 'qa', cardId: idFor(block.cardIndex), prompt: block.prompt, answer: block.answer };
    }
    if (block.kind === 'card') {
      const base = { kind: 'card' as const, cardId: idFor(block.cardIndex), format: block.format, prompt: block.prompt };
      if (block.choices !== undefined) return { ...base, choices: block.choices };
      if (block.answer !== undefined) return { ...base, answer: block.answer };
      return base;
    }
    return block;
  });

  if (consumed.size !== cards.length) {
    const missing = cards.map((_, i) => i).filter((i) => !consumed.has(i));
    throw new Error(
      `${path}: ${missing.length} card(s) produced by parseCards are referenced by no block ` +
      `(ordinals ${missing.join(', ')}). parseBlocks and parseCards have drifted.`
    );
  }

  return resolved;
}

/** First h1 if the note has one, else the filename stem. */
export function noteTitle(path: string, blocks: NoteBlock[]): string {
  const h1 = blocks.find((block) => block.kind === 'heading' && block.level === 1);
  if (h1 && h1.kind === 'heading' && h1.text !== '') return h1.text;
  return (path.split('/').pop() ?? path).replace(/\.md$/, '');
}

export function buildNotes(notes: ParsedNote[], bodies: Map<string, string>, now: Date): Notes {
  const docs: NoteDoc[] = notes.map((note) => {
    const body = bodies.get(note.path);
    if (body === undefined) throw new Error(`No body captured for ${note.path}`);
    const blocks = resolveBlocks(parseBlocks(body), note.cards, note.path);
    return {
      path: note.path,
      title: noteTitle(note.path, blocks),
      topic: note.topic,
      category: note.category,
      citations: note.citations,
      blocks
    };
  });

  // Sorted by path so output order never depends on directory traversal.
  docs.sort((a, b) => a.path.localeCompare(b.path));
  return { generatedAt: now.toISOString(), notes: docs };
}

/** Same contract as `readExistingDeck`: anything unreadable or malformed rebuilds fresh. */
export function readExistingNotes(path: string): Notes | null {
  let raw: string;
  try { raw = readFileSync(path, 'utf8'); } catch { return null; }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch {
    console.warn(`${path} exists but is not valid JSON; rebuilding fresh`);
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const candidate = parsed as { generatedAt?: unknown; notes?: unknown };
  if (typeof candidate.generatedAt !== 'string') return null;
  if (!Array.isArray(candidate.notes)) return null;
  return parsed as Notes;
}

/**
 * The notes.json counterpart of `withStableGeneratedAt`. Same reason: CI
 * gates PRs on `git status --porcelain` printing nothing after a rebuild,
 * so a timestamp that churns on every run fails unrelated PRs.
 */
export function withStableNotesGeneratedAt(next: Notes, existing: Notes | null): Notes {
  if (existing && stableStringify(existing.notes) === stableStringify(next.notes)) {
    return { ...next, generatedAt: existing.generatedAt };
  }
  return next;
}
```

Extend the imports at the top of `build.ts`:

```ts
import { parseCards, parseBlocks } from './cards.js';
import type { Deck, DeckCard, Notes, NoteBlock, NoteDoc, ParsedCard, ParsedNote, RawBlock } from './types.js';
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx vitest run pipeline/ && npm run typecheck
```

Expected: all PASS. If the corpus test fails on the real vault, that is a genuine `parseBlocks`/`parseCards` disagreement — fix `parseBlocks` to match `parseCards`'s walk, never the test to match the bug.

- [ ] **Step 6: Commit**

```bash
git add pipeline/src/build.ts pipeline/tests/notes-build.test.ts pipeline/tests/notes-corpus.test.ts
git commit -m "feat: resolve note block ordinals to assigned card ids

parseBlocks emits ordinals because assignIds has not run when it is called.
resolveBlocks zips real ids in afterwards, and requires the zip to be total
-- every ordinal resolves, every card is consumed -- so the claim that the
two walks agree is asserted on every build of every note rather than only
in the corpus test.

That matters because the failure is silent otherwise: a mismatch would mask
the wrong construct, or reveal one whose card is due, and the viewer would
look entirely correct while doing it.

The corpus test adds the deck-wide version: every card referenced exactly
once, no unknown ids, no ^card anchors leaking into rendered text."
```

---

### Task 3: Emit `deck/notes.json` from the CLI

**Files:**
- Modify: `pipeline/src/cli.ts`
- Modify: `package.json` (`build:deck`, `predev`, `prebuild:app`)
- Modify: `.gitignore` — check whether `app/public/deck.json` is ignored; `app/public/notes.json` must be treated identically
- Create (generated, committed): `deck/notes.json`

**Interfaces:**
- Consumes: `buildNotes`, `readExistingNotes`, `withStableNotesGeneratedAt` from Task 2.
- Produces: `deck/notes.json` at a stable path, and `app/public/notes.json` during dev/build.

- [ ] **Step 1: Take a second output path in the CLI**

Rewrite `pipeline/src/cli.ts`:

```ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  buildDeck, buildNotes, processVault,
  readExistingDeck, readExistingNotes,
  withStableGeneratedAt, withStableNotesGeneratedAt
} from './build.js';

function main(): void {
  const [vaultDir, outFile, notesOutFile] = process.argv.slice(2);
  if (!vaultDir || !outFile || !notesOutFile) {
    console.error('usage: build:deck <vaultDir> <deckOutFile> <notesOutFile>');
    process.exit(2);
  }

  const now = new Date();
  const { notes: parsed, bodies } = processVault(vaultDir);

  const deck = withStableGeneratedAt(buildDeck(parsed, now), readExistingDeck(outFile));
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(deck, null, 2)}\n`, 'utf8');

  // Written second and separately: notes.json is a reading surface, and a
  // failure to produce it must never leave a half-written deck behind.
  const notes = withStableNotesGeneratedAt(buildNotes(parsed, bodies, now), readExistingNotes(notesOutFile));
  mkdirSync(dirname(notesOutFile), { recursive: true });
  writeFileSync(notesOutFile, `${JSON.stringify(notes, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${deck.cards.length} cards and ${notes.notes.length} notes from ${parsed.length} notes`);
}

main();
```

- [ ] **Step 2: Wire the npm scripts**

In `package.json`, update all three. **Both `predev` and `prebuild:app` need the new copy line** — forgetting one produces a dev server where notes 404 while the built app works, or the reverse.

```json
"build:deck": "tsx pipeline/src/cli.ts vault deck/deck.json deck/notes.json",
"predev": "cp deck/deck.json app/public/deck.json && cp deck/notes.json app/public/notes.json",
"prebuild:app": "cp deck/deck.json app/public/deck.json && cp deck/notes.json app/public/notes.json",
```

- [ ] **Step 3: Generate and inspect the output**

```bash
npm run build:deck
ls -la deck/notes.json
gzip -c deck/notes.json | wc -c
```

Expected: `deck/notes.json` exists; gzipped size in the region of 270 KB. If it is dramatically larger than `deck.json`'s 205 KB gzipped, stop and investigate before committing — something is duplicating content.

- [ ] **Step 4: Verify determinism**

```bash
npm run build:deck && git status --porcelain
```

Expected: **no output**. A second build with no vault change must produce byte-identical files. If `notes.json` shows as modified, `withStableNotesGeneratedAt` is not matching — fix it before proceeding, because CI gates every PR on exactly this check.

- [ ] **Step 5: Confirm gitignore handling**

```bash
git check-ignore -v app/public/deck.json app/public/notes.json
```

Both must be treated the same way. If `app/public/deck.json` is ignored, add `app/public/notes.json` to `.gitignore` alongside it.

- [ ] **Step 6: Commit**

```bash
git add pipeline/src/cli.ts package.json deck/notes.json .gitignore
git commit -m "feat: emit deck/notes.json alongside deck.json

Kept as a separate output rather than a field on deck.json. deck.json is
fetched network-first with a 2.5s timeout (sw.ts), so doubling its size
makes that timeout fire more often on cellular and the app falls back to
cache at review start. Reading material must not slow the core loop in the
sessions that never open a note.

Both predev and prebuild:app copy it into app/public -- missing one gives a
dev server where notes 404 while the built app works."
```

---

### Task 4: Serve and load `notes.json`

Service-worker caching plus the app-side loader: fetched lazily, memoized for the session, prefetched once the dashboard is up, and explicitly absent rather than hanging when offline without a cached copy.

**Files:**
- Modify: `app/src/sw-routing.ts`
- Modify: `app/tests/sw-routing.test.ts`
- Create: `app/src/db/notes.ts`
- Test: `app/tests/notes-load.test.ts` (create)

**Interfaces:**
- Consumes: the `Notes` / `NoteDoc` types from `pipeline/src/types.ts` (the app already imports `Deck` from there).
- Produces: `loadNotes(): Promise<Notes | null>`, `findNote(notes: Notes, path: string): NoteDoc | null`, `prefetchNotes(): void`, `resetNotesCache(): void` (test seam). Tasks 7–9 consume these.

- [ ] **Step 1: Write the failing SW routing test**

Add to `app/tests/sw-routing.test.ts`, inside the existing `describe('strategyFor')`:

```ts
it('keeps notes.json network-first, for the same reason as deck.json', () => {
  // Stable URL, changing content: a rebuilt vault must reach the client.
  expect(strategyFor(`${BASE}/notes.json`)).toBe('network-first');
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run app/tests/sw-routing.test.ts
```

Expected: FAIL — receives `'cache-first'`.

- [ ] **Step 3: Add the routing rule**

In `app/src/sw-routing.ts`, directly below the `deck.json` line:

```ts
  if (pathname.endsWith('/deck.json')) return 'network-first';
  // Same contract as deck.json: one stable URL whose content changes
  // whenever the vault is rebuilt.
  if (pathname.endsWith('/notes.json')) return 'network-first';
```

- [ ] **Step 4: Write the failing loader tests**

Create `app/tests/notes-load.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { loadNotes, findNote, resetNotesCache } from '../src/db/notes.js';
import type { Notes } from '../../pipeline/src/types.js';

const sample: Notes = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  notes: [{
    path: 'vault/a/consensus.md', title: 'Consensus',
    topic: 'db', category: 'db', citations: [],
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
```

- [ ] **Step 5: Run it to verify it fails**

```bash
npx vitest run app/tests/notes-load.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 6: Implement the loader**

Create `app/src/db/notes.ts`:

```ts
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
  // onto one request rather than fetching ~1MB twice.
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
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
npx vitest run app/tests/notes-load.test.ts app/tests/sw-routing.test.ts && npm run typecheck
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add app/src/sw-routing.ts app/tests/sw-routing.test.ts app/src/db/notes.ts app/tests/notes-load.test.ts
git commit -m "feat: fetch and cache notes.json outside IndexedDB

Notes carry no per-session state -- no review state to join, no tombstoning
across rebuilds -- so unlike the deck they need no object store. A module
memo plus the service worker's network-first cache is the whole persistence
story, which means openDb stays at version 1. IndexedDB holds the one
irreplaceable thing in this app, and a reading feature should not migrate it.

A failed fetch resolves to null rather than throwing, and is deliberately
not memoized: a fresh install that went offline before idling has no cached
copy, and the next open should retry rather than stay broken for the session."
```

---

### Task 5: `maskState` — the masking rule

The spec's entire masking policy as one pure function, testable without a DOM.

**Files:**
- Create: `app/src/ui/note-mask.ts`
- Test: `app/tests/note-mask.test.ts` (create)

**Interfaces:**
- Consumes: `isDue` from `app/src/scheduler/fsrs.ts`; `ReviewState` from `app/src/db/schema.ts`; `NoteBlock`/`NoteDoc` from `pipeline/src/types.ts`.
- Produces: `maskedCardIds(note: NoteDoc, reviews: Map<string, ReviewState>, now: Date, arrivedFrom: string | null): Set<string>`. Tasks 6 and 8 consume it.

- [ ] **Step 1: Write the failing tests**

Create `app/tests/note-mask.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { maskedCardIds } from '../src/ui/note-mask.js';
import type { ReviewState } from '../src/db/schema.js';
import type { NoteDoc } from '../../pipeline/src/types.js';

const state = (cardId: string, due: number, extra: Partial<ReviewState> = {}): ReviewState => ({
  cardId, due, stability: 1, difficulty: 5, elapsedDays: 0, scheduledDays: 1,
  reps: 1, lapses: 0, state: 2, lastReview: due - 86_400_000,
  suspended: false, flagged: false, ...extra
});

const NOW = new Date('2026-09-20T12:00:00Z');
const PAST = NOW.getTime() - 86_400_000;
const FUTURE = NOW.getTime() + 86_400_000;

const note: NoteDoc = {
  path: 'vault/a.md', title: 'A', topic: 't', category: 'c', citations: [],
  blocks: [
    { kind: 'prose', text: 'x', clozes: [{ start: 0, end: 1, cardId: 'card-due', answer: 'x' }] },
    { kind: 'qa', cardId: 'card-new', prompt: 'Q', answer: 'A' },
    { kind: 'card', cardId: 'card-fresh', format: 'recall', prompt: 'P' }
  ]
};

describe('maskedCardIds', () => {
  it('masks a card that is due', () => {
    const reviews = new Map([['card-due', state('card-due', PAST)]]);
    expect(maskedCardIds(note, reviews, NOW, null).has('card-due')).toBe(true);
  });

  it('does not mask a new card', () => {
    // THE decision. Masking protects a pending test; a card never asked has
    // none, and the note is the material you would learn it from. Masking
    // new cards would leave a freshly written note 100% blurred on exactly
    // the day you most want to read it.
    expect(maskedCardIds(note, new Map(), NOW, null).has('card-new')).toBe(false);
  });

  it('does not mask a card inside its retention window', () => {
    const reviews = new Map([['card-fresh', state('card-fresh', FUTURE)]]);
    expect(maskedCardIds(note, reviews, NOW, null).has('card-fresh')).toBe(false);
  });

  it('never masks the card you arrived from, though it is due', () => {
    // You just answered it in review. There is nothing left to protect.
    const reviews = new Map([['card-due', state('card-due', PAST)]]);
    expect(maskedCardIds(note, reviews, NOW, 'card-due').has('card-due')).toBe(false);
  });

  it('still masks other due cards when arriving from one of them', () => {
    const reviews = new Map([
      ['card-due', state('card-due', PAST)],
      ['card-fresh', state('card-fresh', PAST)]
    ]);
    const masked = maskedCardIds(note, reviews, NOW, 'card-due');
    expect(masked.has('card-due')).toBe(false);
    expect(masked.has('card-fresh')).toBe(true);
  });

  it('does not mask a suspended card', () => {
    // A suspended card is not going to be asked, so there is no test to
    // protect -- matching how summarizeTopics skips them.
    const reviews = new Map([['card-due', state('card-due', PAST, { suspended: true })]]);
    expect(maskedCardIds(note, reviews, NOW, null).has('card-due')).toBe(false);
  });

  it('ignores an arrivedFrom id that is not in this note', () => {
    const reviews = new Map([['card-due', state('card-due', PAST)]]);
    expect(maskedCardIds(note, reviews, NOW, 'card-elsewhere').has('card-due')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run app/tests/note-mask.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/ui/note-mask.ts`:

```ts
import type { ReviewState } from '../db/schema.js';
import type { NoteBlock, NoteDoc } from '../../../pipeline/src/types.js';
import { isDue } from '../scheduler/fsrs.js';

/** Every card id this block stream references, in walk order. */
export function blockCardIds(blocks: NoteBlock[]): string[] {
  return blocks.flatMap((block) =>
    block.kind === 'prose' ? block.clozes.map((c) => c.cardId)
    : block.kind === 'qa' || block.kind === 'card' ? [block.cardId]
    : []
  );
}

/**
 * Which of this note's cards render masked.
 *
 * MASK IFF DUE. New cards stay visible: masking protects a pending test,
 * and a card never asked has none. The note is the source material you
 * would learn it from, so reading before a first review is studying, which
 * is the normal order of operations. Masking new cards would invert the
 * property that makes this worth building -- a freshly written note would
 * be fully blurred on the day you most want to read it.
 *
 * `arrivedFrom` is the card you opened the note from in review. It is by
 * definition due, and is deliberately exempt: you just answered it, so
 * there is nothing left to protect.
 *
 * Due-ness comes from `isDue`, never re-derived -- there must not be a
 * second notion of "due" in this app.
 */
export function maskedCardIds(
  note: NoteDoc,
  reviews: Map<string, ReviewState>,
  now: Date,
  arrivedFrom: string | null
): Set<string> {
  const masked = new Set<string>();
  for (const cardId of blockCardIds(note.blocks)) {
    if (cardId === arrivedFrom) continue;
    const state = reviews.get(cardId);
    if (!state) continue;          // new: nothing to protect
    if (state.suspended) continue; // never going to be asked
    if (isDue(state, now)) masked.add(cardId);
  }
  return masked;
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npx vitest run app/tests/note-mask.test.ts && npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/ui/note-mask.ts app/tests/note-mask.test.ts
git commit -m "feat: add the schedule-aware note masking rule

Mask iff due. New cards stay visible, which is the decision the whole
feature turns on: masking protects a pending test, and a card never asked
has none. Masking new cards too would leave a freshly authored note fully
blurred on the day it is most worth reading, and make notes go unreadable
to readable as you master them, when the useful direction is readable to
self-test to readable.

The card you arrived from is exempt despite being due -- you just answered
it in review. Suspended cards are exempt for the same reason summarizeTopics
skips them: they are not going to be asked.

isDue is reused, never re-derived; a second notion of due in this app would
be a bug generator."
```

---

### Task 6: `renderNoteBlocks` — the block renderer

Turns a block stream plus a masked set into HTML. Pure, string-in/string-out, no DOM, so it tests under `node`.

**Files:**
- Create: `app/src/ui/note-render.ts`
- Create: `app/src/styles/note.css`; add one `@import './styles/note.css';` line to the `app/src/styles.css` manifest
- Test: `app/tests/note-render.test.ts` (create)

**Interfaces:**
- Consumes: `escapeHtml` and the inline markup function from `app/src/ui/renderers.ts` (read that file for the exported name — it must run **after** `escapeHtml`); `NoteBlock` from `pipeline/src/types.ts`.
- Produces: `renderNoteBlocks(blocks: NoteBlock[], masked: ReadonlySet<string>): string`. Task 8 consumes it.

- [ ] **Step 1: Write the failing tests**

Create `app/tests/note-render.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderNoteBlocks } from '../src/ui/note-render.js';
import type { NoteBlock } from '../../pipeline/src/types.js';

const render = (blocks: NoteBlock[], masked: string[] = []) =>
  renderNoteBlocks(blocks, new Set(masked));

describe('renderNoteBlocks', () => {
  it('renders a heading at its level', () => {
    expect(render([{ kind: 'heading', level: 2, text: 'Raft' }])).toContain('<h2');
  });

  it('renders an unmasked cloze as plain text', () => {
    const html = render([
      { kind: 'prose', text: 'MTU is 1500 bytes.', clozes: [{ start: 7, end: 17, cardId: 'c1', answer: '1500 bytes' }] }
    ]);
    expect(html).toContain('1500 bytes');
    expect(html).not.toContain('is-masked');
  });

  it('marks a masked cloze and keeps its text in the document', () => {
    // Blur rather than blank: the span keeps its width, so revealing it
    // reflows nothing and reading flow survives the tap.
    const html = render([
      { kind: 'prose', text: 'MTU is 1500 bytes.', clozes: [{ start: 7, end: 17, cardId: 'c1', answer: '1500 bytes' }] }
    ], ['c1']);
    expect(html).toContain('is-masked');
    expect(html).toContain('data-card="c1"');
    expect(html).toContain('1500 bytes');
  });

  it('renders multiple clozes in one block without corrupting offsets', () => {
    const html = render([
      { kind: 'prose', text: 'A one and two here.', clozes: [
        { start: 2, end: 5, cardId: 'c1', answer: 'one' },
        { start: 10, end: 13, cardId: 'c2', answer: 'two' }
      ] }
    ], ['c2']);
    // Every cloze gets a data-card span whether or not it is masked; the
    // mask signal is the class. Task 8 scrolls to the arrived-from card via
    // [data-card], and that card is always UNMASKED by design, so it must
    // still be locatable.
    expect(html).toContain('is-masked');
    expect(html.match(/data-card/g)).toHaveLength(2);
    expect(html).toMatch(/A one and .*two.* here\./s);
  });

  it('hides the correct-choice marking on a masked mcq', () => {
    // THE spoiler case. Obsidian renders the raw `- [x]`, so the answer key
    // is visible there today; this must not reproduce that.
    const block: NoteBlock = {
      kind: 'card', cardId: 'c1', format: 'mcq', prompt: 'Which layer?',
      choices: [{ text: 'Transport', correct: true }, { text: 'Network', correct: false }]
    };
    const masked = render([block], ['c1']);
    expect(masked).toContain('Which layer?');
    expect(masked).toContain('Transport');
    expect(masked).not.toContain('is-correct');

    const open = render([block]);
    expect(open).toContain('is-correct');
  });

  it('masks a qa answer but never its prompt', () => {
    const block: NoteBlock = { kind: 'qa', cardId: 'c1', prompt: 'What is X?', answer: 'It is Y.' };
    const html = render([block], ['c1']);
    expect(html).toContain('What is X?');
    expect(html).toContain('is-masked');
  });

  it('masks a recall model answer but never its prompt', () => {
    const block: NoteBlock = { kind: 'card', cardId: 'c1', format: 'recall', prompt: 'Explain X.', answer: 'Because Y.' };
    const html = render([block], ['c1']);
    expect(html).toContain('Explain X.');
    expect(html).toContain('is-masked');
  });

  it('escapes html in prose', () => {
    const html = render([{ kind: 'prose', text: 'a <script>alert(1)</script> b', clozes: [] }]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes html in code fences', () => {
    // The sharpest escaping case: fence content is dense in < and &, and it
    // must never pass through the inline markup layer either -- backticks
    // and asterisks inside code are code.
    const html = render([{ kind: 'code', lang: 'ts', text: 'if (a < b && c) { x("**y**") }' }]);
    expect(html).not.toContain('<b');
    expect(html).toContain('&lt; b &amp;&amp; c');
    expect(html).toContain('**y**');
    expect(html).not.toContain('<strong>');
  });

  it('escapes html in choices and headings', () => {
    const html = render([
      { kind: 'heading', level: 1, text: '<img onerror=x>' },
      { kind: 'card', cardId: 'c1', format: 'mcq', prompt: 'p', choices: [{ text: '<b>', correct: true }] }
    ]);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
  });

  it('applies inline markup to prose', () => {
    const html = render([{ kind: 'prose', text: 'a `code` and **bold**', clozes: [] }]);
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<strong>bold</strong>');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run app/tests/note-render.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

The inline-markup function is `inlineMarkup` (`app/src/ui/renderers.ts:52`), documented there as "Must run AFTER escapeHtml — it never escapes anything itself."

Create `app/src/ui/note-render.ts`:

```ts
import type { NoteBlock } from '../../../pipeline/src/types.js';
import { escapeHtml, inlineMarkup } from './renderers.js';

/**
 * Escape, then apply inline markup. Never the other way round: the inline
 * layer wraps spans in tags and escapes nothing itself, so running it first
 * would reintroduce an injection path. See renderers.ts's own contract.
 */
function text(value: string): string {
  return inlineMarkup(escapeHtml(value));
}

function maskAttr(cardId: string, masked: boolean): string {
  return `data-card="${escapeHtml(cardId)}"${masked ? ' class="is-masked"' : ''}`;
}

/**
 * Renders prose with its cloze spans wrapped, walking the clozes in offset
 * order and slicing between them. Offsets index the block's joined text, so
 * they are applied to the RAW string and each piece is escaped afterwards --
 * escaping first would shift every offset past the first `<` or `&`.
 */
function renderProse(block: Extract<NoteBlock, { kind: 'prose' }>, masked: ReadonlySet<string>): string {
  const ordered = [...block.clozes].sort((a, b) => a.start - b.start);
  let cursor = 0;
  let html = '';
  for (const cloze of ordered) {
    html += text(block.text.slice(cursor, cloze.start));
    const inner = block.text.slice(cloze.start, cloze.end);
    // Unconditional: Task 8 locates the arrived-from card via [data-card] to
    // scroll and highlight it, and that card is always unmasked, so the span
    // cannot be conditional on masking. "Show all" also reveals by removing
    // `is-masked` in place, which needs the span to persist.
    html += `<span ${maskAttr(cloze.cardId, masked.has(cloze.cardId))}>${text(inner)}</span>`;
    cursor = cloze.end;
  }
  html += text(block.text.slice(cursor));
  return `<p class="note-prose">${html}</p>`;
}

export function renderNoteBlocks(blocks: NoteBlock[], masked: ReadonlySet<string>): string {
  return blocks.map((block) => {
    if (block.kind === 'heading') {
      const level = Math.min(Math.max(block.level, 1), 6);
      return `<h${level} class="note-heading">${text(block.text)}</h${level}>`;
    }

    if (block.kind === 'code') {
      // Escaped only -- never inline markup. Backticks and asterisks inside
      // a code fence are code, not formatting.
      return `<pre class="note-code"><code>${escapeHtml(block.text)}</code></pre>`;
    }

    if (block.kind === 'list') {
      return `<ul class="note-list">${block.items.map((item) => `<li>${text(item)}</li>`).join('')}</ul>`;
    }

    if (block.kind === 'prose') return renderProse(block, masked);

    if (block.kind === 'qa') {
      const hidden = masked.has(block.cardId);
      return `<div class="note-card note-qa">`
        + `<p class="note-card-prompt">${text(block.prompt)}</p>`
        + `<p class="note-card-answer" ${maskAttr(block.cardId, hidden)}>${text(block.answer)}</p>`
        + `</div>`;
    }

    // block.kind === 'card'
    const hidden = masked.has(block.cardId);
    const head = `<p class="note-card-prompt">${text(block.prompt)}</p>`;

    if (block.choices) {
      // While masked, correctness is not rendered AT ALL -- not rendered and
      // hidden with CSS, which a view-source or a copied selection defeats.
      const items = block.choices.map((choice) => {
        const correct = !hidden && choice.correct ? ' is-correct' : '';
        return `<li class="note-choice${correct}">${text(choice.text)}</li>`;
      }).join('');
      return `<div class="note-card note-mcq" ${maskAttr(block.cardId, hidden)}>`
        + `${head}<ul class="note-choices">${items}</ul></div>`;
    }

    const answer = block.answer !== undefined
      ? `<p class="note-card-answer" ${maskAttr(block.cardId, hidden)}>${text(block.answer)}</p>`
      : '';
    return `<div class="note-card note-recall">${head}${answer}</div>`;
  }).join('');
}
```

- [ ] **Step 4: Add the masking styles**

Put this in `app/src/styles/note.css` (NOT `styles.css`, which is an @import manifest), using the existing token scale (`--s*`, `--r-*`, `--text-*`) rather than raw numbers:

```css
/* A masked span keeps its width so revealing it reflows nothing --
   reading flow has to survive the tap. */
.is-masked {
  filter: blur(6px);
  cursor: pointer;
  border-radius: var(--r-sm);
  transition: filter 120ms ease-out;
}
.is-masked:hover { filter: blur(4px); }
.is-revealed { filter: none; }

@media (prefers-reduced-motion: reduce) {
  .is-masked { transition: none; }
}
```

- [ ] **Step 5: Run to verify it passes**

```bash
npx vitest run app/tests/note-render.test.ts && npm run typecheck
```

Expected: PASS. If the mcq test fails because `is-correct` appears while masked, the renderer is emitting correctness and hiding it in CSS — fix the renderer, not the test.

- [ ] **Step 6: Commit**

```bash
git add app/src/ui/note-render.ts app/tests/note-render.test.ts app/src/styles/note.css app/src/styles.css
git commit -m "feat: render note blocks with masked constructs

Correctness on a masked mcq is not rendered at all, rather than rendered and
hidden with CSS -- the latter is defeated by view-source or a copied
selection, and this exists precisely to not show the answer key that
Obsidian shows today.

Cloze offsets index the raw joined text, so slicing happens BEFORE escaping
and each piece is escaped afterwards; escaping first would shift every
offset past the first < or &. Code fences are escaped only and never pass
through the inline markup layer, since backticks and asterisks inside a
fence are code."
```

---

### Task 7: The `#note/` route

**Files:**
- Modify: `app/src/route.ts`
- Test: `app/tests/route.test.ts`

**Interfaces:**
- Consumes: the existing `RouteDecision` union and `DashboardState`.
- Produces: `NOTE_PREFIX`, `noteHash(path: string, cardId?: string): string`, and a `{ kind: 'note'; path: string; cardId: string | null }` member of `RouteDecision`. Task 8 consumes both.

- [ ] **Step 1: Write the failing tests**

Add to `app/tests/route.test.ts`:

```ts
import { decideRoute, focusHash, noteHash, type DashboardState } from '../src/route.js';

describe('#note routing', () => {
  const s = () => state([], []);

  it('routes a note hash to the note screen', () => {
    expect(decideRoute(noteHash('vault/db/consensus.md'), s()))
      .toEqual({ kind: 'note', path: 'vault/db/consensus.md', cardId: null });
  });

  it('carries an arrived-from card id', () => {
    expect(decideRoute(noteHash('vault/db/consensus.md', 'card-ubdh'), s()))
      .toEqual({ kind: 'note', path: 'vault/db/consensus.md', cardId: 'card-ubdh' });
  });

  it('splits on the LAST segment, since vault paths contain slashes', () => {
    // THE parsing hazard: 'vault/aws/iam/conditions.md' has three slashes
    // of its own, so the card id must be taken from the end, not the start.
    expect(decideRoute('#note/vault%2Faws%2Fiam%2Fconditions.md/card-ab12', s()))
      .toEqual({ kind: 'note', path: 'vault/aws/iam/conditions.md', cardId: 'card-ab12' });
  });

  it('treats a trailing segment that is not a card id as part of nothing', () => {
    // Only ^card-[a-z0-9]{4} is a card id. Anything else is not one, and the
    // whole remainder is the path.
    expect(decideRoute('#note/vault%2Fa.md', s()))
      .toEqual({ kind: 'note', path: 'vault/a.md', cardId: null });
  });

  it('falls back to the dashboard on a bare #note/', () => {
    expect(decideRoute('#note/', s())).toEqual({ kind: 'dashboard' });
  });

  it('falls back to the dashboard on a malformed percent-escape', () => {
    // decodeURIComponent throws a URIError on input like %E0%A4%A, and a
    // hash is plain client state that can arrive hand-edited.
    expect(decideRoute('#note/%E0%A4%A', s())).toEqual({ kind: 'dashboard' });
  });
});

describe('noteHash', () => {
  it('round-trips a path containing slashes', () => {
    const hash = noteHash('vault/aws/iam/conditions.md');
    expect(decideRoute(hash, state([], []))).toEqual({
      kind: 'note', path: 'vault/aws/iam/conditions.md', cardId: null
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run app/tests/route.test.ts
```

Expected: FAIL — `noteHash` is not exported.

- [ ] **Step 3: Implement**

In `app/src/route.ts`, add to the `RouteDecision` union:

```ts
  | { kind: 'note'; path: string; cardId: string | null }
```

and below `FOCUS_PREFIX`:

```ts
export const NOTE_PREFIX = '#note/';

/** Card ids are always exactly this shape, which is what makes the split unambiguous. */
const CARD_ID = /^card-[a-z0-9]{4}$/;

/**
 * Builds the hash for the note viewer. The optional arrived-from card is
 * appended as a trailing segment rather than a leading one: vault paths
 * contain `/` themselves, so only the card id can safely be the last
 * segment.
 */
export function noteHash(path: string, cardId?: string): string {
  const base = `${NOTE_PREFIX}${encodeURIComponent(path)}`;
  return cardId ? `${base}/${cardId}` : base;
}

/**
 * Decodes a `#note/...` hash. Returns null for a bare prefix, an empty
 * path, and a malformed percent-escape -- decodeURIComponent throws a
 * URIError on input like `%E0%A4%A`, and a hash is plain client state that
 * arrives hand-edited, from stale history, and from bookmarks.
 */
function noteTarget(hash: string): { path: string; cardId: string | null } | null {
  const raw = hash.slice(NOTE_PREFIX.length);
  if (raw === '') return null;

  const slash = raw.lastIndexOf('/');
  const trailing = slash >= 0 ? raw.slice(slash + 1) : '';
  const hasCard = CARD_ID.test(trailing);
  const encodedPath = hasCard ? raw.slice(0, slash) : raw;
  if (encodedPath === '') return null;

  try {
    const path = decodeURIComponent(encodedPath);
    if (path === '') return null;
    return { path, cardId: hasCard ? trailing : null };
  } catch {
    return null;
  }
}
```

and in `decideRoute`, before the `#topics` check:

```ts
  // Not validated against the deck here, unlike focus: the note set lives in
  // notes.json, which is fetched lazily and may not be loaded yet. The
  // viewer resolves the path itself and renders a not-found state, which it
  // needs anyway for a note deleted since the hash was bookmarked.
  if (hash.startsWith(NOTE_PREFIX)) {
    const target = noteTarget(hash);
    if (target) return { kind: 'note', path: target.path, cardId: target.cardId };
    return { kind: 'dashboard' };
  }
```

- [ ] **Step 4: Run to verify it passes**

```bash
npx vitest run app/tests/route.test.ts && npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/route.ts app/tests/route.test.ts
git commit -m "feat: route #note/<path>[/<card-id>] to the note viewer

The arrived-from card rides as a TRAILING segment because vault paths
contain slashes themselves -- vault/aws/iam/conditions.md has three -- so
only the last segment can be split off unambiguously. Card ids are always
^card-[a-z0-9]{4}, which is what makes that test safe.

Unlike #focus, the target is not validated against loaded data: notes.json
is fetched lazily and may not be present yet. The viewer resolves the path
and renders not-found, which it needs regardless for a note deleted since
the hash was bookmarked."
```

---

### Task 8: The viewer screen

**Files:**
- Create: `app/src/ui/note.ts`
- Modify: `app/src/main.ts`
- Modify: `app/src/styles/note.css` (created in Task 6 — append; the `@import` line already exists)
- Test: `app/tests/note-view.test.ts` (create)

**Interfaces:**
- Consumes: `renderNoteBlocks` (Task 6), `maskedCardIds` and `blockCardIds` (Task 5), `loadNotes`/`findNote` (Task 4), `NOTE_PREFIX`/`noteHash` (Task 7), `obsidianUrl` from `app/src/ui/obsidian.ts`, `loadReviews` from `app/src/db/reviews.ts`.
- Produces: `renderNote(root: HTMLElement, props: NoteProps): void` and `maskedSummary(count: number): string | null`. Tasks 9 and 10 link to this screen via `noteHash`.

- [ ] **Step 1: Write the failing test**

`renderNote` touches the DOM, so — following how `renderTopics` is structured as a dumb renderer with all decisions arriving as props — test only the pure helper here. The rendering itself is verified in the browser at Step 6.

Create `app/tests/note-view.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run app/tests/note-view.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the viewer**

Create `app/src/ui/note.ts`:

```ts
import type { NoteDoc } from '../../../pipeline/src/types.js';
import { renderNoteBlocks } from './note-render.js';
import { escapeHtml } from './renderers.js';

export interface NoteProps {
  /** null when notes.json could not be loaded; absent from it when the path is unknown. */
  note: NoteDoc | null;
  available: boolean;
  masked: Set<string>;
  /** Scrolled to and highlighted on open. */
  arrivedFrom: string | null;
  obsidianHref: string | null;
  onBack: () => void;
}

/** Header copy for the reveal-all control, or null when nothing is masked. */
export function maskedSummary(count: number): string | null {
  if (count === 0) return null;
  return `${count} answer${count === 1 ? '' : 's'} hidden`;
}

/**
 * The note viewer. A dumb renderer, mirroring renderTopics: every decision
 * (which cards are masked, whether notes loaded at all) arrives as a prop,
 * so the logic stays in main.ts where a node test can reach it.
 */
export function renderNote(root: HTMLElement, props: NoteProps): void {
  if (!props.available) {
    root.innerHTML = `
      <section class="note-screen">
        <header class="note-head"><button class="btn-secondary" data-role="back">Back</button></header>
        <p class="note-empty">Notes aren't downloaded yet. Connect to the internet once and reopen this note.</p>
      </section>`;
    root.querySelector('[data-role="back"]')?.addEventListener('click', props.onBack);
    return;
  }

  if (!props.note) {
    root.innerHTML = `
      <section class="note-screen">
        <header class="note-head"><button class="btn-secondary" data-role="back">Back</button></header>
        <p class="note-empty">That note is no longer in the vault.</p>
      </section>`;
    root.querySelector('[data-role="back"]')?.addEventListener('click', props.onBack);
    return;
  }

  const summary = maskedSummary(props.masked.size);
  const obsidian = props.obsidianHref
    ? `<a class="btn-secondary" href="${escapeHtml(props.obsidianHref)}" data-role="obsidian">Open in Obsidian</a>`
    : '';

  root.innerHTML = `
    <section class="note-screen">
      <header class="note-head">
        <button class="btn-secondary" data-role="back">Back</button>
        <h1 class="note-title">${escapeHtml(props.note.title)}</h1>
        ${obsidian}
      </header>
      ${summary ? `<div class="note-masked-bar"><span>${summary}</span><button class="btn-secondary" data-role="reveal-all">Show all</button></div>` : ''}
      <article class="note-body">${renderNoteBlocks(props.note.blocks, props.masked)}</article>
      ${props.note.citations.length > 0
        ? `<footer class="note-citations">${props.note.citations.map((c) => `<p>${escapeHtml(c)}</p>`).join('')}</footer>`
        : ''}
    </section>`;

  root.querySelector('[data-role="back"]')?.addEventListener('click', props.onBack);

  // Reveal is per-element and ephemeral -- it derives from the schedule, so
  // leaving and re-entering re-masks. Nothing here is persisted.
  root.querySelectorAll<HTMLElement>('.is-masked').forEach((element) => {
    element.addEventListener('click', () => {
      element.classList.remove('is-masked');
      element.classList.add('is-revealed');
    });
  });

  root.querySelector('[data-role="reveal-all"]')?.addEventListener('click', () => {
    root.querySelectorAll<HTMLElement>('.is-masked').forEach((element) => {
      element.classList.remove('is-masked');
      element.classList.add('is-revealed');
    });
    root.querySelector('.note-masked-bar')?.remove();
  });

  if (props.arrivedFrom) {
    const target = root.querySelector<HTMLElement>(`[data-card="${CSS.escape(props.arrivedFrom)}"]`);
    if (target) {
      target.classList.add('is-arrived');
      target.scrollIntoView({ block: 'center' });
    }
  }
}
```

- [ ] **Step 4: Wire it into `main.ts`**

In `app/src/main.ts`, add the imports:

```ts
import { renderNote } from './ui/note.js';
import { loadNotes, findNote, prefetchNotes } from './db/notes.js';
import { maskedCardIds } from './ui/note-mask.js';
import { obsidianUrl } from './ui/obsidian.js';
```

and in `route()`, before the `#topics` branch:

```ts
  if (decision.kind === 'note') {
    const [notes, reviews, settings] = await Promise.all([
      loadNotes(), loadReviews(db), getSettings(db)
    ]);
    const note = notes ? findNote(notes, decision.path) : null;
    const card = note
      ? (await db.getAll('cards')).find((c) => c.source.path === decision.path) ?? null
      : null;

    renderNote(appRoot, {
      note,
      available: notes !== null,
      masked: note ? maskedCardIds(note, reviews, now, decision.cardId) : new Set<string>(),
      arrivedFrom: decision.cardId,
      // Obsidian is demoted, not deleted: on a Mac it is still the better
      // tool for EDITING a note, which this viewer will never do.
      obsidianHref: card ? obsidianUrl(card, settings.obsidianVault) : null,
      onBack: () => { window.history.back(); }
    });
    return;
  }
```

Then call `prefetchNotes()` once, immediately after the dashboard render at the end of `route()`, so the common case is already cached when a note is opened.

- [ ] **Step 5: Add the screen styles**

Put this in `app/src/styles/note.css` (NOT `styles.css`, which is an @import manifest), using the existing token scale:

```css
.note-screen { padding: var(--s4); max-width: 42rem; margin: 0 auto; }
.note-head { display: flex; align-items: center; gap: var(--s3); margin-bottom: var(--s4); }
.note-title { font-size: var(--text-prompt); margin: 0; flex: 1; }
.note-masked-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--s3); padding: var(--s3); margin-bottom: var(--s4);
  border-radius: var(--r-md); font-size: var(--text-label);
}
.note-body { font-size: var(--text-body); line-height: 1.6; }
.note-prose { margin: 0 0 var(--s4); }
.note-code { overflow-x: auto; padding: var(--s3); border-radius: var(--r-md); }
.note-card { padding: var(--s4); border-radius: var(--r-md); margin: 0 0 var(--s4); }
.note-card-prompt { margin: 0 0 var(--s3); font-weight: 600; }
.note-choices { list-style: none; padding: 0; margin: 0; }
.note-choice { padding: var(--s2) var(--s3); border-radius: var(--r-sm); }
.note-citations { margin-top: var(--s6); font-size: var(--text-micro); }
.note-empty { padding: var(--s6) var(--s4); text-align: center; color: var(--dim); }

.note-masked-bar { background: var(--accent-soft); color: var(--accent-text); }
.note-code { background: var(--surface); border: 1px solid var(--line); }
.note-card { background: var(--surface); border: 1px solid var(--line); }
.note-choice.is-correct { background: var(--ok-soft); color: var(--ok); }
.note-citations { color: var(--dim); }
.is-arrived { outline: 2px solid var(--accent); border-radius: var(--r-sm); }
```

Every colour above is an existing token from `app/src/theme.css`, which redefines all of them for the night theme — so no raw hex is introduced and both themes follow automatically. Confirm visually in both at Step 6 regardless.

- [ ] **Step 6: Verify in the browser**

```bash
npm run dev
```

Then, using the preview tools, check at 375×812 in both themes:
- A note with due cards shows blurred spans and the "N answers hidden" bar.
- Tapping one masked span reveals only that one.
- "Show all" reveals everything and removes the bar.
- An mcq's correct choice is unmarked while masked; view the page source and confirm `is-correct` is genuinely absent, not merely invisible.
- Arriving via `#note/<path>/<card-id>` scrolls to and outlines that card, unmasked.
- A bogus `#note/vault%2Fnope.md` shows the not-found state, not a blank screen.

- [ ] **Step 7: Run the full suite and commit**

```bash
npm test && npm run typecheck
git add app/src/ui/note.ts app/src/main.ts app/src/styles/note.css app/tests/note-view.test.ts
git commit -m "feat: add the in-app note viewer screen

A dumb renderer, mirroring renderTopics: masking and availability arrive as
props so the decisions stay in main.ts where node tests can reach them.

Reveal is ephemeral and per-element. It derives from the FSRS schedule, so
leaving and re-entering re-masks, and there is nothing new to persist.

Obsidian is demoted rather than deleted -- it moves into this screen's
header, because on a Mac it remains the better tool for EDITING a note,
which this viewer will never do."
```

---

### Task 9: Repoint the review screen's source button

**Files:**
- Modify: `app/src/ui/review.ts:340`

**Interfaces:**
- Consumes: `noteHash` from Task 7.

- [ ] **Step 1: Repoint the handler**

Replace the body of the `[data-role="source"]` handler in `app/src/ui/review.ts`. **Read the comment above it first and keep it** — every constraint it states still holds and now matters more. Extend it rather than replacing it:

```ts
    // Opening a note is a READ, not a judgement on the card. Unlike every
    // other handler here, it must NOT set `submitting`, lock controls,
    // record anything, or advance -- the reader opens the note, comes back,
    // and still grades the card themselves. Do not copy the flag handler's
    // shape onto this one, and note it must stay outside the `submitting`
    // guard that now also fronts the header's × (finishSession).
    //
    // This now opens the in-app viewer rather than an obsidian:// deep
    // link. The deep link only worked with Obsidian installed and the vault
    // synced to the device, which on the iPhone -- the app's actual target,
    // with the vault living in the repo -- it generally is not. Obsidian
    // moved into the viewer's own header, where it is still the better tool
    // for editing on a Mac.
    //
    // The card id rides along so the viewer can leave THIS card unmasked:
    // it is due by definition, but you have just answered it.
    root.querySelector('[data-role="source"]')?.addEventListener('click', () => {
      window.location.hash = noteHash(card.source.path, card.id);
    });
```

Update the imports at the top of `review.ts`: remove `obsidianUrl` if nothing else in the file uses it, and add `import { noteHash } from '../route.js';`.

- [ ] **Step 2: Check what the button is labelled**

Search `review.ts` for the button's rendered text. If it says "Open in Obsidian" or similar, change it to "Open note" — it no longer leaves the app.

- [ ] **Step 3: Verify `obsidian.ts` is still reachable**

```bash
grep -rn "obsidianUrl" app/src/
```

Expected: imported by `app/src/ui/note.ts` (Task 8). `app/tests/obsidian.test.ts` must still pass — the function is unchanged, only its caller moved.

- [ ] **Step 4: Verify in the browser**

```bash
npm run dev
```

Start a review, reveal a card, tap the source button. Expected: the viewer opens on that note, scrolled to that card, with it unmasked and outlined while other due cards in the note are blurred. Go back — the card is still awaiting your rating, unlocked, nothing recorded.

- [ ] **Step 5: Run the suite and commit**

```bash
npm test && npm run typecheck
git add app/src/ui/review.ts
git commit -m "feat: open notes in-app from review instead of via obsidian://

PR #24's deep link only worked with Obsidian installed and the vault synced
to the device. On the iPhone PWA -- the app's actual target, with the vault
living in this repo -- that is generally not the case, so the button was
dead weight exactly where the app is most used.

The card id rides along in the hash so the viewer leaves THIS card unmasked.
It is due by definition, but you have just answered it, so there is nothing
left to protect.

Everything the existing comment insists on is unchanged and now matters
more: this is a read, so it still must not set submitting, lock controls,
record anything, or advance."
```

---

### Task 10: Browse notes from the topics screen

The path-B entry point: reach a note without being in review.

**Files:**
- Modify: `app/src/topics.ts`
- Modify: `app/src/ui/topics.ts`
- Modify: `app/src/main.ts`
- Test: `app/tests/topics.test.ts`

**Interfaces:**
- Consumes: `loadNotes` (Task 4), `noteHash` (Task 7), the existing `TopicSummary`/`CategorySummary`.
- Produces: `notesByCategory(notes: Notes): Map<string, { path: string; title: string }[]>` in `app/src/topics.ts`; a new `notes` prop and `onOpenNote` callback on `TopicsProps`.

- [ ] **Step 1: Write the failing test**

Add to `app/tests/topics.test.ts`:

```ts
import { notesByCategory } from '../src/topics.js';
import type { Notes } from '../../pipeline/src/types.js';

describe('notesByCategory', () => {
  const notes: Notes = {
    generatedAt: '2026-01-01T00:00:00.000Z',
    notes: [
      { path: 'vault/db/raft.md', title: 'Raft', topic: 'db', category: 'db', citations: [], blocks: [] },
      { path: 'vault/db/consensus.md', title: 'Consensus', topic: 'db', category: 'db', citations: [], blocks: [] },
      { path: 'vault/net/tcp.md', title: 'TCP', topic: 'net', category: 'net', citations: [], blocks: [] }
    ]
  };

  it('groups notes under their category', () => {
    expect(notesByCategory(notes).get('net')).toEqual([{ path: 'vault/net/tcp.md', title: 'TCP' }]);
  });

  it('sorts by title so the list order is stable across renders', () => {
    expect(notesByCategory(notes).get('db')?.map((n) => n.title)).toEqual(['Consensus', 'Raft']);
  });

  it('returns an empty map for an empty notes file', () => {
    expect(notesByCategory({ generatedAt: 'x', notes: [] }).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run app/tests/topics.test.ts
```

Expected: FAIL — `notesByCategory` is not exported.

- [ ] **Step 3: Implement the grouping**

Append to `app/src/topics.ts`:

```ts
import type { Notes } from '../../pipeline/src/types.js';

/**
 * Groups notes under their category, for the topics screen's third level.
 *
 * Sorted by title rather than path so the list reads the way the note is
 * named, and so ordering never depends on directory layout -- matching how
 * summarizeTopics sorts by name at both its levels.
 */
export function notesByCategory(notes: Notes): Map<string, { path: string; title: string }[]> {
  const byCategory = new Map<string, { path: string; title: string }[]>();
  for (const note of notes.notes) {
    const list = byCategory.get(note.category) ?? [];
    list.push({ path: note.path, title: note.title });
    byCategory.set(note.category, list);
  }
  for (const list of byCategory.values()) list.sort((a, b) => a.title.localeCompare(b.title));
  return byCategory;
}
```

- [ ] **Step 4: Extend the topics renderer**

In `app/src/ui/topics.ts`, add to `TopicsProps`:

```ts
  /**
   * Notes per category, for browsing. Empty when notes.json has not loaded
   * yet -- it is fetched lazily, so this list is absent rather than broken,
   * and the rest of the screen must render exactly as before.
   */
  notes: ReadonlyMap<string, { path: string; title: string }[]>;
  onOpenNote: (path: string) => void;
```

Inside the per-category markup, render a note list when `props.notes.get(category)` is non-empty. Follow the file's existing conventions exactly: escape every title with the local `escapeHtml`, carry the path on a `data-note-path` attribute rather than interpolating it into an element id, and attach the handler via `root.querySelectorAll('[data-note-path]')`.

- [ ] **Step 5: Wire it in `main.ts`**

In the `decision.kind === 'topics'` branch, load notes alongside the existing state and pass both new props:

```ts
    const notes = await loadNotes();
    // ... existing renderTopics call gains:
    notes: notes ? notesByCategory(notes) : new Map(),
    onOpenNote: (path) => { window.location.hash = noteHash(path); },
```

- [ ] **Step 6: Verify in the browser**

```bash
npm run dev
```

At 375×812 in both themes: the topics screen lists notes under each category; tapping one opens the viewer with masking applied and **no** card force-revealed (there is no arrived-from card on this path). Existing category mute toggles and "Learn" buttons still work.

- [ ] **Step 7: Run the suite and commit**

```bash
npm test && npm run typecheck
git add app/src/topics.ts app/src/ui/topics.ts app/src/main.ts app/tests/topics.test.ts
git commit -m "feat: browse notes by category from the topics screen

The reading entry point. Opening a note from review answers 'what did this
card come from'; this answers 'I keep fumbling consensus, let me reread it',
which is the thing that could not be done on the phone at all.

notes.json is lazily fetched, so an absent list degrades to the screen
exactly as it is today rather than blocking the render -- missing, not
broken. Nothing is force-revealed on this path: there is no arrived-from
card, so the full schedule-aware masking applies."
```

---

### Task 11: Document it and open the PR

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-09-19-factotum-state-and-roadmap.md`

- [ ] **Step 1: Update the README**

The README documents the build outputs and the app's screens. Add:
- `deck/notes.json` alongside `deck/deck.json` where build outputs are described, with one line on why it is separate (deck.json's network-first timeout at review start).
- The note viewer in the screens/features section, stating the masking rule in one sentence: answers are hidden for cards that are currently due, visible for new cards and cards inside their retention window.
- A note under vault conventions that a note's first `# H1` becomes its title in the viewer, and the filename is used when there is none.

Do **not** restate the whole design — link to the spec.

- [ ] **Step 2: Update the roadmap doc**

Add the note viewer to what has shipped. Also add **review-history durability** to the open problems: FSRS state lives only in IndexedDB on one device, with a manual "Export backup" button as the sole mitigation, and deleting the home-screen icon destroys it with no iCloud backup. It surfaced during this design, is independent of it, and is more urgent than anything in Phase 2.

- [ ] **Step 3: Run the full gate**

```bash
npm test && npm run typecheck && npm run build:deck && git status --porcelain
```

All three must pass and the last must print **nothing**. If `deck/notes.json` shows as modified here, `withStableNotesGeneratedAt` is not holding — fix it, because CI gates every PR on exactly this.

- [ ] **Step 4: Commit and open the PR**

```bash
git add README.md docs/superpowers/specs/2026-09-19-factotum-state-and-roadmap.md
git commit -m "docs: document the note viewer and flag review-history durability

The durability item surfaced while designing this feature and is not part
of it: FSRS state lives only in IndexedDB on one device, and deleting the
home-screen icon destroys it with no iCloud backup. The deck rebuilds from
this repo; months of stability scores do not. It needs its own spec."
git push -u origin feat/in-app-note-viewer
gh pr create --base main --title "feat: in-app note viewer" --body "..."
```

The PR body should summarize what shipped, link the spec, and state the measured `notes.json` gzipped size. End it with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Do not merge — a human merges PRs in this repo.
