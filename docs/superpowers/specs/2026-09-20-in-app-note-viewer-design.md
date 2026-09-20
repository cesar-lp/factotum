# In-app note viewer

Read the vault note a card came from, inside the app, with the answers to
other cards masked according to their FSRS schedule.

Scope is a new read-only surface plus the pipeline output that feeds it. No
change to FSRS behaviour, the card parser's card output, the vault format,
`deck.json`, or the IndexedDB schema.

## Why

PR #24 added an "open note" button to revealed cards, firing
`obsidian://open?vault=…&file=…`. On a Mac with the vault open in Obsidian
that works. On the iPhone PWA — the app's actual target — it works only if
Obsidian is installed *and* the vault is synced to the phone, which, since
the vault lives in this repo, it generally is not. The button is dead
weight in the place the app is most used.

The underlying want is not a better deep link. It is to reread a note on
the phone: "I keep fumbling consensus, show me the note." That is a reading
surface, and the app has never had one.

### What blocks a naive version

**The deck carries no note text.** `deck.json` holds `prompt`, `answer`,
`choices`, `citations`, and `source.path` — a pointer, not the note.

**A note is an answer key.** The vault's card syntax is inline, so the
source of `vault/database-internals/consensus.md` reads:

```markdown
...both phases require agreement from a ==majority== of nodes... ^card-ubdh

> [!card] mcq
> Why must a Paxos proposer get agreement from a majority of acceptors?
> - [x] Any two majorities out of the same set must overlap in at least one node…
> - [ ] A majority is required only to make the protocol fair to slow nodes
```

Rendering that note as markdown puts a literal `[x]` next to the correct
choice, and shows every cloze answer as plain text. Opening the note to
understand one question would hand over the answers to the next eight.

So the viewer cannot be a generic markdown renderer. It has to understand
card constructs whatever else it does — which is what makes masking cheap
rather than an extra feature.

### What does *not* block it

**Size.** Measured, not estimated:

| | raw | gzipped |
| --- | --- | --- |
| `deck/deck.json` (1310 cards) | 1.2 MB | 205 KB |
| all 178 vault notes | 694 KB | 232 KB |

Carrying every note whole roughly doubles the gzipped payload rather than
multiplying it, and the largest single note is 7.8 KB. Whole-note viewing
is therefore decided on reading-experience grounds, not budget. Section 3
keeps that payload off the review path regardless.

(This table is a design-time measurement, taken before this branch was
rebased onto a vault that had grown in the meantime. The README's
[Scripts](../../../README.md) section has the current, larger numbers —
241/302 KB gzipped for `deck.json`/`notes.json` — which supersede these
without changing any conclusion above: the payload still roughly doubles,
not multiplies.)

