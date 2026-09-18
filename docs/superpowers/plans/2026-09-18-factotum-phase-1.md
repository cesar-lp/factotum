# Factotum Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working daily spaced-repetition PWA on iPhone, fed by Obsidian notes in this repo, seeded with content from three systems books.

**Architecture:** A TypeScript pipeline parses `vault/**/*.md` into `deck/deck.json` in CI, committing generated card IDs back to the notes. A Vite-built PWA fetches that deck, stores it in IndexedDB alongside FSRS scheduling state, and runs an offline-first review session. No server, no framework — plain TypeScript DOM modules keep the bundle small and the state model obvious.

**Tech Stack:** TypeScript 5, Node 20, Vite 5, Vitest 2, `ts-fsrs` (scheduling), `idb` (IndexedDB wrapper), `gray-matter` (frontmatter), GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-18-factotum-design.md`

## Global Constraints

- **Node 20**, package manager **npm**, single root `package.json` — no workspaces.
- **TypeScript strict mode on.** No `any` in committed code.
- **No UI framework.** Plain TypeScript modules rendering into the DOM.
- **Card formats are exactly four:** `cloze`, `qa`, `mcq`, `recall`. No other value is ever written to `deck.json`.
- **Card IDs match `/^card-[a-z0-9]{4}$/`** and are globally unique across the vault.
- **The deck carries no scheduling state.** Scheduling lives only in IndexedDB.
- **Theme tokens are the eight CSS custom properties in spec §7.2**, exact hex values. No hardcoded colors anywhere else.
- **Desired retention 0.90; new-card cap 10/day** — both read from settings, never hardcoded at call sites.
- **Day boundary is 04:00 local.**
- **Out of scope (Phase 2):** streak, freezes, heatmap, mastery bars, push notifications, badge. The dashboard in this plan shows due count and a start button only.

---

## File Structure

```
package.json                       # single root package, all scripts
tsconfig.json
vitest.config.ts
vite.config.ts

pipeline/
  src/types.ts                     # ParsedNote, ParsedCard, DeckCard, Choice, CardFormat
  src/frontmatter.ts               # frontmatter parse + category gate
  src/cards.ts                     # the four constructs -> ParsedCard[]
  src/ids.ts                       # ID generation, assignment, write-back
  src/build.ts                     # ParsedNote[] -> Deck
  src/cli.ts                       # entrypoint: scan vault, write back, emit deck.json
  tests/*.test.ts
  tests/fixtures/*.md

app/
  index.html
  manifest.webmanifest
  src/main.ts                      # bootstrap, routing between screens
  src/theme.css                    # the eight tokens, both schemes
  src/styles.css                   # layout
  src/db/schema.ts                 # IndexedDB open/upgrade
  src/db/deck.ts                   # fetch + merge deck into `cards`
  src/db/reviews.ts                # FSRS state + reviewLog persistence
  src/db/settings.ts               # settings read/write with defaults
  src/scheduler/fsrs.ts            # ts-fsrs wrapper + rating map
  src/scheduler/queue.ts           # session queue assembly
  src/ui/dashboard.ts
  src/ui/review.ts                 # split layout shell
  src/ui/renderers.ts              # per-format card rendering
  src/ui/settings.ts
  src/ui/flag.ts                   # suspend + GitHub issue URL
  src/sw.ts                        # service worker: precache shell
  tests/*.test.ts

vault/
  networking/*.md
  data-systems/*.md
  database-internals/*.md

deck/deck.json                     # build output, committed
.github/workflows/build-deck.yml
.github/workflows/deploy.yml
```

Each pipeline module owns one transformation and is tested against fixture markdown. Each app module owns one store or one screen. `types.ts` is shared by pipeline and app via a relative import so the deck schema has exactly one definition.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.nvmrc`
- Create: `pipeline/tests/smoke.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` (vitest), `npm run build:deck`, `npm run dev`, `npm run build:app` scripts

- [ ] **Step 1: Write the failing test**

```ts
// pipeline/tests/smoke.test.ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs typescript under vitest', () => {
    const x: number = 1;
    expect(x).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — npm script does not exist yet.

- [ ] **Step 3: Create the project files**

```json
// package.json
{
  "name": "factotum",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "build:deck": "tsx pipeline/src/cli.ts vault deck/deck.json",
    "dev": "vite --config vite.config.ts",
    "build:app": "vite build --config vite.config.ts"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vite": "^5.3.0",
    "vitest": "^2.0.0"
  },
  "dependencies": {
    "gray-matter": "^4.0.3",
    "idb": "^8.0.0",
    "ts-fsrs": "^4.0.0"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"]
  },
  "include": ["pipeline", "app", "*.ts"]
}
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { globals: true, environment: 'node', include: ['**/tests/**/*.test.ts'] }
});
```

```
20
```
(that is the entire contents of `.nvmrc`)

- [ ] **Step 4: Install and run**

Run: `npm install && npm test`
Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .nvmrc pipeline/tests/smoke.test.ts
git commit -m "chore: project scaffold with vitest and typescript"
```

---

### Task 2: Shared types and frontmatter parsing

**Files:**
- Create: `pipeline/src/types.ts`, `pipeline/src/frontmatter.ts`
- Create: `pipeline/tests/frontmatter.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type CardFormat = 'cloze' | 'qa' | 'mcq' | 'recall'`
  - `interface Choice { text: string; correct: boolean }`
  - `interface ParsedCard { id: string | null; format: CardFormat; prompt: string; answer?: string; choices?: Choice[]; anchorLine: number }`
  - `interface NoteMeta { category: string; tags: string[]; citations: string[] }`
  - `interface ParsedNote extends NoteMeta { path: string; cards: ParsedCard[] }`
  - `interface DeckCard { id: string; format: CardFormat; category: string; tags: string[]; prompt: string; answer?: string; choices?: Choice[]; source: { path: string; block: string }; citations: string[] }`
  - `interface Deck { generatedAt: string; cards: DeckCard[] }`
  - `parseFrontmatter(raw: string): { meta: NoteMeta | null; body: string; bodyStartLine: number }` — returns `meta: null` when there is no `category`, which is the signal to skip the note entirely.

- [ ] **Step 1: Write the failing test**

```ts
// pipeline/tests/frontmatter.test.ts
import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '../src/frontmatter.js';

describe('parseFrontmatter', () => {
  it('extracts category, tags and citations', () => {
    const raw = [
      '---',
      'category: networking',
      'tags: [tcp, transport-layer]',
      'citations: ["RFC 793 §1.4"]',
      '---',
      '',
      '# Title'
    ].join('\n');

    const { meta, body, bodyStartLine } = parseFrontmatter(raw);

    expect(meta).toEqual({
      category: 'networking',
      tags: ['tcp', 'transport-layer'],
      citations: ['RFC 793 §1.4']
    });
    expect(body.trim()).toBe('# Title');
    expect(bodyStartLine).toBe(5);
  });

  it('defaults tags and citations to empty arrays', () => {
    const raw = '---\ncategory: algorithms\n---\nbody';
    expect(parseFrontmatter(raw).meta).toEqual({
      category: 'algorithms',
      tags: [],
      citations: []
    });
  });

  it('returns null meta when category is absent', () => {
    expect(parseFrontmatter('---\ntags: [x]\n---\nbody').meta).toBeNull();
  });

  it('returns null meta when there is no frontmatter at all', () => {
    expect(parseFrontmatter('# Just a draft').meta).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run pipeline/tests/frontmatter.test.ts`
Expected: FAIL — cannot resolve `../src/frontmatter.js`.

- [ ] **Step 3: Write the implementation**

```ts
// pipeline/src/types.ts
export type CardFormat = 'cloze' | 'qa' | 'mcq' | 'recall';

export interface Choice {
  text: string;
  correct: boolean;
}

export interface ParsedCard {
  id: string | null;
  format: CardFormat;
  prompt: string;
  answer?: string;
  choices?: Choice[];
  /** 0-indexed line in the source file that carries (or will carry) the ^card-xxxx anchor. */
  anchorLine: number;
}

export interface NoteMeta {
  category: string;
  tags: string[];
  citations: string[];
}

export interface ParsedNote extends NoteMeta {
  path: string;
  cards: ParsedCard[];
}

export interface DeckCard {
  id: string;
  format: CardFormat;
  category: string;
  tags: string[];
  prompt: string;
  answer?: string;
  choices?: Choice[];
  source: { path: string; block: string };
  citations: string[];
}

export interface Deck {
  generatedAt: string;
  cards: DeckCard[];
}
```

```ts
// pipeline/src/frontmatter.ts
import matter from 'gray-matter';
import type { NoteMeta } from './types.js';

export interface FrontmatterResult {
  meta: NoteMeta | null;
  body: string;
  bodyStartLine: number;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

export function parseFrontmatter(raw: string): FrontmatterResult {
  const parsed = matter(raw);
  const category = parsed.data['category'];

  if (typeof category !== 'string' || category.trim() === '') {
    return { meta: null, body: parsed.content, bodyStartLine: 0 };
  }

  const consumed = raw.length - parsed.content.length;
  const bodyStartLine = raw.slice(0, consumed).split('\n').length - 1;

  return {
    meta: {
      category: category.trim(),
      tags: toStringArray(parsed.data['tags']),
      citations: toStringArray(parsed.data['citations'])
    },
    body: parsed.content,
    bodyStartLine
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run pipeline/tests/frontmatter.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/types.ts pipeline/src/frontmatter.ts pipeline/tests/frontmatter.test.ts
git commit -m "feat(pipeline): parse note frontmatter with category gate"
```

---

### Task 3: Parse cloze and qa constructs

**Files:**
- Create: `pipeline/src/cards.ts`
- Create: `pipeline/tests/cards-inline.test.ts`

**Interfaces:**
- Consumes: `ParsedCard`, `CardFormat` from `pipeline/src/types.ts`
- Produces: `parseCards(body: string, bodyStartLine: number): ParsedCard[]` — returns cards in document order. This task handles `==cloze==` and `Q :: A`; Task 4 extends the same function with callouts.

**Rules this task locks in:**
- A line may already end with an existing anchor `^card-xxxx`; it is captured into `id` and stripped from the prompt.
- A cloze line with multiple `==highlights==` yields one card per highlight; each card blanks its own highlight and renders the others as plain text.
- The blank in a cloze prompt is the literal string `___`.

- [ ] **Step 1: Write the failing test**

```ts
// pipeline/tests/cards-inline.test.ts
import { describe, it, expect } from 'vitest';
import { parseCards } from '../src/cards.js';

describe('parseCards — inline constructs', () => {
  it('parses a cloze into prompt with a blank and the answer', () => {
    const cards = parseCards('Default Ethernet MTU is ==1500 bytes==.', 0);
    expect(cards).toEqual([
      {
        id: null,
        format: 'cloze',
        prompt: 'Default Ethernet MTU is ___.',
        answer: '1500 bytes',
        anchorLine: 0
      }
    ]);
  });

  it('captures an existing anchor and strips it from the prompt', () => {
    const cards = parseCards('MTU is ==1500 bytes==. ^card-k3n9', 4);
    expect(cards[0]?.id).toBe('card-k3n9');
    expect(cards[0]?.prompt).toBe('MTU is ___.');
    expect(cards[0]?.anchorLine).toBe(4);
  });

  it('yields one card per highlight, blanking one at a time', () => {
    const cards = parseCards('TCP is ==reliable== and ==ordered==.', 0);
    expect(cards).toHaveLength(2);
    expect(cards[0]?.prompt).toBe('TCP is ___ and ordered.');
    expect(cards[0]?.answer).toBe('reliable');
    expect(cards[1]?.prompt).toBe('TCP is reliable and ___.');
    expect(cards[1]?.answer).toBe('ordered');
  });

  it('parses a Q :: A line as a qa card', () => {
    const cards = parseCards('What does TIME_WAIT protect against? :: Delayed duplicates.', 2);
    expect(cards).toEqual([
      {
        id: null,
        format: 'qa',
        prompt: 'What does TIME_WAIT protect against?',
        answer: 'Delayed duplicates.',
        anchorLine: 2
      }
    ]);
  });

  it('ignores prose with no constructs', () => {
    expect(parseCards('Just an explanatory sentence.', 0)).toEqual([]);
  });

  it('offsets anchorLine by bodyStartLine', () => {
    const cards = parseCards('A ==b==.', 5);
    expect(cards[0]?.anchorLine).toBe(5);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run pipeline/tests/cards-inline.test.ts`
