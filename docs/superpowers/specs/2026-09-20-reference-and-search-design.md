# Factotum — Reference and Search

**Date:** 2026-09-20
**Status:** Proposed
**Supersedes:** nothing. Amends `2026-09-20-in-app-note-viewer-design.md`, whose
answer-masking mechanic this design removes and replaces (§5).

## 0. Scope, and the two specs that follow this one

Factotum's vault serves one reader today — review — and this design adds a
second. A third is planned. Naming all three keeps the boundaries honest:

1. **Review.** Atomized retrieval practice over cards. Built and in daily use.
2. **Reference.** "What was the deal with consistent hashing again?" — searched
   and read on demand. **This document.**
3. **Path.** A guided, ordered first encounter with unseen material, which gates
   card intake so that material is met in context rather than card-first. A
   separate spec, to be written after this one ships.

A fourth piece — enriching note prose so a first encounter actually teaches —
is content work, deliberately last, for the same reason Phase 3 is last in
`2026-09-19-factotum-state-and-roadmap.md`: walking a real path is what reveals
which notes are too thin, and guessing in advance produces padding, which the
6-card minimum in `CLAUDE.md` exists to prevent.

Reference is sequenced first despite the path being the more wanted feature.
It is the smallest of the three, it carries no scheduler risk, it is
independently useful the day it ships, and it forces an early answer to the
question both of the others depend on: **what happens to scheduling when you
read.** That question is settled here (§4), on low stakes, rather than inside
the much larger path spec.

Note that this inserts ahead of Phase 2 (streak, heatmap, mastery bars) and
partly absorbs it: a path map is a better answer to "fourteen mastery bars on a
phone" than a list of fourteen bars.

## 1. The problem

Two gaps, one mechanism.

**There is no search.** `notes.json` ships every note's body as pre-parsed
blocks, prefetched on idle and cached by the service worker, and nothing can
query it. The only ways to reach a note are the topics screen's per-category
list and the "open note" link on a revealed card. Neither answers "where did I
write about X".

**Reading collides with masking.** `ui/note-mask.ts` masks any answer whose card
is currently due, so reading never spoils a pending test. That is correct for
review and exactly wrong for reference: you look something up precisely when you
have half-forgotten it, which is precisely when its card is due, so the thing
you came for is the thing that is hidden. Search makes it worse — a result
snippet is an unmasked fragment of a note body, so search would leak the answers
the viewer carefully hides.

## 2. The core decision: read-suppression replaces masking

FSRS estimates retention across elapsed time. Testing a card ninety seconds
after reading its note measures nothing about memory, and a card read and then
rated `Good` writes an inflated stability score into the one piece of state this
project cannot rebuild.

Masking prevents that by hiding the material. This design prevents it by
**deferring the test instead**: opening a note suppresses its due cards from
review for a configurable window (default 24h). Reading becomes unconditionally
free, the viewer shows everything, and the measurement stays honest because the
invalid measurement is simply not taken.

Three properties make this the right shape for this codebase specifically:

**It is a filter, not a freeze.** `queue.ts`'s `selectEnabled` already carries
that exact contract for category muting — FSRS state untouched, due dates keep
advancing. Suppression is the same species and composes at the same seam.

**It writes nothing to `reviews`.** The alternative considered — grading a
deliberate reveal as `Again`, on the reasoning that looking something up *is* a
failed retrieval — would have fabricated review history in the store that
`2026-09-19-factotum-state-and-roadmap.md` §6 lists as the project's most urgent
unmitigated risk. Suppression needs only a per-note timestamp: derivable,
disposable, and harmless to lose.

**It is measurement hygiene, not leniency.** Declining to record a reading you
know is invalid is not going easy on yourself.

**Accepted cost, stated plainly:** 24h shrinks the inflation, it does not remove
it. A re-read elevates recall for days, so a card tested at hour 25 still grades
above baseline. There is no principled number here, which is why it is a
Settings value rather than a constant pretending to be derived.

## 3. Data model and pipeline change

**`NoteDoc` gains `tags: string[]`.** Tags are parsed into `NoteMeta` and reach
`DeckCard`, but `buildNotes` drops them. One field, populated from the
`ParsedNote` already in hand, plus a deck rebuild. Without it, searching `tcp`
misses notes tagged `tcp` that never spell it in prose.

**Read timestamps live in the existing `meta` store**, under the single key
`noteReads`: `Record<string, number>`, note path to epoch-ms of last open. At
most ~190 entries today, read once at startup, rewritten on each note open,
with entries older than the window pruned on write so the record self-limits.

No schema version bump, no new object store, no migration. This respects the
rule `db/notes.ts` states outright: IndexedDB holds the one irreplaceable thing
in this app, and a reading feature has no business touching it.