**Renderer scope.** The vault is 185 headings, 42 code fences, and **4**
list lines outside callouts. It is prose and card callouts, almost
entirely. `app/src/ui/renderers.ts` already supplies the inline layer
(`escapeHtml` plus `` ` ``/`**`/`*`).

**Cross-references.** The vault contains zero `[[wikilinks]]` today, so
link navigation is out of scope and not a live constraint.

## Design

### 1. Masking rule

`buildSession` splits cards three ways: no `ReviewState` row at all
("new"), and otherwise `isDue(state, now)` or not. The rule is:

| bucket | meaning | masked |
| --- | --- | --- |
| no review state | never been asked | **no** |
| has state, due | pending test | **yes** |
| has state, not due | inside retention window | **no** |

**Mask iff due.** Masking protects a pending test. A new card has no
pending test, and the note is the source material you would learn it from
anyway — reading before first review is studying, which is the normal order
of operations.

The alternative (mask new cards too) was rejected because it inverts the
property that makes this design worth having. A freshly written note would
be 100% masked on the day you most want to read it, and notes would go
unreadable → readable as you master them, when the desirable direction is
readable → self-test → readable.

The accepted cost: `newCardsPerDay` can pull a new card into today's
session, so reading its note first blunts that card's first exposure. This
is judged a small loss against keeping new notes readable.

Two riders:

- **The card you arrived from is never masked**, though it is by definition
  due. You have just answered it in review; there is nothing left to
  protect. The viewer scrolls to it and highlights it.
- **Masking is per-construct and tappable.** Any single decision is one tap
  to override, and nothing is ever truly hidden.

Due-ness is read from `isDue` in `app/src/scheduler/fsrs.ts:132`. It is reused,
never reimplemented — there must not be a second notion of "due" in the app.

### 2. Pipeline output: `notes.json`

`parseCards` already walks a note body as a block stream, classifying
fences, `[!card]` callouts, and block boundaries (blank, heading, list,
blockquote), and joining wrapped prose into a `blockText` with per-line
offsets. A note emitter is the same walk keeping the blocks instead of
discarding them, and it already knows every card's exact position — that is
how `^card-xxxx` anchors get minted.

```ts
interface NoteDoc {
  path: string;              // 'vault/database-internals/consensus.md'
  title: string;             // first H1, else filename stem
  topic: string;
  category: string;
  citations: string[];
  blocks: NoteBlock[];
}

type NoteBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; lang: string | null; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'prose'; text: string;
      clozes: { start: number; end: number; cardId: string; answer: string }[] }
  | { kind: 'qa'; cardId: string; prompt: string; answer: string }
  | { kind: 'card'; cardId: string; format: 'mcq' | 'recall';
      prompt: string; choices?: Choice[]; answer?: string };