Expected: FAIL — cannot resolve `../src/cards.js`.

- [ ] **Step 3: Write the implementation**

```ts
// pipeline/src/cards.ts
import type { ParsedCard } from './types.js';

const ANCHOR = /\s*\^(card-[a-z0-9]{4})\s*$/;
const HIGHLIGHT = /==([^=]+)==/g;
const QA = /^(.+?)\s+::\s+(.+)$/;

interface StrippedLine {
  text: string;
  id: string | null;
}

function stripAnchor(line: string): StrippedLine {
  const match = line.match(ANCHOR);
  if (!match || !match[1]) return { text: line.trimEnd(), id: null };
  return { text: line.replace(ANCHOR, '').trimEnd(), id: match[1] };
}

function clozeCards(text: string, id: string | null, anchorLine: number): ParsedCard[] {
  const matches = [...text.matchAll(HIGHLIGHT)];
  if (matches.length === 0) return [];

  return matches.map((target, index) => {
    let cursor = 0;
    let prompt = '';
    for (const m of matches) {
      const inner = m[1] ?? '';
      prompt += text.slice(cursor, m.index);
      prompt += m === target ? '___' : inner;
      cursor = (m.index ?? 0) + m[0].length;
    }
    prompt += text.slice(cursor);

    return {
      // Only the first card on a line can own the line's anchor; the rest
      // are assigned fresh ids by ids.ts.
      id: index === 0 ? id : null,
      format: 'cloze' as const,
      prompt,
      answer: (target[1] ?? '').trim(),
      anchorLine
    };
  });
}

export function parseCards(body: string, bodyStartLine: number): ParsedCard[] {
  const cards: ParsedCard[] = [];
  const lines = body.split('\n');

  lines.forEach((rawLine, offset) => {
    const anchorLine = bodyStartLine + offset;
    const { text, id } = stripAnchor(rawLine);
    if (text.trim() === '') return;

    const cloze = clozeCards(text, id, anchorLine);
    if (cloze.length > 0) {
      cards.push(...cloze);
      return;
    }

    const qa = text.match(QA);
    if (qa && qa[1] && qa[2]) {
      cards.push({
        id,
        format: 'qa',
        prompt: qa[1].trim(),
        answer: qa[2].trim(),
        anchorLine
      });
    }
  });

  return cards;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run pipeline/tests/cards-inline.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/cards.ts pipeline/tests/cards-inline.test.ts
git commit -m "feat(pipeline): parse cloze and qa card constructs"
```

---

### Task 4: Parse mcq and recall callouts

**Files:**
- Modify: `pipeline/src/cards.ts`
- Create: `pipeline/tests/cards-callouts.test.ts`

**Interfaces:**
- Consumes: `parseCards` from Task 3
- Produces: same `parseCards` signature, now also recognising `> [!card] mcq` and `> [!card] recall` blocks. Callout lines must not fall through to the cloze/qa matchers.

**Rules this task locks in:**
- A callout runs from `> [!card] <format>` until the first line that does not start with `>`.
- The first non-empty content line is the prompt; subsequent prompt lines are joined with a space.
- `- [x]` marks a correct choice, `- [ ]` an incorrect one. At least one correct choice is required; a callout with none is skipped with a warning to stderr.
- The anchor may appear on its own line inside the callout.

- [ ] **Step 1: Write the failing test**

```ts
// pipeline/tests/cards-callouts.test.ts
import { describe, it, expect, vi } from 'vitest';
import { parseCards } from '../src/cards.js';

const mcq = [
  '> [!card] mcq',
  '> At which OSI layer does TCP operate?',
  '> - [x] Transport (4)',
  '> - [ ] Network (3)',
  '> - [ ] Session (5)',
  '> ^card-m8q4'
].join('\n');

describe('parseCards — callouts', () => {
  it('parses an mcq callout with choices and anchor', () => {
    const cards = parseCards(mcq, 0);
    expect(cards).toEqual([
      {
        id: 'card-m8q4',
        format: 'mcq',
        prompt: 'At which OSI layer does TCP operate?',
        choices: [
          { text: 'Transport (4)', correct: true },
          { text: 'Network (3)', correct: false },
          { text: 'Session (5)', correct: false }
        ],
        anchorLine: 5
      }
    ]);
  });

  it('parses a recall callout with no answer key', () => {
    const body = ['> [!card] recall', '> Explain why TCP suits bulk transfer', '> and not live video.'].join('\n');
    const cards = parseCards(body, 0);
    expect(cards).toEqual([
      {
        id: null,
        format: 'recall',
        prompt: 'Explain why TCP suits bulk transfer and not live video.',
        anchorLine: 2
      }
    ]);
  });

  it('skips an mcq with no correct choice and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const body = ['> [!card] mcq', '> Broken?', '> - [ ] a', '> - [ ] b'].join('\n');
    expect(parseCards(body, 0)).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not let callout text leak into cloze or qa parsing', () => {
    const body = ['> [!card] recall', '> Compare ==A== :: ==B=='].join('\n');
    const cards = parseCards(body, 0);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.format).toBe('recall');
  });

  it('resumes normal parsing after the callout ends', () => {
    const body = [mcq, '', 'MTU is ==1500 bytes==.'].join('\n');
    const cards = parseCards(body, 0);
    expect(cards.map((c) => c.format)).toEqual(['mcq', 'cloze']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run pipeline/tests/cards-callouts.test.ts`
Expected: FAIL — callouts currently parse as qa/cloze or not at all.

- [ ] **Step 3: Extend the implementation**

Add to `pipeline/src/cards.ts` (above `parseCards`):

```ts
const CALLOUT_OPEN = /^>\s*\[!card\]\s*(mcq|recall)\s*$/i;
const CALLOUT_LINE = /^>\s?(.*)$/;
const CHOICE = /^-\s*\[( |x)\]\s*(.+)$/i;

interface CalloutResult {
  card: ParsedCard | null;
  nextIndex: number;
}

function parseCallout(
  lines: string[],
  start: number,
  bodyStartLine: number,
  format: 'mcq' | 'recall'
): CalloutResult {
  const promptParts: string[] = [];
  const choices: Choice[] = [];
  let id: string | null = null;
  let anchorLine = bodyStartLine + start;
  let i = start + 1;

  for (; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const match = raw.match(CALLOUT_LINE);
    if (!match) break;

    const inner = (match[1] ?? '').trim();
    const stripped = stripAnchor(inner);
    if (stripped.id) {
      id = stripped.id;
      anchorLine = bodyStartLine + i;
    }

    const content = stripped.text.trim();
    if (content === '') continue;

    const choice = content.match(CHOICE);
    if (choice && choice[2]) {
      choices.push({ text: choice[2].trim(), correct: choice[1]?.toLowerCase() === 'x' });
      continue;
    }
    promptParts.push(content);
  }

  const prompt = promptParts.join(' ');
  if (prompt === '') {
    console.warn(`Skipping [!card] ${format} at line ${bodyStartLine + start}: no prompt`);
    return { card: null, nextIndex: i };
  }

  if (format === 'recall') {
    return { card: { id, format, prompt, anchorLine }, nextIndex: i };
  }

  if (!choices.some((c) => c.correct)) {
    console.warn(`Skipping [!card] mcq at line ${bodyStartLine + start}: no correct choice`);
    return { card: null, nextIndex: i };
  }

  return { card: { id, format, prompt, choices, anchorLine }, nextIndex: i };
}
```

Import `Choice` alongside `ParsedCard` at the top of the file, then replace the body of `parseCards` with an indexed loop so a callout can consume several lines:

```ts
export function parseCards(body: string, bodyStartLine: number): ParsedCard[] {
  const cards: ParsedCard[] = [];
  const lines = body.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';

    const open = rawLine.match(CALLOUT_OPEN);
    if (open && open[1]) {
      const format = open[1].toLowerCase() as 'mcq' | 'recall';
      const { card, nextIndex } = parseCallout(lines, i, bodyStartLine, format);
      if (card) cards.push(card);
      i = nextIndex - 1;
      continue;
    }

    const anchorLine = bodyStartLine + i;
    const { text, id } = stripAnchor(rawLine);
    if (text.trim() === '') continue;

    const cloze = clozeCards(text, id, anchorLine);
    if (cloze.length > 0) {
      cards.push(...cloze);
      continue;
    }

    const qa = text.match(QA);
    if (qa && qa[1] && qa[2]) {
      cards.push({ id, format: 'qa', prompt: qa[1].trim(), answer: qa[2].trim(), anchorLine });
    }
  }

  return cards;
}
```

- [ ] **Step 4: Run all parser tests**

Run: `npx vitest run pipeline/tests/`
Expected: PASS — both card test files green, 11 tests total.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/cards.ts pipeline/tests/cards-callouts.test.ts
git commit -m "feat(pipeline): parse mcq and recall callout cards"
```

---

### Task 5: Assign and write back card IDs

**Files:**
- Create: `pipeline/src/ids.ts`
- Create: `pipeline/tests/ids.test.ts`

**Interfaces:**
- Consumes: `ParsedCard` from Task 2
- Produces:
  - `generateId(taken: Set<string>): string` — `card-` plus 4 base36 chars, never colliding with `taken`.
  - `assignIds(cards: ParsedCard[], taken: Set<string>): ParsedCard[]` — fills every null id, mutating `taken`.
  - `writeBackIds(source: string, cards: ParsedCard[]): string` — appends ` ^card-xxxx` to the anchor line of any card whose id is not already present in the file. **Idempotent**: running it twice produces identical output.

**Rule this task locks in:** when several cards share an `anchorLine` (multi-cloze lines), only the first card's id is written to that line; the remaining ids are appended as trailing anchors on new lines immediately after it, each on its own line, so every id is addressable.

- [ ] **Step 1: Write the failing test**

```ts
// pipeline/tests/ids.test.ts
import { describe, it, expect } from 'vitest';
import { generateId, assignIds, writeBackIds } from '../src/ids.js';
import type { ParsedCard } from '../src/types.js';

const cloze = (id: string | null, anchorLine: number): ParsedCard => ({
  id, format: 'cloze', prompt: 'A ___.', answer: 'b', anchorLine
});