**The queue filter does not need `notes.json`.** `DeckCard` already carries
`source.path`, so "was this card's note read recently" is a direct lookup of
`readAt[card.source.path]`. No block walk, no dependency on the ~1MB notes
payload having loaded. Suppression therefore works on a cold offline start where
notes were never fetched — which matters, because the deck is cached
network-first with a 2.5s timeout while notes are only prefetched on idle. The
two payloads stay independent, as `db/notes.ts` intends.

**One new setting:** `readSuppressionHours: number`, default `24`, sanitized to
a non-negative number. `0` disables suppression entirely and is the escape hatch
if the mechanic proves annoying — no separate on/off flag.

## 4. The suppression mechanic

**A pure filter beside the existing one.** `selectNotRecentlyRead(cards, readAt,
now, windowHours)` lands in `queue.ts` next to `selectEnabled`, same signature
shape, same contract. Composition is `cards -> selectEnabled ->
selectNotRecentlyRead -> buildSession`; both filters run before the session is
built and neither knows about the other.

**It suppresses due cards only, never new ones.** `note-mask.ts` already made
this call and stated the reason: *"masking protects a pending test, and a card
never asked has none."* A card with no review state is not a measurement waiting
to happen, it is material not yet met, and reading a note then learning its
cards is the normal order of operations rather than contamination. Suppressing
new cards would mean reading a note *prevents* you starting to learn it.

This also pre-aligns with the path spec, where reading a note is precisely what
introduces its cards. Suppressing them here would have to be undone there.

**Suppression applies in focused sessions; muting still does not.**
`buildFocusSession` deliberately ignores `disabledCategories`, because
deliberately choosing a muted category is the entire point of focus mode.
Suppression differs in kind: muting is a preference being overridden on purpose,
suppression is a validity rule, and there is no version of "I would like to be
tested on the paragraph I read four minutes ago" worth honouring. The asymmetry
is intentional and must carry a comment saying so, or the next reader will
assume it is an oversight.

**Deferred cards are counted out loud.** A separate pure `countSuppressed(cards,
readAt, now, windowHours)` feeds the dashboard: *"3 cards deferred: you read
their notes today."* Keeping the count out of `buildSession`'s return type leaves
existing session tests and call sites untouched. The Phase 2 session-complete
screen reads the same function when it exists.

Silence here would repeat a defect the project has already recorded: §6 of the
state-and-roadmap lists the silently-dropped re-queued card as a known gap. A
card leaving the queue without explanation is the same failure.

**`readAt` is written when a note is opened.** Not on dwell time, not on scroll
depth. Opening and immediately backing out defers that note's due cards by a
day — a real but trivial cost, where a dwell threshold means timers, visibility
handling, and a new class of flaky test for a problem that resolves itself
tomorrow.

**Deliberately omitted:** a "review them anyway" override on the deferred count.
`readSuppressionHours: 0` is the escape hatch, and a per-session override would
permit exactly the thing the mechanic exists to prevent.

## 5. Deleting masking, and the in-flight filter that replaces it

**Removed:** `app/src/ui/note-mask.ts` and `app/tests/note-mask.test.ts`; from
`ui/note.ts`, `maskedSummary`, `effectiveMasked`, `maskedCount`, the `revealed`
set, the "Show all" bar, the re-render-against-a-shrinking-mask machinery and
the tap-to-reveal handler; the `masked` parameter of `renderNoteBlocks`; and
`.is-masked` / `.note-masked-bar` from `note.css`. The viewer becomes a plain
reader that always shows everything.

**`arrivedFrom` survives with a narrower job.** It currently does two things:
exempt the card you came from, and scroll to it. The scroll use is untouched.
The exemption use moves from "do not mask this one" to "do not filter this one
out of the live session" — the same meaning for the same reason: you owe that
card a rating, and the README promises you return to it revealed as you left it.

**Why masking cannot simply be deleted.** `ui/review.ts` holds the session as a
live in-memory `StoredCard[]`, spliced in place as cards are rated and
re-queued. Suppression is computed when that array is *built*. So: mid-session,
you open a note from card 4, read it, and return — and cards 7, 11 and 15 from
that same note are already in the array. Nothing recomputes, and you are tested
on paragraphs read ninety seconds ago, which is the exact failure the mechanic
exists to prevent.

**The in-flight filter.** A pure `dropRecentlyRead(session, index, cardIds,
arrivedFrom)` returning the surviving array, applied when the review screen is
restored from a note. Its invariant, pinned by tests:

- Nothing at or before `index` is ever removed — those are rated or owed.
- `arrivedFrom` is never removed.
- Removals occur strictly after the cursor, so `index` stays valid and neither
  `requeueIndex` nor `promoteReady` observes a shifted cursor.

That last point is what keeps this change away from the re-queue machinery,
which is the most delicate code in the app.