interface Notes { generatedAt: string; notes: NoteDoc[] }
```

Three decisions embedded here:

**`qa` is its own block kind, not prose with a span.** A
`Question :: Answer` line renders literally as `Question :: Answer`; the
answer is the text. It needs the same masking treatment as a cloze, so it
cannot be a prose block.

**Cloze offsets index the joined `blockText`,** which `buildBlock` already
computes along with each match's offset. Source wrapping is irrelevant once
the text is HTML, so joined prose is the right unit and offsets transfer
directly.

**`generatedAt` is preserved when content is unchanged**, exactly as
`build.ts` already does for `deck.json` (`build.ts:76`). Without this, CI's
deck-drift check (`git status --porcelain` must print nothing) flaps on
every unrelated PR. Output is stable-sorted by path via the existing
`stableStringify`.

**Implementation: `parseBlocks()` is a sibling of `parseCards()` in
`cards.ts`, sharing the exported regexes** (`HIGHLIGHT`, `QA`, `FENCE`,
`CALLOUT_OPEN`, `CALLOUT_LINE`, `CHOICE`). `parseCards` is not refactored to
emit both. That function is the most delicate in the pipeline — its bugs
orphan card ids, which `CLAUDE.md` flags as silent rather than loud — and
restructuring it for a reading feature is a bad trade.

(The name `parseNote` is already taken by `build.ts`'s per-file entry point,
which is a different thing — it wraps frontmatter parsing, `parseCards`, and
`writeBackIds`.)

**Card ids are resolved by ordinal, not re-derived.** `parseCards` returns
cards with `id: string | null`; `assignIds` fills the nulls afterwards, in
`build.ts`'s `parseNote`. So `parseBlocks` cannot know final ids and must
not try. It emits `cardIndex` — an ordinal into the card array
`parseCards` produced from the same body — and `build.ts` zips ids in after
`assignIds` has run.

This works because both functions walk the same structure in the same order,
including multiple clozes within one joined prose block, which
`blockClozeCards` emits in match order. The ordinal is therefore the *only*
correlation needed, and the zip is total: every card must be consumed and
every `cardIndex` must resolve, or the build throws. That turns the
correlation from an assumption into an assertion on every build of every
note, which is a stronger guard than the corpus test alone.

So the `NoteBlock` types above carry `cardIndex: number` as emitted by
`parseBlocks`, and `cardId: string` after `build.ts` resolves them. Only the
resolved form is serialized to `notes.json`.

The drift risk this accepts is real, and this repo already has a position
on it: the regexes are exported precisely so `lint.ts` avoids "a hand-copied
lookalike that can silently drift." The guard here is the corpus
cross-check test in Testing below, which turns drift into a CI failure.

### 3. Transport and storage

`notes.json` is a **separate build output, not a field in `deck.json`.**

`deck.json` is fetched network-first with a 2.5s timeout
(`NETWORK_TIMEOUT_MS`, `sw.ts`). Doubling its size makes that timeout fire
more often on cellular, so the app falls back to cache more often at review
start. Reading material must not slow the core loop in sessions that never
open a note.

Pre-parsed JSON is bulkier than raw markdown; `notes.json` is expected
around **270 KB gzipped**.

**Client-side storage: none.** `deck.json` passes through `mergeDeck` into
IndexedDB because cards need review state joined to them and need
tombstoning across rebuilds. Notes need neither — there is no per-note
state, and a removed note simply stops being listed. So `notes.json` is
fetched, memoized at module level for the session, and left to the Cache
API for persistence.

Consequently **`openDb` stays at version 1**: no migration, no new object
store. IndexedDB holds the one irreplaceable thing in this app (FSRS
history), and a reading feature should not touch it.

**Service worker:** `strategyFor` gains
`if (pathname.endsWith('/notes.json')) return 'network-first';`, mirroring
`deck.json` — stable URL, changing content.

**Which notes are included:** exactly the set the build already scans for
cards — notes carrying a `category` in frontmatter. Drafts and daily notes
without one are ignored by the pipeline today and stay invisible to the
viewer, so the viewer never shows a note the deck knows nothing about.

**Fetch timing:** lazily on first note open, and prefetched once after the
dashboard has rendered, via `requestIdleCallback` where available and a
short `setTimeout` fallback on Safari. The prefetch is fire-and-forget: a
failure is silent and simply leaves the lazy path to retry, since nothing
on screen depends on it.

**Offline gap, stated:** a fresh install that goes offline immediately,
without idling or opening a note, has no `notes.json`. The viewer says so
plainly rather than hanging. Review is unaffected, which is the point of
keeping the two files apart.

**Build wiring:** `cli.ts` takes a second output path. `package.json`'s
`predev` *and* `prebuild:app` both copy `deck.json` into `app/public/`;
both need the same line for `notes.json`.

### 4. Route and entry points

**Route:** `#note/<encoded vault path>`, with an optional arrived-from card
appended as `#note/<encoded vault path>/<card-id>`. The card id is what
Section 1's "never mask the card you arrived from" rider keys on, and what
the viewer scrolls to; entry point B omits it. `^card-[a-z0-9]{4}` is a
fixed, URL-safe shape, so the two segments split unambiguously on the last
`/` — vault paths themselves contain `/`, so the card id must be the
trailing segment, not the leading one.

This follows the `#focus/<category>` precedent in `route.ts` — including its
`try`/`catch` around `decodeURIComponent` (a hash arrives hand-edited, from
stale history, and from bookmarks) and its habit of validating against real
data and falling back to `dashboard` rather than trusting the hash. An
unknown path and a malformed escape both fall back to the dashboard. A card
id that is unknown, or that does not belong to the note in the path, is
ignored — the note still opens, with nothing force-revealed.

**Entry point A — review.** The existing `[data-role="source"]` handler
(`review.ts:340`) is repointed from `obsidianUrl` to the viewer route.
Every constraint in that handler's comment holds and matters more: opening
a note is a read, not a judgement — it does not set `submitting`, lock
controls, record anything, advance, or affect scheduling. The viewer scrolls
to the arrived-from card and highlights it, unmasked.

**Entry point B — topics.** `renderTopics` already walks topic → category;
notes are the natural third level. A category expands to its note list,
which opens the viewer. Because `notes.json` is lazy, this list must degrade
gracefully when it is absent — missing, not broken.

