# Factotum — State and Roadmap

**Date:** 2026-09-19
**Status:** Current
**Supersedes:** nothing. Companion to `2026-09-18-factotum-design.md`, which remains the
design authority for intent. This document records what was actually built, the decisions
that changed the design during implementation, and what remains.

## 0. Why this document exists

Phase 1 was executed under a subagent-driven workflow whose decision ledger lives in
`.superpowers/`, which is **git-ignored**. Every ruling, defect and piece of reasoning from
implementation is scratch that disappears on a clean checkout. This document is the durable
record of the parts worth keeping.

## 1. Where the project stands

**Phase 1 is shipped and in daily use.** The app is live at
`https://cesar-lp.github.io/factotum/`, installable to the iPhone Home Screen, and works
offline.

| | |
|---|---|
| Cards | 490 across 66 notes |
| Categories | 7 |
| Formats | cloze 178, qa 148, mcq 99, recall 65 |
| Tests | 156 |
| Workflows | `build-deck`, `deploy`, `ci` |

Categories: `networking` 80, `amp` 75, `os-persistence` 79, `os-virtualization` 66,
`data-systems` 65, `database-internals` 63, `os-concurrency` 62.

Source material: Kurose & Ross (networking), Kleppmann DDIA (data-systems), Petrov
(database-internals), Arpaci-Dusseau OSTEP (the three `os-*` categories), Herlihy & Shavit
(`amp`).

### Repository layout

```
vault/                     Obsidian vault — notes with inline cards
  networking/                one directory per source book
  data-systems/
  database-internals/
  operating-systems/         nested: virtualization/ concurrency/ persistence/
  art-of-multiprocessor-programming/
pipeline/src/              markdown -> deck.json (frontmatter, cards, ids, build, cli)
app/src/                   the PWA
  db/                        schema, settings, deck merge, reviews
  scheduler/                 fsrs wrapper, session queue
  ui/                        dashboard, review, renderers, settings, flag
  route.ts                   pure routing decision (see 3.7)
  sw.ts                      service worker
deck/deck.json             build output, committed
deck/notes.json            build output, committed — note bodies for the viewer (§4)
docs/superpowers/          spec and plan of record
```

## 2. Architecture as built

Unchanged from the design spec in outline: notes → pipeline → `deck.json` → PWA →
IndexedDB, with GitHub Actions and Pages as the only infrastructure. Three details are
worth stating because they are load-bearing and non-obvious.

**2.1 The CI chain.** `build-deck` rebuilds the deck and commits it back using
`GITHUB_TOKEN`. A `GITHUB_TOKEN` push deliberately triggers no further workflow — that is
what stops `build-deck` self-triggering. `deploy` therefore chains off it via
`workflow_run`, and its `push` trigger carries `paths-ignore: ['vault/**','pipeline/**']`
so a vault edit does not deploy the stale committed deck before the rebuild lands.

`deploy`'s `actions/checkout` is deliberately **unpinned**. On a `workflow_run` event,
`github.event.workflow_run.head_sha` is the commit that *triggered* build-deck — before its
rebuild commit. Pinning to it would deploy the stale tree and defeat the chain.

**2.2 `generatedAt` is preserved when card content is unchanged.** Otherwise every CI run
produced a commit whose entire diff was a timestamp, and each of those chained a pointless
deploy. The field now means *when the deck content last changed*, not *when CI last ran*.
This is also what makes the PR deck-drift check viable at all.

**2.3 `readExistingDeck` rejects anything it cannot vouch for** — non-object, non-string
`generatedAt`, or `cards` that is not an array of non-null objects — and rebuilds fresh with
a warning. This has since caught three cases it was not written for, including
conflict-markered `deck.json` during branch merges, which is not valid JSON.

## 3. Decisions that changed the design

Each of these departs from `2026-09-18-factotum-design.md` or settles something it left
open. Recorded with reasoning, because the reasoning is what a future reader needs.

**3.1 `newCardsPerDay` is a default intake, not a ceiling.** The design spec called it a
cap and it was implemented as a hard stop that ended the user's day. Spec §8 already says
the daily goal is "clearing the due queue, **never a fixed card count**", so the number was
never meant to bound what the user *may* do. The dashboard now offers unlimited
continuation when the queue is empty, and shows the day's new-card count as feedback.

Due cards still come first: the number is **not** a floor. Adding new cards on a day you
are already behind is how backlogs compound. This invariant is enforced at the route, not
only at the button, and is pinned by a test.