**Applying it needs a hook that does not exist yet.** Two facts about the
current resume path constrain the implementation:

- The session array is **owned by `main.ts`** (`loadDashboardState`'s
  `state.session`) and passed to `startReview` as `deps.session`, which splices
  it **in place**. `startReview`'s closure captured that exact array, so
  replacing it with a new one would leave the review screen reading the old
  contents.
- **Nothing in `review.ts` runs on resume.** `main.ts` reattaches the retained
  DOM node (`appRoot.replaceChildren(suspendedReview.node); return;`) and
  returns before any review code executes.

So `startReview` returns a controller — `{ dropCards(cardIds: string[]): void }`
— which `main.ts` stores alongside the node in `suspendedReview` and calls on
resume. The controller applies `dropRecentlyRead` and writes the result back
with `session.splice(0, session.length, ...survivors)`, preserving the array
identity `review.ts` depends on. The progress denominator `totalCards` is
currently a `const` computed once and becomes a `let` the controller refreshes.

The pure function stays pure and carries the invariants; only the splice and
the counter refresh are impure, and they are hand-verified per §8. A re-queued card from the read note
sitting ahead of the cursor is removed like any other: it has review state, so
it is a due card by §4's rule.

**A behaviour change to document, not hide.** The README currently promises the
progress counter survives opening a note mid-review. After this, reading a note
mid-session can make the session shorter — you return and the counter reads
"4 of 17" where it read "4 of 20". That is correct and will still look like a
glitch the first time. It needs the same counted-out-loud treatment as the
dashboard (a line on return naming the deferred cards) and a README correction
rather than a stale promise.

## 6. The search engine

**Approach: scan, do not index.** No search index, no new generated artifact, no
new dependency. Each query walks `notes.json`'s blocks in memory in a single
scoring pass, debounced at ~150ms.

The corpus is ~197k words across 189 notes — roughly 1.2MB of text, already
loaded and cached. This has now been measured against the real 288-note
corpus: median 3.75 ms/query in Node, and median 17.9 ms/query (min 10.1, max
35.4) in the browser on an unminified Vite dev build — a production build and
a real iPhone should both do better than that dev-build figure, not worse.
Either number sits comfortably inside the 150ms debounce below, which is why
the scan was kept rather than replaced by an index. Two alternatives were
considered and rejected for now: a
runtime-built inverted index (~150 lines plus tests, to replace a scan that was
already fast enough) and a pipeline-built index with a search library (best
quality by a distance; also a fourth runtime dependency, a third committed
generated artifact, a third thing `ci.yml`'s drift check must cover, and another
file the service worker must cache and version). Both remain available behind an
unchanged function signature if the scan disappoints.

**One pure module, no DOM.** `app/src/search.ts` exports `search(notes: Notes,
query: string): NoteResult[]`. Ranking is the part most likely to be quietly
wrong, so all of it must be unit-testable without a browser.

**Result shape.** `NoteResult` carries `path`, `title`, `topic`, `category`,
`score`, and `hits: BlockHit[]` — each hit holding the block index, a snippet,
and **match offsets within that snippet**. Offsets rather than pre-highlighted
HTML: the module stays DOM-free and the UI decides how matches are marked. Hits
are computed eagerly, since the scan visits every block regardless, and rendered
only on expansion.

**Searchable fields.** Note level: `title`, `tags`, `category`, `topic`,
`citations`. Block level, by kind: heading text; prose text — which includes
cloze answers, since a `ResolvedCloze` is a span *within* the prose string rather
than a separate field; list items; `qa` prompt and answer; `card` prompt, answer
and choice texts; and **code fences**, deliberately — "what was the syntax
again" is a stated purpose of this app, and the code block is often the exact
target.

**Matching.** Query lowercased and split on whitespace into terms; **every term
must match** somewhere in the note. A term matches at a word boundary with an
open right edge, so `hash` finds `hashing` and `ip` finds `ipsec` but not
`multiple`. Terms are regex-escaped — the query reaches a `RegExp`, and `c++`
or `a.b` must neither throw nor match everything.

**Scoring.** Field weights descending: title, tags, heading, card/qa prompt,
prose, list, citations, code. Two bonuses matter more than the weights: a
**phrase bonus** when the raw query appears contiguously, and an
**all-terms-in-one-block bonus**, since a block containing every term is a far
stronger signal than a note scattering them across four paragraphs. Notes rank
by total score, ties broken by title; hits within a note rank by score then
document order, capped at five per note.

The weights are guesses. They belong in a single exported constant table with a
comment saying so, because tuning them against real queries is inevitable.

**Cost control.** Debounce 150ms, minimum query length 2, one pass per query,
results capped at 30 notes. The performance claim above must be **measured
on the real device** during implementation, not asserted.