**Obsidian is demoted, not deleted.** "Open in Obsidian" moves into the
viewer's header. On a Mac it remains the better tool for *editing* a note,
which the viewer will never do, so PR #24's value is preserved and the
`obsidianVault` setting stays meaningful.

### 5. Viewer rendering

Per construct, when due:

| construct | masked (due) | unmasked (new / not due) |
| --- | --- | --- |
| cloze | answer blurred in place, tap to reveal | plain text |
| qa | prompt shown, answer behind inline "Show answer" | prompt and answer rendered |
| mcq | question and choices, **no correctness marking**, tap to reveal | correct choice marked |
| recall | prompt shown, model answer collapsed | both shown |

Blur rather than blanking, so the span keeps its width and nothing reflows
on reveal — reading flow survives the tap.

The mcq row is where this beats Obsidian outright: Obsidian renders the raw
`- [x]`, so the answer key is visible there today.

**Pressure valve:** the viewer header shows a count and a control —
"6 answers hidden · Show all" — revealing the whole note as plain prose in
one tap. This keeps masking from becoming a nuisance on a note you are
deliberately studying, and makes "don't mask, just warn" available on demand
without it being the default.

**Reveal state is ephemeral.** It derives from the schedule, so leaving and
re-entering re-masks. Nothing new is persisted.

**Escaping:** blocks render through the existing `escapeHtml` and inline
markup layer in `renderers.ts`. No second escaping path is introduced —
that file's contract ("must run AFTER escapeHtml") is preserved as written.

## Testing

Following this repo's habit of extracting pure logic so it is testable in
vitest's `node` environment without a DOM — the reason `route.ts`,
`sw-routing.ts`, and `shelfCounts` are shaped as they are.

**Pipeline**

- `parseBlocks` per construct: heading, code fence, plain prose, cloze offsets
  within joined wrapped prose, qa, mcq, recall with and without the `> ---`
  separator.
- **Corpus cross-check (load-bearing).** Over the real vault: every card
  `parseCards` emits has exactly one block carrying its `cardId`, and no
  block carries an id absent from the deck. This is what makes
  `parseBlocks`/`parseCards` drift a loud CI failure instead of a silently
  wrong answer key. `deck-corpus.test.ts` is the precedent.
- Determinism: two consecutive builds produce identical bytes, including
  `generatedAt` preservation when no note changed.

**App**

- `maskState(cardId, reviews, now, arrivedFrom)` as a pure function: due
  masks; new does not; not-due does not; arrived-from never does.
- `renderBlocks(blocks, masked)` → HTML string, no DOM required. Includes an
  **escaping test**, with code fences as the sharpest case since fence
  content is dense in `<` and `&`.
- `sw-routing.test.ts` extended: `notes.json` → `network-first`.
- `route.test.ts` extended: valid `#note/<path>`; valid
  `#note/<path>/<card-id>`; a path containing `/` still splits correctly;
  unknown path → dashboard; malformed percent-escape → dashboard; a card id
  belonging to a different note is ignored while the note still opens.
- Missing `notes.json` renders the stated unavailable state rather than
  hanging.

## Out of scope

- **Editing notes.** The viewer is read-only. Obsidian remains the editor.
- **Link navigation between notes.** The vault has no `[[wikilinks]]`; if
  they are ever introduced, note-to-note navigation is a follow-up.
- **Search across notes.**
- **Section-only viewing.** Considered and rejected — the size budget does
  not force it, and masking solves the spoiler problem it was meant to
  dodge.
- **Any change to FSRS, the scheduler, `deck.json`, or the IndexedDB
  schema.**
- **Review-history durability.** Surfaced during design and genuinely more
  urgent than this feature: FSRS state lives only in IndexedDB on one
  device, with a manual "Export backup" button as the sole mitigation.
  Deleting the home-screen icon destroys it, with no iCloud backup. It
  deserves its own spec and has no dependency on this one.