describe('ids', () => {
  it('generates ids matching the required shape', () => {
    expect(generateId(new Set())).toMatch(/^card-[a-z0-9]{4}$/);
  });

  it('never generates an id already taken', () => {
    const taken = new Set<string>();
    const ids = Array.from({ length: 200 }, () => {
      const id = generateId(taken);
      taken.add(id);
      return id;
    });
    expect(new Set(ids).size).toBe(200);
  });

  it('fills null ids and leaves existing ones alone', () => {
    const out = assignIds([cloze('card-keep', 0), cloze(null, 1)], new Set(['card-keep']));
    expect(out[0]?.id).toBe('card-keep');
    expect(out[1]?.id).toMatch(/^card-[a-z0-9]{4}$/);
  });

  it('appends an anchor to the card line', () => {
    const source = 'line zero\nMTU is ==1500 bytes==.\n';
    const out = writeBackIds(source, [cloze('card-aaaa', 1)]);
    expect(out).toBe('line zero\nMTU is ==1500 bytes==. ^card-aaaa\n');
  });

  it('is idempotent', () => {
    const source = 'MTU is ==1500 bytes==.\n';
    const once = writeBackIds(source, [cloze('card-aaaa', 0)]);
    const twice = writeBackIds(once, [cloze('card-aaaa', 0)]);
    expect(twice).toBe(once);
  });

  it('puts extra ids from one line on their own lines', () => {
    const source = 'TCP is ==reliable== and ==ordered==.\n';
    const out = writeBackIds(source, [cloze('card-aaaa', 0), cloze('card-bbbb', 0)]);
    expect(out).toBe('TCP is ==reliable== and ==ordered==. ^card-aaaa\n^card-bbbb\n');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run pipeline/tests/ids.test.ts`
Expected: FAIL — cannot resolve `../src/ids.js`.

- [ ] **Step 3: Write the implementation**

```ts
// pipeline/src/ids.ts
import type { ParsedCard } from './types.js';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateId(taken: Set<string>): string {
  for (let attempt = 0; attempt < 10_000; attempt++) {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    const id = `card-${suffix}`;
    if (!taken.has(id)) return id;
  }
  throw new Error('Exhausted card id space');
}

export function assignIds(cards: ParsedCard[], taken: Set<string>): ParsedCard[] {
  return cards.map((card) => {
    if (card.id) {
      taken.add(card.id);
      return card;
    }
    const id = generateId(taken);
    taken.add(id);
    return { ...card, id };
  });
}

export function writeBackIds(source: string, cards: ParsedCard[]): string {
  const lines = source.split('\n');
  const byLine = new Map<number, string[]>();

  for (const card of cards) {
    if (!card.id) continue;
    if (source.includes(`^${card.id}`)) continue;
    const bucket = byLine.get(card.anchorLine) ?? [];
    bucket.push(card.id);
    byLine.set(card.anchorLine, bucket);
  }

  if (byLine.size === 0) return source;

  const out: string[] = [];
  lines.forEach((line, index) => {
    const ids = byLine.get(index);
    if (!ids || ids.length === 0) {
      out.push(line);
      return;
    }
    const [first, ...rest] = ids;
    out.push(`${line.trimEnd()} ^${first}`);
    for (const extra of rest) out.push(`^${extra}`);
  });

  return out.join('\n');
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run pipeline/tests/ids.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/ids.ts pipeline/tests/ids.test.ts
git commit -m "feat(pipeline): assign stable card ids and write them back"
```

---

### Task 6: Build the deck and wire the CLI

**Files:**
- Create: `pipeline/src/build.ts`, `pipeline/src/cli.ts`
- Create: `pipeline/tests/build.test.ts`, `pipeline/tests/fixtures/networking-sample.md`

**Interfaces:**
- Consumes: `parseFrontmatter` (Task 2), `parseCards` (Tasks 3–4), `assignIds`/`writeBackIds` (Task 5)
- Produces:
  - `parseNote(path: string, raw: string, taken: Set<string>): { note: ParsedNote | null; updatedSource: string }`
  - `buildDeck(notes: ParsedNote[], now: Date): Deck`
  - CLI: `npm run build:deck` scans a vault directory, rewrites notes with new ids, writes `deck/deck.json`, and exits non-zero on duplicate ids.

- [ ] **Step 1: Write the failing test**

```ts
// pipeline/tests/build.test.ts
import { describe, it, expect } from 'vitest';
import { parseNote, buildDeck } from '../src/build.js';

const raw = [
  '---',
  'category: networking',
  'tags: [tcp]',
  'citations: ["RFC 793 §1.4"]',
  '---',
  '',
  'Default Ethernet MTU is ==1500 bytes==.'
].join('\n');

describe('parseNote', () => {
  it('returns a note with ids assigned and source updated', () => {
    const { note, updatedSource } = parseNote('vault/networking/tcp.md', raw, new Set());
    expect(note?.category).toBe('networking');
    expect(note?.cards).toHaveLength(1);
    expect(note?.cards[0]?.id).toMatch(/^card-[a-z0-9]{4}$/);
    expect(updatedSource).toContain(`^${note?.cards[0]?.id}`);
  });

  it('skips notes without a category and leaves the source untouched', () => {
    const { note, updatedSource } = parseNote('vault/daily.md', '# Draft ==x==', new Set());
    expect(note).toBeNull();
    expect(updatedSource).toBe('# Draft ==x==');
  });
});

describe('buildDeck', () => {
  it('flattens notes into deck cards carrying category, tags, citations and source', () => {
    const { note } = parseNote('vault/networking/tcp.md', raw, new Set());
    const deck = buildDeck(note ? [note] : [], new Date('2026-09-18T10:00:00Z'));

    expect(deck.generatedAt).toBe('2026-09-18T10:00:00.000Z');
    expect(deck.cards).toHaveLength(1);
    const card = deck.cards[0];
    expect(card?.category).toBe('networking');
    expect(card?.tags).toEqual(['tcp']);
    expect(card?.citations).toEqual(['RFC 793 §1.4']);
    expect(card?.prompt).toBe('Default Ethernet MTU is ___.');
    expect(card?.answer).toBe('1500 bytes');
    expect(card?.source.path).toBe('vault/networking/tcp.md');
    expect(card?.source.block).toBe(card?.id);
  });

  it('omits choices for non-mcq cards and answer for recall cards', () => {
    const recallRaw = ['---', 'category: networking', '---', '> [!card] recall', '> Explain ARQ.'].join('\n');
    const { note } = parseNote('vault/networking/arq.md', recallRaw, new Set());
    const card = buildDeck(note ? [note] : [], new Date()).cards[0];
    expect(card && 'choices' in card).toBe(false);
    expect(card && 'answer' in card).toBe(false);
  });

  it('throws on duplicate ids across notes', () => {
    const a = parseNote('a.md', '---\ncategory: x\n---\nA ==b==. ^card-dupe', new Set()).note;
    const b = parseNote('b.md', '---\ncategory: x\n---\nC ==d==. ^card-dupe', new Set()).note;
    expect(() => buildDeck([a!, b!], new Date())).toThrow(/card-dupe/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run pipeline/tests/build.test.ts`
Expected: FAIL — cannot resolve `../src/build.js`.

- [ ] **Step 3: Write the implementation**

```ts
// pipeline/src/build.ts
import { parseFrontmatter } from './frontmatter.js';
import { parseCards } from './cards.js';
import { assignIds, writeBackIds } from './ids.js';
import type { Deck, DeckCard, ParsedNote } from './types.js';

export interface ParseNoteResult {
  note: ParsedNote | null;
  updatedSource: string;
}

export function parseNote(path: string, raw: string, taken: Set<string>): ParseNoteResult {
  const { meta, body, bodyStartLine } = parseFrontmatter(raw);
  if (!meta) return { note: null, updatedSource: raw };

  const cards = assignIds(parseCards(body, bodyStartLine), taken);
  const note: ParsedNote = { path, ...meta, cards };
  return { note, updatedSource: writeBackIds(raw, cards) };
}

export function buildDeck(notes: ParsedNote[], now: Date): Deck {
  const seen = new Set<string>();
  const cards: DeckCard[] = [];

  for (const note of notes) {
    for (const card of note.cards) {
      if (!card.id) throw new Error(`Card without id in ${note.path}`);
      if (seen.has(card.id)) throw new Error(`Duplicate card id ${card.id} in ${note.path}`);
      seen.add(card.id);

      const deckCard: DeckCard = {
        id: card.id,
        format: card.format,
        category: note.category,
        tags: note.tags,
        prompt: card.prompt,
        source: { path: note.path, block: card.id },
        citations: note.citations
      };
      if (card.answer !== undefined) deckCard.answer = card.answer;
      if (card.choices !== undefined) deckCard.choices = card.choices;
      cards.push(deckCard);
    }
  }

  return { generatedAt: now.toISOString(), cards };
}
```

```ts
// pipeline/src/cli.ts
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { buildDeck, parseNote } from './build.js';
import type { ParsedNote } from './types.js';

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return markdownFiles(full);
    return full.endsWith('.md') ? [full] : [];
  });
}

function main(): void {
  const [vaultDir, outFile] = process.argv.slice(2);
  if (!vaultDir || !outFile) {
    console.error('usage: build:deck <vaultDir> <outFile>');
    process.exit(2);
  }

  const taken = new Set<string>();
  const notes: ParsedNote[] = [];

  for (const file of markdownFiles(vaultDir).sort()) {
    const raw = readFileSync(file, 'utf8');
    const rel = relative(process.cwd(), file);
    const { note, updatedSource } = parseNote(rel, raw, taken);
    if (updatedSource !== raw) writeFileSync(file, updatedSource, 'utf8');
    if (note) notes.push(note);
  }

  const deck = buildDeck(notes, new Date());
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(deck, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${deck.cards.length} cards from ${notes.length} notes to ${outFile}`);
}

main();
```

- [ ] **Step 4: Run tests and the CLI end to end**

Run: `npx vitest run pipeline/tests/ && mkdir -p vault/networking && printf -- '---\ncategory: networking\n---\n\nMTU is ==1500 bytes==.\n' > vault/networking/scratch.md && npm run build:deck && cat deck/deck.json && cat vault/networking/scratch.md`
Expected: tests PASS; `deck.json` contains one cloze card; `scratch.md` now ends with ` ^card-xxxx`.

- [ ] **Step 5: Remove the scratch note and commit**

```bash
rm vault/networking/scratch.md
npm run build:deck
git add pipeline/src/build.ts pipeline/src/cli.ts pipeline/tests/build.test.ts deck/deck.json
git commit -m "feat(pipeline): build deck.json and expose the cli"
```

---

### Task 7: Deck build GitHub Action

**Files:**
- Create: `.github/workflows/build-deck.yml`

**Interfaces:**
- Consumes: `npm run build:deck` (Task 6)
- Produces: on every push touching `vault/**`, the workflow commits regenerated ids and `deck/deck.json` back to `main`.

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/build-deck.yml
name: Build deck

on:
  push:
    branches: [main]
    paths: ['vault/**', 'pipeline/**', 'package.json']
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: build-deck
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build:deck
      - name: Commit generated ids and deck
        run: |
          git config user.name  "factotum-bot"
          git config user.email "factotum-bot@users.noreply.github.com"
          if [[ -n "$(git status --porcelain vault deck)" ]]; then
            git add vault deck
            git commit -m "chore: rebuild deck [skip ci]"
            git push
          else
            echo "No deck changes"
          fi
```

- [ ] **Step 2: Verify the workflow parses locally**

Run: `npx --yes yaml-lint .github/workflows/build-deck.yml || python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/build-deck.yml')); print('ok')"`
Expected: `ok` (or yaml-lint success).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build-deck.yml
git commit -m "ci: rebuild deck and commit ids on vault changes"
```

- [ ] **Step 4: Push and confirm the run is green**

Run: `git push && gh run watch --exit-status`
Expected: workflow succeeds. If the repo has no remote yet, create it first with `gh repo create factotum --public --source=. --push`.

---

### Task 8: Seed vault — computer networking

**Files:**
- Create: `vault/networking/*.md` (10 notes, listed below)

**Interfaces:**
- Consumes: the card syntax from Tasks 3–4
- Produces: roughly 60–80 cards under `category: networking`

**Source:** *Computer Networking: A Top-Down Approach* (Kurose & Ross). Notes are written fresh; `citations` reference chapters and RFCs. **Do not copy text from the book or from third-party notes repositories.**

One note per chapter concept, each with 5–8 cards mixing all four formats:

| File | Covers | Citation |
|---|---|---|
| `internet-structure.md` | hosts, access networks, ISPs, circuit vs packet switching, delay components | Ch. 1 |
| `delay-loss-throughput.md` | the four delay types, queuing delay and traffic intensity, end-to-end throughput | Ch. 1.4 |
| `http.md` | non-persistent vs persistent, methods, status codes, cookies, caching headers | Ch. 2.2 |
| `dns.md` | hierarchy, iterative vs recursive, record types, caching and TTL | Ch. 2.4 |
| `transport-basics.md` | multiplexing, UDP segment structure, checksum | Ch. 3.1–3.3 |
| `reliable-transfer.md` | stop-and-wait, Go-Back-N, selective repeat, sequence numbers | Ch. 3.4 |
| `tcp.md` | handshake, TIME_WAIT, RTT estimation, flow control | Ch. 3.5 |
| `congestion-control.md` | AIMD, slow start, fast retransmit, CUBIC vs Reno | Ch. 3.6–3.7 |
| `network-layer.md` | IPv4 header, fragmentation, subnetting, NAT, DHCP | Ch. 4 |
| `routing-and-link.md` | link-state vs distance-vector, BGP vs OSPF, Ethernet, ARP, switches vs routers | Ch. 5–6 |

- [ ] **Step 1: Write the ten notes**

Each file follows this shape exactly (example is the real, complete `vault/networking/tcp.md`):

```markdown
---
category: networking
tags: [tcp, transport-layer]
citations: ["Kurose & Ross, Computer Networking 8e, Ch. 3.5", "RFC 9293"]
---

# TCP Connection Management

TCP establishes a connection with a three-way handshake: the client sends a
SYN carrying its initial sequence number, the server replies with SYN-ACK
carrying its own, and the client completes it with an ACK. Data may ride on
that third segment.

Connection teardown is a ==four-way== exchange, because each direction is
closed independently with its own FIN and ACK.

The side that closes first enters ==TIME_WAIT== and waits ==2·MSL== before
releasing the socket.

What does the TIME_WAIT state protect against? :: Delayed duplicate segments from the old connection being delivered to a new connection reusing the same four-tuple, and the loss of the final ACK.

TCP's retransmission timeout is derived from a smoothed RTT estimate plus
four times the RTT ==deviation==.

> [!card] mcq
> A TCP receiver advertises a window of 0. What does the sender do?
> - [x] Sends periodic window-probe segments until the window reopens
> - [ ] Retransmits the last segment until acknowledged
> - [ ] Closes the connection after the retransmission timeout
> - [ ] Switches to slow start and continues sending

> [!card] mcq
> Which field makes a TCP connection uniquely identifiable on a host?
> - [x] The four-tuple of source IP, source port, destination IP, destination port
> - [ ] The destination port alone
> - [ ] The initial sequence number
> - [ ] The socket file descriptor

> [!card] recall
> Explain why TCP's head-of-line blocking hurts a multiplexed protocol like
> HTTP/2, and how QUIC avoids it.
```

Write the remaining nine files to the same standard: 3–5 sentences of prose per concept, 5–8 cards, every note carrying `citations`.

- [ ] **Step 2: Build the deck and verify the cards parse**

Run: `npm run build:deck && node -e "const d=require('./deck/deck.json'); const n=d.cards.filter(c=>c.category==='networking'); console.log(n.length, JSON.stringify([...new Set(n.map(c=>c.format))].sort()))"`
Expected: a count of 60 or more, and `["cloze","mcq","qa","recall"]`.

- [ ] **Step 3: Confirm ids were written back and the build is idempotent**

Run: `npm run build:deck && git diff --stat vault deck`
Expected: no diff on the second run.

- [ ] **Step 4: Commit**

```bash
git add vault/networking deck/deck.json
git commit -m "content: seed networking notes from Kurose & Ross chapters"
```

---

### Task 9: Seed vault — data-intensive systems

**Files:**
- Create: `vault/data-systems/*.md` (9 notes)

**Interfaces:**
- Consumes: card syntax from Tasks 3–4
- Produces: roughly 55–70 cards under `category: data-systems`

**Source:** *Designing Data-Intensive Applications* (Kleppmann). Same rules as Task 8 — written fresh, chapter citations, no copied text.

| File | Covers | Citation |
|---|---|---|
| `reliability-scalability.md` | faults vs failures, percentiles and tail latency, load parameters | Ch. 1 |
| `data-models.md` | relational vs document vs graph, schema-on-read, the object-relational mismatch | Ch. 2 |
| `storage-engines.md` | LSM-trees vs B-trees, SSTables, compaction, write amplification | Ch. 3 |
| `encoding-evolution.md` | backward vs forward compatibility, Avro/Protobuf/Thrift, schema evolution | Ch. 4 |
| `replication.md` | single-leader, multi-leader, leaderless; sync vs async; read-your-writes | Ch. 5 |
| `partitioning.md` | key-range vs hash partitioning, hot spots, rebalancing, request routing | Ch. 6 |
| `transactions.md` | ACID, isolation levels, write skew, snapshot isolation, serializability | Ch. 7 |
| `distributed-trouble.md` | partial failure, unbounded delays, unreliable clocks, fencing tokens | Ch. 8 |
| `consistency-consensus.md` | linearizability vs serializability, CAP precisely stated, total order broadcast | Ch. 9 |

- [ ] **Step 1: Write the nine notes**

Same structure as Task 8. Cards must be precise where the book is precise — for example:

```markdown
> [!card] mcq
> Which guarantee does snapshot isolation NOT provide?
> - [x] Protection against write skew
> - [ ] Reads from a consistent point-in-time snapshot
> - [ ] Readers never block writers
> - [ ] Protection against dirty reads

Linearizability is a ==recency== guarantee on single objects; serializability is an ==isolation== guarantee across transactions.

What does the P in CAP actually mean? :: Network partitions are not a choice but a fact; the real decision is how a system behaves when one occurs — remain available with stale reads, or remain consistent and refuse requests.
```

- [ ] **Step 2: Build and verify**

Run: `npm run build:deck && node -e "const d=require('./deck/deck.json'); console.log(d.cards.filter(c=>c.category==='data-systems').length)"`
Expected: 55 or more.

- [ ] **Step 3: Commit**

```bash
git add vault/data-systems deck/deck.json
git commit -m "content: seed data-systems notes from DDIA chapters"
```

---

### Task 10: Seed vault — database internals

**Files:**
- Create: `vault/database-internals/*.md` (8 notes)

**Interfaces:**
- Consumes: card syntax from Tasks 3–4
- Produces: roughly 45–60 cards under `category: database-internals`

**Source:** *Database Internals* (Petrov), Part I Storage Engines and Part II Distributed Systems.

| File | Covers | Citation |
|---|---|---|
| `storage-engine-basics.md` | row vs column stores, buffer pool, memory vs disk-based engines | Ch. 1 |
| `btree-basics.md` | node structure, fanout, occupancy, splits and merges, why B-trees suit disks | Ch. 2 |
| `btree-implementation.md` | page layout, slotted pages, rebalancing, copy-on-write B-trees | Ch. 3–4 |
| `transaction-processing.md` | buffer management, WAL, steal/no-force, ARIES recovery | Ch. 5 |
| `lsm-trees.md` | memtable, SSTable, compaction strategies, read/write/space amplification | Ch. 7 |
| `failure-detection.md` | heartbeats, phi-accrual, gossip-based detection | Ch. 9 |
| `replication-consistency.md` | quorums, read repair, hinted handoff, CRDTs, tunable consistency | Ch. 11–12 |
| `consensus.md` | Paxos sketch, Raft leader election and log replication, 2PC vs 3PC | Ch. 13–14 |

- [ ] **Step 1: Write the eight notes**

Same structure. Example card material:

```markdown
A B-tree's ==fanout== is the number of child pointers per node; high fanout is what keeps tree height — and therefore disk seeks — low.

> [!card] mcq
> In an LSM-tree, which amplification does levelled compaction reduce most?
> - [x] Space amplification
> - [ ] Write amplification
> - [ ] Read amplification on point lookups
> - [ ] Network amplification

> [!card] recall
> Explain why two-phase commit blocks when the coordinator fails after the
> prepare phase, and what Raft-based consensus changes about that.
```

- [ ] **Step 2: Build and verify the whole vault**

Run: `npm run build:deck && node -e "const d=require('./deck/deck.json'); const by={}; for(const c of d.cards) by[c.category]=(by[c.category]||0)+1; console.log(by, d.cards.length)"`
Expected: three categories present, total 160 or more cards.

- [ ] **Step 3: Commit**

```bash
git add vault/database-internals deck/deck.json
git commit -m "content: seed database-internals notes from Petrov chapters"
```

---

### Task 11: IndexedDB schema, settings, and deck merge

**Files:**
- Create: `app/src/db/schema.ts`, `app/src/db/settings.ts`, `app/src/db/deck.ts`
- Create: `app/tests/deck-merge.test.ts`
- Modify: `vitest.config.ts` (add `fake-indexeddb` setup)

**Interfaces:**
- Consumes: `Deck`, `DeckCard` from `pipeline/src/types.ts`
- Produces:
  - `interface ReviewState { cardId: string; due: number; stability: number; difficulty: number; elapsedDays: number; scheduledDays: number; reps: number; lapses: number; state: number; lastReview: number | null; suspended: boolean; flagged: boolean }`
  - `interface StoredCard extends DeckCard { tombstoned: boolean }`
  - `interface Settings { desiredRetention: number; newCardsPerDay: number; theme: 'auto' | 'day' | 'night' }`
  - `openDb(): Promise<FactotumDb>`
  - `getSettings(db): Promise<Settings>` / `saveSettings(db, s): Promise<void>` — defaults `{ desiredRetention: 0.9, newCardsPerDay: 10, theme: 'auto' }`
  - `mergeDeck(db, deck: Deck): Promise<{ added: number; updated: number; tombstoned: number }>`

- [ ] **Step 1: Add the test environment dependency**

Run: `npm i -D fake-indexeddb`

Then add to `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/tests/**/*.test.ts'],
    setupFiles: ['fake-indexeddb/auto']
  }
});
```

- [ ] **Step 2: Write the failing test**

```ts
// app/tests/deck-merge.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/db/schema.js';
import { mergeDeck } from '../src/db/deck.js';
import type { Deck } from '../../pipeline/src/types.js';

const deck = (cards: Deck['cards']): Deck => ({ generatedAt: '2026-09-18T00:00:00.000Z', cards });

const card = (id: string, prompt: string) => ({
  id, format: 'cloze' as const, category: 'networking', tags: [],
  prompt, answer: 'x', source: { path: 'vault/a.md', block: id }, citations: []
});

beforeEach(async () => {
  indexedDB = new IDBFactory();
});

describe('mergeDeck', () => {
  it('adds new cards', async () => {
    const db = await openDb();
    const result = await mergeDeck(db, deck([card('card-aaaa', 'first')]));
    expect(result.added).toBe(1);
    expect((await db.get('cards', 'card-aaaa'))?.prompt).toBe('first');
  });

  it('updates content in place and preserves review state', async () => {
    const db = await openDb();
    await mergeDeck(db, deck([card('card-aaaa', 'first')]));
    await db.put('reviews', {
      cardId: 'card-aaaa', due: 123, stability: 4.2, difficulty: 5, elapsedDays: 1,
      scheduledDays: 3, reps: 7, lapses: 1, state: 2, lastReview: 100,
      suspended: false, flagged: false
    });

    await mergeDeck(db, deck([card('card-aaaa', 'corrected')]));

    expect((await db.get('cards', 'card-aaaa'))?.prompt).toBe('corrected');
    const review = await db.get('reviews', 'card-aaaa');
    expect(review?.stability).toBe(4.2);
    expect(review?.reps).toBe(7);
  });

  it('tombstones cards missing from the new deck without deleting them', async () => {
    const db = await openDb();
    await mergeDeck(db, deck([card('card-aaaa', 'first'), card('card-bbbb', 'second')]));
    const result = await mergeDeck(db, deck([card('card-aaaa', 'first')]));

    expect(result.tombstoned).toBe(1);
    expect((await db.get('cards', 'card-bbbb'))?.tombstoned).toBe(true);
  });

  it('revives a tombstoned card when its id returns', async () => {
    const db = await openDb();
    await mergeDeck(db, deck([card('card-aaaa', 'first')]));
    await mergeDeck(db, deck([]));
    await mergeDeck(db, deck([card('card-aaaa', 'first')]));
    expect((await db.get('cards', 'card-aaaa'))?.tombstoned).toBe(false);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run app/tests/deck-merge.test.ts`
Expected: FAIL — cannot resolve `../src/db/schema.js`.

- [ ] **Step 4: Write the implementation**

```ts
// app/src/db/schema.ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DeckCard } from '../../../pipeline/src/types.js';

export interface StoredCard extends DeckCard {
  tombstoned: boolean;
}

export interface ReviewState {
  cardId: string;
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: number | null;
  suspended: boolean;
  flagged: boolean;
}

export interface ReviewLogEntry {
  id?: number;
  cardId: string;
  ts: number;
  rating: number;
  durationMs: number;
}

export interface Settings {
  desiredRetention: number;
  newCardsPerDay: number;
  theme: 'auto' | 'day' | 'night';
}

export interface FactotumSchema extends DBSchema {
  cards: { key: string; value: StoredCard };
  reviews: { key: string; value: ReviewState; indexes: { due: number } };
  reviewLog: { key: number; value: ReviewLogEntry; indexes: { ts: number } };
  meta: { key: string; value: unknown };
}

export type FactotumDb = IDBPDatabase<FactotumSchema>;

export function openDb(): Promise<FactotumDb> {
  return openDB<FactotumSchema>('factotum', 1, {
    upgrade(db) {
      db.createObjectStore('cards', { keyPath: 'id' });
      const reviews = db.createObjectStore('reviews', { keyPath: 'cardId' });
      reviews.createIndex('due', 'due');
      const log = db.createObjectStore('reviewLog', { keyPath: 'id', autoIncrement: true });
      log.createIndex('ts', 'ts');
      db.createObjectStore('meta');
    }
  });
}
```

```ts
// app/src/db/settings.ts
import type { FactotumDb, Settings } from './schema.js';

export const DEFAULT_SETTINGS: Settings = {
  desiredRetention: 0.9,
  newCardsPerDay: 10,
  theme: 'auto'
};

export async function getSettings(db: FactotumDb): Promise<Settings> {
  const stored = (await db.get('meta', 'settings')) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(db: FactotumDb, settings: Settings): Promise<void> {
  await db.put('meta', settings, 'settings');
}
```

```ts
// app/src/db/deck.ts
import type { Deck } from '../../../pipeline/src/types.js';
import type { FactotumDb, StoredCard } from './schema.js';

export interface MergeResult {
  added: number;
  updated: number;
  tombstoned: number;
}

export async function mergeDeck(db: FactotumDb, deck: Deck): Promise<MergeResult> {
  const tx = db.transaction('cards', 'readwrite');
  const store = tx.objectStore('cards');
  const existing = new Map<string, StoredCard>();
  for (const card of await store.getAll()) existing.set(card.id, card);

  const incoming = new Set<string>();
  const result: MergeResult = { added: 0, updated: 0, tombstoned: 0 };

  for (const card of deck.cards) {
    incoming.add(card.id);
    const prior = existing.get(card.id);
    await store.put({ ...card, tombstoned: false });
    if (!prior) result.added += 1;
    else if (prior.tombstoned || JSON.stringify(prior) !== JSON.stringify({ ...card, tombstoned: false })) {
      result.updated += 1;
    }
  }

  for (const [id, card] of existing) {
    if (incoming.has(id) || card.tombstoned) continue;
    await store.put({ ...card, tombstoned: true });
    result.tombstoned += 1;
  }

  await tx.done;
  return result;
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run app/tests/deck-merge.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add app/src/db vitest.config.ts app/tests/deck-merge.test.ts package.json package-lock.json
git commit -m "feat(app): indexeddb schema, settings and deck merge"
```

---

### Task 12: FSRS wrapper and rating map

**Files:**
- Create: `app/src/scheduler/fsrs.ts`
- Create: `app/tests/fsrs.test.ts`

**Interfaces:**
- Consumes: `ReviewState` (Task 11), `CardFormat` (Task 2)
- Produces:
  - `type Outcome = 'correct' | 'wrong' | 'again' | 'hard' | 'good' | 'easy'`
  - `ratingFor(format: CardFormat, outcome: Outcome): Rating` — machine-graded formats map `correct → Good`, `wrong → Again`; self-graded formats pass their four outcomes through.
  - `initialState(cardId: string, now: Date): ReviewState`
  - `applyRating(state: ReviewState, rating: Rating, now: Date, desiredRetention: number): ReviewState`
  - `isDue(state: ReviewState, now: Date): boolean` — `!suspended && due <= now`
  - `LEECH_THRESHOLD = 8`; `applyRating` sets `suspended: true` and `flagged: true` once `lapses >= LEECH_THRESHOLD`.

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/fsrs.test.ts
import { describe, it, expect } from 'vitest';
import { Rating } from 'ts-fsrs';
import { ratingFor, initialState, applyRating, isDue, LEECH_THRESHOLD } from '../src/scheduler/fsrs.js';

const now = new Date('2026-09-18T09:00:00Z');

describe('ratingFor', () => {
  it('maps machine-graded outcomes', () => {
    expect(ratingFor('mcq', 'correct')).toBe(Rating.Good);
    expect(ratingFor('mcq', 'wrong')).toBe(Rating.Again);
    expect(ratingFor('cloze', 'correct')).toBe(Rating.Good);
    expect(ratingFor('cloze', 'wrong')).toBe(Rating.Again);
  });

  it('passes self-graded outcomes through', () => {
    expect(ratingFor('qa', 'hard')).toBe(Rating.Hard);
    expect(ratingFor('recall', 'easy')).toBe(Rating.Easy);
  });
});

describe('applyRating', () => {
  it('schedules a new card into the future on Good', () => {
    const next = applyRating(initialState('card-aaaa', now), Rating.Good, now, 0.9);
    expect(next.due).toBeGreaterThan(now.getTime());
    expect(next.reps).toBe(1);
    expect(next.stability).toBeGreaterThan(0);
  });

  it('counts a lapse on Again for a previously learned card', () => {
    let state = initialState('card-aaaa', now);
    state = applyRating(state, Rating.Easy, now, 0.9);
    const lapsed = applyRating(state, Rating.Again, new Date(state.due), 0.9);
    expect(lapsed.lapses).toBe(1);
  });

  it('suspends and flags a card at the leech threshold', () => {
    let state = { ...initialState('card-aaaa', now), lapses: LEECH_THRESHOLD - 1, reps: 20, state: 2 };
    state = applyRating(state, Rating.Again, now, 0.9);
    expect(state.lapses).toBe(LEECH_THRESHOLD);
    expect(state.suspended).toBe(true);
    expect(state.flagged).toBe(true);
  });
});

describe('isDue', () => {
  it('is true when due has passed and the card is not suspended', () => {
    const state = { ...initialState('card-aaaa', now), due: now.getTime() - 1000 };
    expect(isDue(state, now)).toBe(true);
    expect(isDue({ ...state, suspended: true }, now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run app/tests/fsrs.test.ts`
Expected: FAIL — cannot resolve `../src/scheduler/fsrs.js`.

- [ ] **Step 3: Write the implementation**

```ts
// app/src/scheduler/fsrs.ts
import { fsrs, generatorParameters, createEmptyCard, Rating, State, type Card as FsrsCard } from 'ts-fsrs';
import type { CardFormat } from '../../../pipeline/src/types.js';
import type { ReviewState } from '../db/schema.js';

export type Outcome = 'correct' | 'wrong' | 'again' | 'hard' | 'good' | 'easy';

export const LEECH_THRESHOLD = 8;

export function ratingFor(format: CardFormat, outcome: Outcome): Rating {
  if (format === 'mcq' || format === 'cloze') {
    return outcome === 'correct' ? Rating.Good : Rating.Again;
  }
  switch (outcome) {
    case 'again': return Rating.Again;
    case 'hard': return Rating.Hard;
    case 'easy': return Rating.Easy;
    default: return Rating.Good;
  }
}

export function initialState(cardId: string, now: Date): ReviewState {
  const empty = createEmptyCard(now);
  return {
    cardId,
    due: empty.due.getTime(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsedDays: empty.elapsed_days,
    scheduledDays: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    state: empty.state,
    lastReview: null,
    suspended: false,
    flagged: false
  };
}

function toFsrsCard(state: ReviewState): FsrsCard {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as State,
    last_review: state.lastReview ? new Date(state.lastReview) : undefined
  };
}

export function applyRating(
  state: ReviewState,
  rating: Rating,
  now: Date,
  desiredRetention: number
): ReviewState {
  const scheduler = fsrs(generatorParameters({ request_retention: desiredRetention }));
  const { card } = scheduler.next(toFsrsCard(state), now, rating);

  const next: ReviewState = {
    ...state,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: now.getTime()
  };

  if (next.lapses >= LEECH_THRESHOLD) {
    next.suspended = true;
    next.flagged = true;
  }
  return next;
}

export function isDue(state: ReviewState, now: Date): boolean {
  return !state.suspended && state.due <= now.getTime();
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run app/tests/fsrs.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/scheduler/fsrs.ts app/tests/fsrs.test.ts
git commit -m "feat(app): fsrs wrapper with rating map and leech handling"
```

---

### Task 13: Session queue assembly

**Files:**
- Create: `app/src/scheduler/queue.ts`
- Create: `app/tests/queue.test.ts`

**Interfaces:**
- Consumes: `StoredCard`, `ReviewState` (Task 11), `isDue` (Task 12)
- Produces:
  - `dayKey(at: Date): string` — `YYYY-MM-DD` for the 04:00-local day containing `at`.
  - `buildSession(input: { cards: StoredCard[]; reviews: Map<string, ReviewState>; now: Date; newCardsPerDay: number; newCardsSeenToday: number }): StoredCard[]`

**Rules this task locks in:**
- Tombstoned and suspended cards never enter the queue.
- Due cards come first, **interleaved by category** — round-robin across categories rather than grouped.
- New cards (no `ReviewState`) follow, capped at `newCardsPerDay - newCardsSeenToday`, also interleaved.

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/queue.test.ts
import { describe, it, expect } from 'vitest';
import { buildSession, dayKey } from '../src/scheduler/queue.js';
import { initialState } from '../src/scheduler/fsrs.js';
import type { StoredCard, ReviewState } from '../src/db/schema.js';

const now = new Date('2026-09-18T09:00:00Z');

const card = (id: string, category: string): StoredCard => ({
  id, format: 'qa', category, tags: [], prompt: id, answer: 'a',
  source: { path: 'vault/a.md', block: id }, citations: [], tombstoned: false
});

const due = (id: string): ReviewState => ({ ...initialState(id, now), due: now.getTime() - 1000, reps: 3 });

describe('dayKey', () => {
  it('assigns 03:00 local to the previous day', () => {
    const late = new Date('2026-09-18T03:00:00');
    const early = new Date('2026-09-18T05:00:00');
    expect(dayKey(late)).toBe('2026-09-17');
    expect(dayKey(early)).toBe('2026-09-18');
  });
});

describe('buildSession', () => {
  it('puts due cards before new cards', () => {
    const cards = [card('card-new1', 'net'), card('card-due1', 'net')];
    const reviews = new Map([['card-due1', due('card-due1')]]);
    const session = buildSession({ cards, reviews, now, newCardsPerDay: 10, newCardsSeenToday: 0 });
    expect(session.map((c) => c.id)).toEqual(['card-due1', 'card-new1']);
  });

  it('interleaves categories instead of blocking them', () => {
    const cards = [
      card('card-a1', 'algo'), card('card-a2', 'algo'),
      card('card-n1', 'net'), card('card-n2', 'net')
    ];
    const reviews = new Map(cards.map((c) => [c.id, due(c.id)]));
    const session = buildSession({ cards, reviews, now, newCardsPerDay: 0, newCardsSeenToday: 0 });
    const categories = session.map((c) => c.category);
    expect(categories[0]).not.toBe(categories[1]);
    expect(categories[2]).not.toBe(categories[3]);
  });

  it('caps new cards by the remaining daily allowance', () => {
    const cards = Array.from({ length: 10 }, (_, i) => card(`card-n${i}`, 'net'));
    const session = buildSession({
      cards, reviews: new Map(), now, newCardsPerDay: 10, newCardsSeenToday: 7
    });
    expect(session).toHaveLength(3);
  });

  it('excludes suspended and tombstoned cards', () => {
    const cards = [
      { ...card('card-tomb', 'net'), tombstoned: true },
      card('card-susp', 'net'),
      card('card-ok', 'net')
    ];
    const reviews = new Map([
      ['card-susp', { ...due('card-susp'), suspended: true }],
      ['card-ok', due('card-ok')]
    ]);
    const session = buildSession({ cards, reviews, now, newCardsPerDay: 10, newCardsSeenToday: 0 });
    expect(session.map((c) => c.id)).toEqual(['card-ok']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run app/tests/queue.test.ts`
Expected: FAIL — cannot resolve `../src/scheduler/queue.js`.

- [ ] **Step 3: Write the implementation**

```ts
// app/src/scheduler/queue.ts
import type { ReviewState, StoredCard } from '../db/schema.js';
import { isDue } from './fsrs.js';

const DAY_START_HOUR = 4;

export function dayKey(at: Date): string {
  const shifted = new Date(at.getTime());
  shifted.setHours(shifted.getHours() - DAY_START_HOUR);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const d = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function interleave(cards: StoredCard[]): StoredCard[] {
  const byCategory = new Map<string, StoredCard[]>();
  for (const card of cards) {
    const bucket = byCategory.get(card.category) ?? [];
    bucket.push(card);
    byCategory.set(card.category, bucket);
  }

  const queues = [...byCategory.values()];
  const out: StoredCard[] = [];
  let remaining = cards.length;

  while (remaining > 0) {
    for (const queue of queues) {
      const next = queue.shift();
      if (!next) continue;
      out.push(next);
      remaining -= 1;
    }
  }
  return out;
}

export interface SessionInput {
  cards: StoredCard[];
  reviews: Map<string, ReviewState>;
  now: Date;
  newCardsPerDay: number;
  newCardsSeenToday: number;
}

export function buildSession(input: SessionInput): StoredCard[] {
  const { cards, reviews, now, newCardsPerDay, newCardsSeenToday } = input;

  const dueCards: StoredCard[] = [];
  const newCards: StoredCard[] = [];

  for (const card of cards) {
    if (card.tombstoned) continue;
    const state = reviews.get(card.id);
    if (!state) {
      newCards.push(card);
      continue;
    }
    if (state.suspended) continue;
    if (isDue(state, now)) dueCards.push(card);
  }

  const allowance = Math.max(0, newCardsPerDay - newCardsSeenToday);
  return [...interleave(dueCards), ...interleave(newCards).slice(0, allowance)];
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run app/tests/queue.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/scheduler/queue.ts app/tests/queue.test.ts
git commit -m "feat(app): session queue with interleaving and new-card cap"
```

---

### Task 14: Review persistence and daily counters

**Files:**
- Create: `app/src/db/reviews.ts`
- Create: `app/tests/reviews.test.ts`

**Interfaces:**
- Consumes: `FactotumDb`, `ReviewState` (Task 11), `applyRating`, `ratingFor` (Task 12), `dayKey` (Task 13)
- Produces:
  - `loadReviews(db): Promise<Map<string, ReviewState>>`
  - `recordReview(db, args: { card: StoredCard; outcome: Outcome; now: Date; desiredRetention: number; durationMs: number }): Promise<ReviewState>` — applies FSRS, persists state, appends a `reviewLog` entry, and increments the new-card counter for `dayKey(now)` when the card had no prior state.
  - `newCardsSeenToday(db, now): Promise<number>`
  - `flagCard(db, cardId): Promise<void>` — sets `suspended` and `flagged`, creating state if absent.
  - `exportBackup(db): Promise<string>` — JSON with `reviews`, `reviewLog`, `meta`, and a `version` field.

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/reviews.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/db/schema.js';
import { recordReview, loadReviews, newCardsSeenToday, flagCard, exportBackup } from '../src/db/reviews.js';
import type { StoredCard } from '../src/db/schema.js';

const now = new Date('2026-09-18T09:00:00Z');
const card: StoredCard = {
  id: 'card-aaaa', format: 'mcq', category: 'networking', tags: [], prompt: 'q',
  choices: [{ text: 'a', correct: true }],
  source: { path: 'vault/a.md', block: 'card-aaaa' }, citations: [], tombstoned: false
};

beforeEach(() => { indexedDB = new IDBFactory(); });

describe('recordReview', () => {
  it('persists fsrs state and appends a log entry', async () => {
    const db = await openDb();
    const state = await recordReview(db, { card, outcome: 'correct', now, desiredRetention: 0.9, durationMs: 1500 });

    expect(state.reps).toBe(1);
    expect((await loadReviews(db)).get('card-aaaa')?.due).toBe(state.due);
    expect(await db.getAll('reviewLog')).toHaveLength(1);
  });

  it('counts a first-time review against the daily new-card allowance', async () => {
    const db = await openDb();
    expect(await newCardsSeenToday(db, now)).toBe(0);
    await recordReview(db, { card, outcome: 'correct', now, desiredRetention: 0.9, durationMs: 100 });
    expect(await newCardsSeenToday(db, now)).toBe(1);

    await recordReview(db, { card, outcome: 'wrong', now, desiredRetention: 0.9, durationMs: 100 });
    expect(await newCardsSeenToday(db, now)).toBe(1);
  });
});

describe('flagCard', () => {
  it('suspends and flags the card', async () => {
    const db = await openDb();
    await flagCard(db, 'card-aaaa');
    const state = (await loadReviews(db)).get('card-aaaa');
    expect(state?.suspended).toBe(true);
    expect(state?.flagged).toBe(true);
  });
});

describe('exportBackup', () => {
  it('produces json containing reviews and the log', async () => {
    const db = await openDb();
    await recordReview(db, { card, outcome: 'correct', now, desiredRetention: 0.9, durationMs: 100 });
    const parsed = JSON.parse(await exportBackup(db));
    expect(parsed.version).toBe(1);
    expect(parsed.reviews).toHaveLength(1);
    expect(parsed.reviewLog).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run app/tests/reviews.test.ts`
Expected: FAIL — cannot resolve `../src/db/reviews.js`.

- [ ] **Step 3: Write the implementation**

```ts
// app/src/db/reviews.ts
import type { FactotumDb, ReviewState, StoredCard } from './schema.js';
import { applyRating, initialState, ratingFor, type Outcome } from '../scheduler/fsrs.js';
import { dayKey } from '../scheduler/queue.js';

export async function loadReviews(db: FactotumDb): Promise<Map<string, ReviewState>> {
  const all = await db.getAll('reviews');
  return new Map(all.map((state) => [state.cardId, state]));
}

function newCardsKey(now: Date): string {
  return `newCards:${dayKey(now)}`;
}

export async function newCardsSeenToday(db: FactotumDb, now: Date): Promise<number> {
  const value = await db.get('meta', newCardsKey(now));
  return typeof value === 'number' ? value : 0;
}

export interface RecordReviewArgs {
  card: StoredCard;
  outcome: Outcome;
  now: Date;
  desiredRetention: number;
  durationMs: number;
}

export async function recordReview(db: FactotumDb, args: RecordReviewArgs): Promise<ReviewState> {
  const { card, outcome, now, desiredRetention, durationMs } = args;
  const prior = await db.get('reviews', card.id);
  const isFirstReview = prior === undefined;

  const rating = ratingFor(card.format, outcome);
  const next = applyRating(prior ?? initialState(card.id, now), rating, now, desiredRetention);

  await db.put('reviews', next);
  await db.add('reviewLog', { cardId: card.id, ts: now.getTime(), rating, durationMs });

  if (isFirstReview) {
    const seen = await newCardsSeenToday(db, now);
    await db.put('meta', seen + 1, newCardsKey(now));
  }

  return next;
}

export async function flagCard(db: FactotumDb, cardId: string): Promise<void> {
  const prior = await db.get('reviews', cardId);
  const base = prior ?? initialState(cardId, new Date());
  await db.put('reviews', { ...base, suspended: true, flagged: true });
}

export async function exportBackup(db: FactotumDb): Promise<string> {
  const [reviews, reviewLog, metaKeys] = await Promise.all([
    db.getAll('reviews'),
    db.getAll('reviewLog'),
    db.getAllKeys('meta')
  ]);

  const meta: Record<string, unknown> = {};
  for (const key of metaKeys) meta[String(key)] = await db.get('meta', key);

  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), reviews, reviewLog, meta }, null, 2);
}
```

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: PASS — every suite green.

- [ ] **Step 5: Commit**

```bash
git add app/src/db/reviews.ts app/tests/reviews.test.ts
git commit -m "feat(app): persist reviews, daily counters, flagging and export"
```

---

### Task 15: App shell, theme tokens, and dashboard

**Files:**
- Create: `app/index.html`, `app/manifest.webmanifest`, `app/src/theme.css`, `app/src/styles.css`, `app/src/main.ts`, `app/src/ui/dashboard.ts`
- Create: `vite.config.ts`

**Interfaces:**
- Consumes: `openDb`, `getSettings`, `mergeDeck` (Task 11), `loadReviews`, `newCardsSeenToday` (Task 14), `buildSession` (Task 13)
- Produces:
  - `renderDashboard(root: HTMLElement, props: { dueCount: number; onStart: () => void; onSettings: () => void }): void`
  - `main.ts` boots: open db → fetch `deck.json` → merge → compute due count → render dashboard.

- [ ] **Step 1: Write the theme and shell**

```css
/* app/src/theme.css */
:root {
  --bg: #faf4e8;
  --surface: #f3ead9;
  --text: #2c2721;
  --dim: #8a8073;
  --line: #ddd2bd;
  --accent: #a66c14;
  --ok: #4f7a42;
  --bad: #b03a30;
  --accent-soft: rgb(166 108 20 / 12%);
  --ok-soft: rgb(79 122 66 / 13%);
  --bad-soft: rgb(176 58 48 / 10%);
  --on-accent: #fff8ec;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='day']) {
    --bg: #14151a;
    --surface: #1b1d23;
    --text: #e9e2d6;
    --dim: #8b8a86;
    --line: #2b2d34;
    --accent: #e8a33d;
    --ok: #6fcf97;
    --bad: #eb5f5f;
    --accent-soft: rgb(232 163 61 / 15%);
    --ok-soft: rgb(111 207 151 / 13%);
    --bad-soft: rgb(235 95 95 / 13%);
    --on-accent: #1a1204;
  }
}

:root[data-theme='night'] {
  --bg: #14151a;
  --surface: #1b1d23;
  --text: #e9e2d6;
  --dim: #8b8a86;
  --line: #2b2d34;
  --accent: #e8a33d;
  --ok: #6fcf97;
  --bad: #eb5f5f;
  --accent-soft: rgb(232 163 61 / 15%);
  --ok-soft: rgb(111 207 151 / 13%);
  --bad-soft: rgb(235 95 95 / 13%);
  --on-accent: #1a1204;
}
```

```css
/* app/src/styles.css */
* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 16px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  padding: env(safe-area-inset-top) 16px env(safe-area-inset-bottom);
  -webkit-text-size-adjust: 100%;
}

#app { max-width: 480px; margin: 0 auto; min-height: 100dvh; display: flex; flex-direction: column; }

.screen { flex: 1; display: flex; flex-direction: column; padding: 16px 0 24px; }
.top { display: flex; justify-content: space-between; align-items: center; color: var(--dim); font-size: 13px; }
.due-count { font-size: 56px; font-weight: 600; line-height: 1; }
.spacer { flex: 1; }

.btn {
  display: block; width: 100%; padding: 16px; border: 0; border-radius: 12px;
  background: var(--accent); color: var(--on-accent); font-size: 17px; font-weight: 600;
  cursor: pointer;
}
.btn:disabled { opacity: 0.5; }
.btn-quiet { background: transparent; color: var(--dim); font-weight: 400; font-size: 14px; }

.chip {
  display: inline-block; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 4px 9px; border-radius: 99px; background: var(--accent-soft); color: var(--accent);
}
```

```html
<!-- app/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="theme-color" content="#faf4e8" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#14151a" media="(prefers-color-scheme: dark)" />
    <link rel="manifest" href="./manifest.webmanifest" />
    <title>Factotum</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./src/main.ts"></script>
  </body>
</html>
```

```json
// app/manifest.webmanifest
{
  "name": "Factotum",
  "short_name": "Factotum",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#faf4e8",
  "theme_color": "#faf4e8",
  "icons": [
    { "src": "./icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "./icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'app',
  base: './',
  build: { outDir: '../dist', emptyOutDir: true }
});
```

- [ ] **Step 2: Write the dashboard and bootstrap**

```ts
// app/src/ui/dashboard.ts
export interface DashboardProps {
  dueCount: number;
  onStart: () => void;
  onSettings: () => void;
}

export function renderDashboard(root: HTMLElement, props: DashboardProps): void {
  root.innerHTML = `
    <section class="screen">
      <div class="top"><span>factotum</span><button class="btn-quiet" id="settings">settings</button></div>
      <div class="spacer"></div>
      <div style="text-align:center">
        <div class="due-count">${props.dueCount}</div>
        <div style="color:var(--dim)">cards due today</div>
      </div>
      <div class="spacer"></div>
      <button class="btn" id="start" ${props.dueCount === 0 ? 'disabled' : ''}>
        ${props.dueCount === 0 ? 'All clear' : 'Start review'}
      </button>
    </section>
  `;

  root.querySelector<HTMLButtonElement>('#start')?.addEventListener('click', props.onStart);
  root.querySelector<HTMLButtonElement>('#settings')?.addEventListener('click', props.onSettings);
}
```

```ts
// app/src/main.ts
import './theme.css';
import './styles.css';
import { openDb, type FactotumDb, type StoredCard } from './db/schema.js';
import { getSettings } from './db/settings.js';
import { mergeDeck } from './db/deck.js';
import { loadReviews, newCardsSeenToday } from './db/reviews.js';
import { buildSession } from './scheduler/queue.js';
import { renderDashboard } from './ui/dashboard.js';
import type { Deck } from '../../pipeline/src/types.js';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('#app missing');

async function syncDeck(db: FactotumDb): Promise<void> {
  try {
    const response = await fetch('./deck.json', { cache: 'no-cache' });
    if (!response.ok) return;
    const deck = (await response.json()) as Deck;
    await mergeDeck(db, deck);
  } catch {
    // Offline: the previously merged deck in IndexedDB is authoritative.
  }
}

export async function currentSession(db: FactotumDb, now: Date): Promise<StoredCard[]> {
  const [cards, reviews, settings, seen] = await Promise.all([
    db.getAll('cards'),
    loadReviews(db),
    getSettings(db),
    newCardsSeenToday(db, now)
  ]);

  return buildSession({
    cards,
    reviews,
    now,
    newCardsPerDay: settings.newCardsPerDay,
    newCardsSeenToday: seen
  });
}

async function boot(): Promise<void> {
  const db = await openDb();
  const settings = await getSettings(db);
  if (settings.theme !== 'auto') document.documentElement.dataset['theme'] = settings.theme;

  await syncDeck(db);
  const session = await currentSession(db, new Date());

  renderDashboard(root!, {
    dueCount: session.length,
    onStart: () => { window.location.hash = '#review'; },
    onSettings: () => { window.location.hash = '#settings'; }
  });
}

void boot();
```

- [ ] **Step 3: Copy the deck into the app build and run the dev server**

Add to `package.json` scripts:

```json
"predev": "cp deck/deck.json app/public/deck.json",
"prebuild:app": "cp deck/deck.json app/public/deck.json"
```

Run: `mkdir -p app/public && npm run dev`
Expected: dev server starts; opening it shows the dashboard with a non-zero due count (every seeded card is new, so the count equals the new-card cap of 10).

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/index.html app/manifest.webmanifest app/src/theme.css app/src/styles.css app/src/main.ts app/src/ui/dashboard.ts vite.config.ts package.json
git commit -m "feat(app): shell, theme tokens and dashboard"
```

---

### Task 16: Review screen with all four formats

**Files:**
- Create: `app/src/ui/renderers.ts`, `app/src/ui/review.ts`, `app/src/ui/flag.ts`
- Create: `app/tests/renderers.test.ts`
- Modify: `app/src/main.ts` (route `#review`), `app/src/styles.css` (review layout)

**Interfaces:**
- Consumes: `StoredCard` (Task 11), `Outcome` (Task 12), `recordReview`, `flagCard` (Task 14)
- Produces:
  - `normalizeAnswer(value: string): string` — lowercased, trimmed, internal whitespace collapsed.
  - `checkCloze(input: string, expected: string): boolean`
  - `renderPrompt(card: StoredCard): string` — HTML for the upper half.
  - `renderActions(card: StoredCard, revealed: boolean): string` — HTML for the thumb zone.
  - `issueUrl(card: StoredCard, repo: string): string` — prefilled GitHub issue URL.
  - `startReview(root, deps): Promise<void>` — drives the session to completion, then returns to the dashboard.

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/renderers.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeAnswer, checkCloze, renderPrompt, renderActions } from '../src/ui/renderers.js';
import { issueUrl } from '../src/ui/flag.js';
import type { StoredCard } from '../src/db/schema.js';

const base = {
  category: 'networking', tags: [], source: { path: 'vault/a.md', block: 'card-aaaa' },
  citations: ['RFC 9293'], tombstoned: false
};

const cloze: StoredCard = { ...base, id: 'card-aaaa', format: 'cloze', prompt: 'MTU is ___.', answer: '1500 bytes' };
const mcq: StoredCard = {
  ...base, id: 'card-bbbb', format: 'mcq', prompt: 'Layer?',
  choices: [{ text: 'Transport', correct: true }, { text: 'Network', correct: false }]
};
const recall: StoredCard = { ...base, id: 'card-cccc', format: 'recall', prompt: 'Explain ARQ.' };

describe('answer checking', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeAnswer('  1500   Bytes ')).toBe('1500 bytes');
  });

  it('accepts answers differing only by case or spacing', () => {
    expect(checkCloze('1500  BYTES', '1500 bytes')).toBe(true);
    expect(checkCloze('1400 bytes', '1500 bytes')).toBe(false);
  });
});

describe('renderPrompt', () => {
  it('shows the category chip and prompt text', () => {
    const html = renderPrompt(cloze);
    expect(html).toContain('networking');
    expect(html).toContain('MTU is ___.');
  });

  it('escapes html in prompts', () => {
    const html = renderPrompt({ ...recall, prompt: '<script>x</script>' });
    expect(html).not.toContain('<script>');
  });
});

describe('renderActions', () => {
  it('renders one button per choice for mcq', () => {
    const html = renderActions(mcq, false);
    expect((html.match(/data-choice=/g) ?? [])).toHaveLength(2);
  });

  it('renders an input and check button for cloze before reveal', () => {
    expect(renderActions(cloze, false)).toContain('data-role="cloze-input"');
  });

  it('renders four rating buttons for self-graded cards after reveal', () => {
    const html = renderActions(recall, true);
    for (const outcome of ['again', 'hard', 'good', 'easy']) {
      expect(html).toContain(`data-outcome="${outcome}"`);
    }
  });

  it('always renders the flag button', () => {
    expect(renderActions(mcq, false)).toContain('data-role="flag"');
    expect(renderActions(recall, true)).toContain('data-role="flag"');
  });
});

describe('issueUrl', () => {
  it('prefills the card id and note path', () => {
    const url = issueUrl(cloze, 'cesar/factotum');
    expect(url).toContain('https://github.com/cesar/factotum/issues/new');
    expect(decodeURIComponent(url)).toContain('card-aaaa');
    expect(decodeURIComponent(url)).toContain('vault/a.md');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run app/tests/renderers.test.ts`
Expected: FAIL — cannot resolve `../src/ui/renderers.js`.

- [ ] **Step 3: Write the renderers and flag helper**

```ts
// app/src/ui/renderers.ts
import type { StoredCard } from '../db/schema.js';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function checkCloze(input: string, expected: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(expected);
}

export function renderPrompt(card: StoredCard): string {
  return `
    <div class="prompt-area">
      <span class="chip">${escapeHtml(card.category)}</span>
      <p class="prompt">${escapeHtml(card.prompt)}</p>
    </div>
  `;
}

function flagButton(): string {
  return `<button class="btn-quiet" data-role="flag">⚑ looks wrong</button>`;
}

function citations(card: StoredCard): string {
  if (card.citations.length === 0) return '';
  return `<p class="citation">${escapeHtml(card.citations.join(' · '))}</p>`;
}

function ratingRow(): string {
  return `
    <div class="rating-row">
      ${['again', 'hard', 'good', 'easy']
        .map((o) => `<button class="rate" data-outcome="${o}">${o}</button>`)
        .join('')}
    </div>
  `;
}

export function renderActions(card: StoredCard, revealed: boolean): string {
  const tail = `${citations(card)}${flagButton()}`;

  if (card.format === 'mcq') {
    const choices = (card.choices ?? [])
      .map((choice, index) =>
        `<button class="choice" data-choice="${index}" data-correct="${choice.correct}">
           ${escapeHtml(choice.text)}
         </button>`
      )
      .join('');
    return `<div class="action-area">${choices}${revealed ? tail : flagButton()}</div>`;
  }

  if (card.format === 'cloze') {
    if (!revealed) {
      return `
        <div class="action-area">
          <input class="answer-input" data-role="cloze-input" autocapitalize="off"
                 autocomplete="off" autocorrect="off" placeholder="type answer" />
          <button class="btn" data-role="check">Check</button>
          ${flagButton()}
        </div>
      `;
    }
    return `
      <div class="action-area">
        <p class="expected">${escapeHtml(card.answer ?? '')}</p>
        <button class="btn" data-outcome="continue">Continue</button>
        <button class="btn-quiet" data-outcome="override">I actually knew this</button>
        ${tail}
      </div>
    `;
  }

  if (!revealed) {
    return `<div class="action-area"><button class="btn" data-role="reveal">Show answer</button>${flagButton()}</div>`;
  }
  return `
    <div class="action-area">
      ${card.answer ? `<p class="expected">${escapeHtml(card.answer)}</p>` : ''}
      ${ratingRow()}
      ${tail}
    </div>
  `;
}
```

```ts
// app/src/ui/flag.ts
import type { StoredCard } from '../db/schema.js';

export function issueUrl(card: StoredCard, repo: string): string {
  const title = `Card ${card.id} looks wrong`;
  const body = [
    `**Card:** \`${card.id}\``,
    `**Note:** \`${card.source.path}\``,
    `**Prompt:** ${card.prompt}`,
    card.answer ? `**Answer:** ${card.answer}` : '',
    '',
    'Flagged from the app during review.'
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({ title, body, labels: 'card-error' });
  return `https://github.com/${repo}/issues/new?${params.toString()}`;
}
```

- [ ] **Step 4: Write the review screen driver**

```ts
// app/src/ui/review.ts
import type { FactotumDb, StoredCard } from '../db/schema.js';
import type { Outcome } from '../scheduler/fsrs.js';
import { recordReview, flagCard } from '../db/reviews.js';
import { getSettings } from '../db/settings.js';
import { checkCloze, renderActions, renderPrompt } from './renderers.js';
import { issueUrl } from './flag.js';

export interface ReviewDeps {
  db: FactotumDb;
  session: StoredCard[];
  repo: string;
  onDone: (reviewed: number) => void;
}

export async function startReview(root: HTMLElement, deps: ReviewDeps): Promise<void> {
  const settings = await getSettings(deps.db);
  let index = 0;
  let reviewed = 0;

  const advance = (): void => {
    index += 1;
    if (index >= deps.session.length) deps.onDone(reviewed);
    else draw(false);
  };

  const submit = async (card: StoredCard, outcome: Outcome, startedAt: number): Promise<void> => {
    await recordReview(deps.db, {
      card,
      outcome,
      now: new Date(),
      desiredRetention: settings.desiredRetention,
      durationMs: Date.now() - startedAt
    });
    reviewed += 1;
    advance();
  };

  function draw(revealed: boolean, pendingOutcome: Outcome | null = null): void {
    const card = deps.session[index];
    if (!card) return deps.onDone(reviewed);

    const startedAt = Date.now();
    root.innerHTML = `
      <section class="screen review">
        <div class="top"><span>${index + 1} / ${deps.session.length}</span></div>
        <div class="progress"><i style="width:${(index / deps.session.length) * 100}%"></i></div>
        ${renderPrompt(card)}
        ${renderActions(card, revealed)}
      </section>
    `;

    root.querySelector('[data-role="flag"]')?.addEventListener('click', () => {
      void flagCard(deps.db, card.id).then(() => {
        window.open(issueUrl(card, deps.repo), '_blank');
        advance();
      });
    });

    root.querySelector('[data-role="reveal"]')?.addEventListener('click', () => draw(true));

    root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        if (revealed) return;
        const correct = button.dataset['correct'] === 'true';
        button.classList.add(correct ? 'is-correct' : 'is-wrong');
        void submit(card, correct ? 'correct' : 'wrong', startedAt);
      });
    });

    root.querySelector('[data-role="check"]')?.addEventListener('click', () => {
      const input = root.querySelector<HTMLInputElement>('[data-role="cloze-input"]');
      const correct = checkCloze(input?.value ?? '', card.answer ?? '');
      if (correct) void submit(card, 'correct', startedAt);
      else draw(true, 'wrong');
    });

    root.querySelectorAll<HTMLButtonElement>('[data-outcome]').forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset['outcome'];
        if (value === 'continue') return void submit(card, pendingOutcome ?? 'wrong', startedAt);
        if (value === 'override') return void submit(card, 'correct', startedAt);
        void submit(card, value as Outcome, startedAt);
      });
    });
  }

  draw(false);
}
```

- [ ] **Step 5: Add the review layout CSS**

Append to `app/src/styles.css`:

```css
.review { justify-content: flex-start; }
.progress { height: 4px; border-radius: 2px; background: var(--line); overflow: hidden; margin: 8px 0 4px; }
.progress > i { display: block; height: 100%; background: var(--accent); transition: width 0.2s; }

.prompt-area { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 12px; }
.prompt { font-size: 22px; line-height: 1.35; margin: 0; }

.action-area { display: flex; flex-direction: column; gap: 8px; }
.choice {
  width: 100%; text-align: left; padding: 14px; border-radius: 10px;
  border: 1px solid var(--line); background: var(--surface); color: var(--text); font-size: 16px;
}
.choice.is-correct { border-color: var(--ok); background: var(--ok-soft); }
.choice.is-wrong { border-color: var(--bad); background: var(--bad-soft); }

.answer-input {
  width: 100%; padding: 14px; border-radius: 10px; border: 1px solid var(--line);
  background: var(--surface); color: var(--text); font-size: 17px;
}
.expected { text-align: center; font-size: 18px; color: var(--ok); margin: 4px 0; }
.citation { text-align: center; font-size: 12px; color: var(--dim); margin: 0; }

.rating-row { display: flex; gap: 6px; }
.rate {
  flex: 1; padding: 14px 0; border-radius: 10px; border: 1px solid var(--line);
  background: var(--surface); color: var(--text); font-size: 13px; text-transform: capitalize;
}
```

- [ ] **Step 6: Route `#review` in `main.ts`**

Replace the `renderDashboard` call in `boot()` with a hash router:

```ts
import { startReview } from './ui/review.js';
import { renderSettings } from './ui/settings.js';

const REPO = 'cesar/factotum';

async function route(db: FactotumDb): Promise<void> {
  const session = await currentSession(db, new Date());

  if (window.location.hash === '#review' && session.length > 0) {
    await startReview(root!, {
      db,
      session,
      repo: REPO,
      onDone: () => { window.location.hash = ''; }
    });
    return;
  }

  if (window.location.hash === '#settings') {
    await renderSettings(root!, db, () => { window.location.hash = ''; });
    return;
  }

  renderDashboard(root!, {
    dueCount: session.length,
    onStart: () => { window.location.hash = '#review'; },
    onSettings: () => { window.location.hash = '#settings'; }
  });
}
```

and in `boot()`, after `syncDeck`:

```ts
  window.addEventListener('hashchange', () => { void route(db); });
  await route(db);
```

(Task 17 creates `renderSettings`; until then, stub it with `export async function renderSettings(): Promise<void> {}` in `app/src/ui/settings.ts` so this task typechecks on its own.)

- [ ] **Step 7: Run tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add app/src/ui app/src/main.ts app/src/styles.css app/tests/renderers.test.ts
git commit -m "feat(app): review screen with all four card formats and flagging"
```

---

### Task 17: Settings screen and backup export

**Files:**
- Create (replacing the stub): `app/src/ui/settings.ts`
- Create: `app/tests/settings.test.ts`

**Interfaces:**
- Consumes: `getSettings`, `saveSettings` (Task 11), `exportBackup` (Task 14)
- Produces: `renderSettings(root: HTMLElement, db: FactotumDb, onBack: () => void): Promise<void>`, and `clampSettings(input: Partial<Settings>): Settings`

- [ ] **Step 1: Write the failing test**

```ts
// app/tests/settings.test.ts
import { describe, it, expect } from 'vitest';
import { clampSettings } from '../src/ui/settings.js';

describe('clampSettings', () => {
  it('keeps valid values', () => {
    expect(clampSettings({ desiredRetention: 0.85, newCardsPerDay: 20, theme: 'night' }))
      .toEqual({ desiredRetention: 0.85, newCardsPerDay: 20, theme: 'night' });
  });

  it('clamps retention into 0.70–0.97', () => {
    expect(clampSettings({ desiredRetention: 0.99 }).desiredRetention).toBe(0.97);
    expect(clampSettings({ desiredRetention: 0.1 }).desiredRetention).toBe(0.7);
  });

  it('clamps new cards into 0–100 and rounds', () => {
    expect(clampSettings({ newCardsPerDay: 500 }).newCardsPerDay).toBe(100);
    expect(clampSettings({ newCardsPerDay: 7.6 }).newCardsPerDay).toBe(8);
  });

  it('falls back to defaults for missing or invalid fields', () => {
    expect(clampSettings({})).toEqual({ desiredRetention: 0.9, newCardsPerDay: 10, theme: 'auto' });
    expect(clampSettings({ theme: 'chartreuse' as never }).theme).toBe('auto');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run app/tests/settings.test.ts`
Expected: FAIL — `clampSettings` is not exported.

- [ ] **Step 3: Write the implementation**

```ts
// app/src/ui/settings.ts
import type { FactotumDb, Settings } from '../db/schema.js';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../db/settings.js';
import { exportBackup } from '../db/reviews.js';

const THEMES: Settings['theme'][] = ['auto', 'day', 'night'];

export function clampSettings(input: Partial<Settings>): Settings {
  const retention = typeof input.desiredRetention === 'number' && Number.isFinite(input.desiredRetention)
    ? Math.min(0.97, Math.max(0.7, input.desiredRetention))
    : DEFAULT_SETTINGS.desiredRetention;

  const newCards = typeof input.newCardsPerDay === 'number' && Number.isFinite(input.newCardsPerDay)
    ? Math.min(100, Math.max(0, Math.round(input.newCardsPerDay)))
    : DEFAULT_SETTINGS.newCardsPerDay;

  const theme = input.theme && THEMES.includes(input.theme) ? input.theme : DEFAULT_SETTINGS.theme;

  return { desiredRetention: retention, newCardsPerDay: newCards, theme };
}

function applyTheme(theme: Settings['theme']): void {
  if (theme === 'auto') delete document.documentElement.dataset['theme'];
  else document.documentElement.dataset['theme'] = theme;
}

export async function renderSettings(root: HTMLElement, db: FactotumDb, onBack: () => void): Promise<void> {
  const settings = await getSettings(db);

  root.innerHTML = `
    <section class="screen">
      <div class="top"><button class="btn-quiet" id="back">← back</button><span>settings</span></div>
      <label class="field">Theme
        <select id="theme">
          ${THEMES.map((t) => `<option value="${t}" ${t === settings.theme ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </label>
      <label class="field">Desired retention
        <input id="retention" type="number" step="0.01" min="0.7" max="0.97" value="${settings.desiredRetention}" />
      </label>
      <label class="field">New cards per day
        <input id="newcards" type="number" step="1" min="0" max="100" value="${settings.newCardsPerDay}" />
      </label>
      <div class="spacer"></div>
      <button class="btn" id="export">Export backup</button>
    </section>
  `;

  const persist = async (): Promise<void> => {
    const next = clampSettings({
      theme: root.querySelector<HTMLSelectElement>('#theme')?.value as Settings['theme'],
      desiredRetention: Number(root.querySelector<HTMLInputElement>('#retention')?.value),
      newCardsPerDay: Number(root.querySelector<HTMLInputElement>('#newcards')?.value)
    });
    await saveSettings(db, next);
    applyTheme(next.theme);
  };

  root.querySelector('#theme')?.addEventListener('change', () => void persist());
  root.querySelector('#retention')?.addEventListener('change', () => void persist());
  root.querySelector('#newcards')?.addEventListener('change', () => void persist());
  root.querySelector('#back')?.addEventListener('click', onBack);

  root.querySelector('#export')?.addEventListener('click', () => {
    void exportBackup(db).then((json) => {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `factotum-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
  });
}
```

Append to `app/src/styles.css`:

```css
.field { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--line); }
.field select, .field input {
  padding: 8px 10px; border-radius: 8px; border: 1px solid var(--line);
  background: var(--surface); color: var(--text); font-size: 16px; max-width: 140px;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/ui/settings.ts app/src/styles.css app/tests/settings.test.ts
git commit -m "feat(app): settings screen with theme, scheduler knobs and export"
```

---

### Task 18: Service worker, offline shell, and Pages deploy

**Files:**
- Create: `app/src/sw.ts`, `.github/workflows/deploy.yml`, `app/public/icon-192.png`, `app/public/icon-512.png`
- Modify: `app/src/main.ts` (register the service worker), `vite.config.ts` (build the worker)

**Interfaces:**
- Consumes: the built app from Task 15
- Produces: an installable PWA served from GitHub Pages that opens and reviews with no network.

- [ ] **Step 1: Write the service worker**

```ts
// app/src/sw.ts
/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE = 'factotum-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // deck.json: network first so a rebuilt deck arrives, cache as fallback offline.
  if (request.url.endsWith('deck.json')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit ?? Response.error()))
    );
    return;
  }

  // Everything else: cache first.
  event.respondWith(
    caches.match(request).then((hit) => hit ?? fetch(request).then((response) => {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(request, copy));
      return response;
    }))
  );
});
```

- [ ] **Step 2: Register it and build it**

Add to the end of `app/src/main.ts`:

```ts
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(new URL('./sw.ts', import.meta.url), { type: 'module' });
  });
}
```

Add the two PNG icons (a plain `#a66c14` square with a white "F" is fine — generate with:
`npx --yes sharp-cli -i /dev/null` is not reliable, so instead create them once with:

```bash
node -e "
const s=[192,512];const fs=require('fs');
for(const n of s){
  const svg=\`<svg xmlns='http://www.w3.org/2000/svg' width='\${n}' height='\${n}'><rect width='100%' height='100%' fill='#a66c14'/><text x='50%' y='58%' font-family='sans-serif' font-size='\${n*0.55}' fill='#fff8ec' text-anchor='middle'>F</text></svg>\`;
  fs.writeFileSync(\`app/public/icon-\${n}.svg\`, svg);
}
console.log('svg icons written');
"
```

then convert with `npx --yes @resvg/resvg-js-cli app/public/icon-192.svg app/public/icon-192.png` and the same for 512, or draw them by hand — the requirement is only that both PNGs exist at those sizes.)

- [ ] **Step 3: Verify the production build**

Run: `npm run build:app && ls dist && npx --yes serve dist -l 4173`
Expected: `dist/index.html`, hashed JS, `deck.json`, both icons, and `sw.js` present; the served app loads, a review session runs, and reloading with the dev server stopped still works (service worker serving from cache).

- [ ] **Step 4: Write the deploy workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy app

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build:app
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 5: Commit, push, and install on the phone**

```bash
git add app/src/sw.ts app/src/main.ts app/public .github/workflows/deploy.yml vite.config.ts
git commit -m "feat(app): offline service worker and pages deployment"
git push
```

Then: enable Pages (`Settings → Pages → Source: GitHub Actions`), wait for the run, open the Pages URL in **Safari** on the iPhone, and use **Share → Add to Home Screen**. Launch from the Home Screen icon and complete one review session.

Expected: the app opens standalone (no Safari chrome), shows the dashboard, runs a session, and still works with the phone in Airplane Mode.

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| §3.2 card syntax, four constructs | 3, 4 |
| §3.1 category gate | 2 |
| §3.3 citations surfaced on answers | 9–10 (content), 16 (rendering) |
| §3.4 stable IDs written back | 5, 7 |
| §4 repo layout, single public repo | 1, 7, 18 |
| §4.2 deck format | 6 |
| §4.3 IndexedDB stores | 11, 14 |
| §4.4 deck merge semantics | 11 |
| §4.5 export backup | 14, 17 |
| §5 FSRS, rating map, cloze override, new-card cap, interleaving, leeches | 12, 13, 16 |
| §6 flag button + GitHub issue | 16 |
| §7.1 dashboard, review split layout | 15, 16 |
| §7.2 theme tokens, both schemes, override | 15, 17 |
| §10 parser / merge / scheduler tests | 2–6, 11–13 |
| §11 Phase 1 scope | all |

Phase 2 items (streak, freezes, heatmap, mastery, push, badge) are intentionally absent per the Global Constraints.

**Placeholder scan:** no TBDs; every code step carries complete code. Task 8–10 content tasks specify exact filenames, topics, citations, card counts, and a full worked example rather than "write some notes."

**Type consistency:** `ParsedCard.anchorLine`, `DeckCard.source.block`, `ReviewState.cardId`, `Settings.newCardsPerDay`, and `Outcome` are used with identical names and types across Tasks 2–17. `renderSettings` is stubbed in Task 16 and implemented in Task 17, so each task typechecks independently.