*Accepted cost, stated to the user and chosen deliberately:* each new card generates roughly
8–12 future reviews at ~90% retention, so an unbounded evening becomes months of elevated
daily load.

**3.2 Cards in their learning steps stay inside the session.** FSRS repeats new cards at
1/5/10-minute steps before they graduate. The session was a static array, so a repeat fell
out of it and resurfaced on a dashboard that speaks in days — and spec §8's "clear the due
queue" goal became unachievable, since the queue refilled while you looked at it. A card
still in `Learning`/`Relearning` is now re-queued 3 cards ahead (appended if fewer remain,
so there is never a dead wait), capped at 5 re-queues per card per session.

**The cap is load-bearing, not belt-and-braces.** FSRS `lapses` does **not** increment while
a card is in its initial learning state — verified directly. So the leech rule (§5,
auto-suspend at 8 lapses) can never fire for a card that never graduates, and the obvious
backstop against an infinite re-queue loop does not exist.

**3.3 MCQ choices are shuffled at render, once per presentation.** They were rendered in
deck order, and 71 of 79 mcq cards had the correct answer at index 0 because the authoring
convention writes `- [x]` first — as does the design spec's own example. The position was
not merely memorable, it was constant.

The shuffle happens per presentation and is reused across the unrevealed and revealed
renders, because the picked-choice highlight matches by index; shuffling inside the renderer
would mark the wrong button as the user's pick. **Authored choice order is now cosmetic**,
and §3.2 of the design spec says so.

**3.4 Cloze stays typed exact-match.** Considered and rejected: multiple choice (converts
recall to recognition, a weaker thing to practise) and reveal-then-self-grade (removes
typing but loses machine grading). The friction was addressed instead — submit on Enter,
numeric keyboard where the answer is numeric — and six cards whose answers were untypeable
(one a 66-character clause) were re-blanked to terms.

**3.5 Both machine-graded formats reveal before advancing.** A correct mcq, then later a
correct cloze, submitted immediately — so the revealed state carrying citations was
unreachable, violating §3.3. Both now mark correct/wrong, show the expected answer and
citations, and wait for Continue. The "I actually knew this" override renders only when the
answer was wrong.

**3.6 `recall` cards no longer promise an answer.** They have no answer key by design
(§3.2), but the pre-reveal button said "Show answer" for both qa and recall, so a recall
card revealed nothing and looked broken. The label now differs by format.

**3.7 Routing decision is separated from its side effects.** `decideRoute(hash, state)` is
pure and node-testable; `route()` performs the DOM render and hash mutation. This exists so
the due-first invariant has a permanent regression guard without adopting jsdom
project-wide, which spec §10's "the UI is verified by hand" would not justify.

## 4. The in-app note viewer

Shipped after Phase 1 proper, but on the same footing: a read-only surface
for rereading the vault note a card came from, from inside the PWA, instead
of the `obsidian://open` deep link Phase 1 shipped (which only resolves on
a device with Obsidian installed and the vault synced — not the iPhone PWA
this app is actually used on).

The pipeline gained a second build output, `deck/notes.json` — every note's
body as pre-parsed renderable blocks, ~302 KB gzipped against `deck.json`'s
241 KB. It is deliberately not a field on `deck.json`: that file is fetched
network-first with a 2.5s service-worker timeout at the start of every
review, so folding note bodies into it would slow review start in every
session, including the many that never open a note. `notes.json` gets its
own `network-first` service-worker route and is fetched lazily, only once
the dashboard is up.

The app gained a `#note/<path>[/<card-id>]` route and viewer screen, reached
from the reveal-state "open note" link on a card (now in-app rather than an
Obsidian deep link) and from a per-category note list on the topics screen.
The load-bearing design decision is the masking rule: an answer is hidden
when its card is currently due, visible for new cards and for cards still
inside their retention window, and never hidden for the card the reader
arrived from. A note is also an answer key for every other card drawn from
it, so a generic markdown render would spoil recall on sight — masking is
what makes rereading a note safe to do mid-deck rather than only after
finishing every card it touches. "Open in Obsidian" survives, moved into
the viewer's header, because it remains the right tool for *editing* a note
on a Mac, which the in-app viewer never attempts.

Full design and the decisions behind it:
`docs/superpowers/specs/2026-09-20-in-app-note-viewer-design.md`.

## 5. Vault conventions

Documented in full in `README.md`. The essentials, because getting them wrong degrades the
app rather than merely looking untidy:

**Folder structure is free; `category` is not.** The pipeline derives `category` from
frontmatter only; the directory affects nothing but `source.path` and the `obsidian://`
deep link. But `category` is the scheduler's interleaving bucket and Phase 2's mastery-bar
unit.

**Aim for 8–12 notes per category.** A category spanning a whole textbook averages its
mastery bar into uselessness and its sub-topics never interleave against each other.
OSTEP is therefore three categories under one directory — the first deliberate case of
directory ≠ category. *The Art of Multiprocessor Programming* is its own category rather
than an extension of `os-concurrency`, accepting the overlap as productive: the second
treatment must sharpen the first, not restate it.

**Notes are topic-scoped, not chapter-scoped.** `dns.md` covers Kurose §2.4 as a unit.

**Card quality rules now enforced or documented:**
- A `qa` prompt is a real question, never a bare term.
- A cloze's answer must appear exactly once in its block — enforced by
  `pipeline/tests/cloze-self-answer.test.ts`, which fails the build.
- A cloze should blank a term the reader can produce, not a clause, and not a term sitting
  beside its own expansion.
- Ids are assigned by the build and written back; never hand-edit a `^card-xxxx` anchor.
  Review history is keyed on them.

## 6. Known gaps and accepted risks

| Gap | Status |
|---|---|
| A card failed every time never graduates, never accrues a lapse, and so can never trip the leech rule — across any number of sessions | Tracked separately; pre-existing |
| Exhausting the per-session re-queue cap drops the card silently, with no UI signal | Deferred to Phase 2's session-complete screen |
| Enter-to-submit and routing side effects are verified by hand, not unit-tested | Accepted; jsdom is not a project dependency and §10 sanctions hand-verification |
| ~19 qa cards in `networking` were term-only prompts | Fixed; no automated guard against recurrence |
| 14 categories after CLRS would mean 14 mastery bars on a phone | Open design problem for Phase 2 |
| **FSRS review state (stability, due dates, lapses) lives only in IndexedDB on one device**, with the manual Settings → Export button as the entire mitigation. Deleting the home-screen icon destroys it outright — no iCloud backup, no server copy. Surfaced while designing §4's note viewer; unrelated to it, but real: the deck rebuilds from this repo, months of stability scores do not. | Unmitigated beyond manual export; more urgent than anything in Phase 2, needs its own spec |

## 7. Remaining phases

### Phase 2 — the habit layer (not started, deliberately)

Streak with freezes, 12-week heatmap, per-category mastery bars, app badge, daily push
Action, session-complete screen. All specified in `2026-09-18-factotum-design.md` §8 and §9.

Held until there is real usage to design against. Two things already waiting for it:

- **The mastery-bar screen needs a design idea, not a longer list.** Seven categories today,
  fourteen after CLRS.
- **The session-complete screen** is where the silently-dropped card (§5) should be
  communicated.

Web Push requires the PWA installed to the Home Screen — a one-time step, already documented
in the README.

### Phase 3 — automated generation (unchanged)

A topics file drives an Action that generates notes with inline cards and opens a pull
request. Deliberately last: LLM-proposed cards can only be judged once hand-seeded ones have
been lived with.

### Content roadmap

- **CLRS** — the large one. Expected 6–7 categories at the 8–12-note sizing: foundations and
  recurrences, sorting and order statistics, data structures, dynamic programming, greedy and
  amortized analysis, graphs, NP-completeness. Write one category and review it before
  committing to the rest.
- **A qa-prompt-quality pass** if term-only prompts recur in new material.

## 8. What implementation taught us

Recorded because it should shape how later phases are built.

**Every defect that mattered was found by using the app, not by reviewing it.** MCQ answers
always appearing first; a correct cloze skipping its feedback; a recall card promising an
answer it did not have; a card reappearing as due after the session ended. Review found
plenty of real problems, but consistently in code and content rather than in *experience*.
The reviews were checking shape — does this mcq have exactly one correct choice, does this
cloze have a non-empty answer — and every one of those checks passed on the broken cards.

**A guard catches the shape of a defect, not its purpose.** Twice, a fix satisfied a
mechanical check while discarding what the check protected: a factual correction introduced
a cloze that printed its own answer, and an untypeable-answer fix produced blanks trivially
derivable from the text beside them. Both passed the automated check.

**Content defects need their own class of verification.** Structural assertions over
`deck.json` are necessary and cheap, but the cloze self-answer leak (19 cards, 10 of them
shipped weeks earlier) was only found by asking what reviewing actually feels like.