**The offline case.** `loadNotes` returns `null` on a cold offline start where
the idle prefetch never ran. That must render as "notes have not been downloaded
yet", never as an empty result list. An empty list asserts *no matches*, which
is a different and false statement — and it is the kind of defect that survives
code review, because the code path is correct and only the meaning is wrong.

## 7. The UI

**Entry.** A **Search** button on the dashboard beside **Topics**, routing to a
new `#search`. A button rather than a live dashboard field: an always-present
input on a phone raises the keyboard on a screen whose primary job is "start
reviewing". The field autofocuses on arrival, so it is one tap either way.

**The query lives in the hash, written with `replaceState`** —
`#search?q=consistent+hashing`, updated on the debounce rather than per
keystroke. This is what makes the back button correct: search, open a note, go
back, and the results are still there rather than an empty box. It also survives
a reload. Holding the query in a module variable (as review sets its session
aside) handles back but not reload, and adds a second kind of screen state.

**Result rows are notes, with two distinct targets.** Each row shows title,
topic/category and a hit count.

- **Row body tap opens the note.** The default, the common case.
- **Disclosure chevron expands the row in place**, revealing up to five block
  snippets with matched terms marked.

Two targets because a row that both expanded and opened leaves one gesture
homeless. This split is also what preserves the leakage property: snippets are
the only unmasked prose a result list can show, and they render on a deliberate
second tap rather than on the way past. Note-level results hide answers by
having no snippets; block-level results show them all unasked; this shows them
on request, per result.

**A snippet tap opens the note scrolled to that block.** The viewer already
accepts a scroll target — that is how `arrivedFrom` works — so this extends the
existing mechanism. Blocks have no stable ids, so the target is the block's
index within `note.blocks`. That is fragile across a deck rebuild, since
inserting a paragraph shifts every later index, and it is acceptable because
these links are ephemeral: generated from the `notes.json` currently in memory
and followed within seconds. It must carry a comment saying exactly that, so it
is never mistaken for a durable anchor and reused where one is required.

**Opening a note from search writes `readAt`** like any other open, with §4's
consequences. Expanding a row does not.

**Three states needing real designs, not fallthroughs:** no query yet — the
landing screen, which lists the ten most recently read notes, available for
free from `readAt`; no matches — say so, and the only honest use of an empty
list; and notes-unavailable-offline, with §6's distinct message.

**One dashboard addition:** §4's deferred-cards line, near the due/new counts.

## 8. Testing

Unit-testable and therefore required to be tested: `selectNotRecentlyRead` and
`countSuppressed`; `dropRecentlyRead`'s three invariants individually; the
search module's matching, escaping, scoring and snippet offsets; the `noteReads`
record's pruning; and the settings sanitizer.

**Hand-verification is a plan step, not an afterthought.** §8 of the
state-and-roadmap records that every defect that mattered was found by using the
app rather than reviewing it, and that a guard catches the shape of a defect
rather than its purpose. Two flows here are interaction bugs waiting to happen
and must be walked on the device: review -> open a note from card 4 -> read ->
return -> rate through, confirming the cursor holds and the arrived-from card
survives; and search -> expand -> snippet -> note -> back, confirming the query
is still there.

**Measure the scan** on the phone with the real corpus before declaring §6's
performance claim satisfied.

## 9. Out of scope

- **The path.** Ordering metadata, the tree/map screen, unlock state, and the
  `newCardsPerDay` gating with per-category opt-in. Its own spec.
- **Note enrichment.** Content work, and the `CLAUDE.md` subject-scoped-vs-chapter
  grain conflict it will force. After the path.
- **Fuzzy matching, stemming, BM25.** Rejected with §6's alternatives.
- **A search settings toggle** choosing note-level vs block-level results. The
  granularity you want changes per query — navigational versus lookup — so a
  global setting would be flipped constantly, which is the tell that it was never
  a setting. Expansion answers it per result instead.
- **Per-card read state.** The note is the unit read.
- **Backing up review history.** Still the most urgent open risk in the project
  and still unaddressed; it needs its own spec and is not this one.

## 10. Risks

| Risk | Disposition |
|---|---|
| Residual stability inflation: 24h does not fully decay a re-read | Accepted and stated (§2); the window is a Settings value |
| In-flight session mutation sits next to the re-queue machinery | Bounded by the cursor invariant (§5), pinned by tests, plus device hand-verification (§8) |
| The scan is slower on-device than estimated | Measured before shipping; Approach 2 slots in behind an unchanged signature (§6) |
| Scoring weights are guesses | Isolated in one constant table, expected to be tuned (§6) |
| A note re-read daily hides its cards indefinitely | Visible via the deferred count (§4) rather than silent; no cap in v1 |
| Block-index scroll targets break across a rebuild | Ephemeral by construction, commented as such (§7) |
