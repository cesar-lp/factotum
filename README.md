# factotum

A personal spaced-repetition app for retaining technical knowledge —
programming syntax, computer networking, algorithms, data structures, system
design. Notes live as Obsidian markdown in this repo; a CI pipeline compiles
them into a deck; an offline-first PWA reviews the deck on iPhone with FSRS
scheduling. Single user, no servers, no App Store — GitHub Actions and GitHub
Pages are the only infrastructure.

This README covers Phase 1 (what's built and shipped). Later phases
(notification push, automated note generation) are noted below as **not yet
built** where relevant — see `docs/superpowers/specs/2026-09-18-factotum-design.md`
for the full design, including those phases.

## Vault and authoring

`vault/` is a real Obsidian vault — open that folder directly in Obsidian to
write and edit notes.

Only notes with a `category` key in their YAML frontmatter are scanned for
cards. Notes without one (drafts, daily notes) are ignored entirely by the
build. `topic` is optional and groups categories into shelves — see [Vault
conventions](#vault-conventions) below.

```markdown
---
topic: networking
category: networking
tags: [tcp, transport-layer]
---
```

### Card constructs

Four constructs, three grading modes. Each example below is verified against
what `pipeline/src/cards.ts` actually parses today, not just the spec.

**Cloze** — `==term==`, typed answer, exact match (case/whitespace-insensitive):

```markdown
Default Ethernet MTU is ==1500 bytes==.
```

The `==` must hug non-whitespace on both sides — `== 1500 bytes ==` (padded)
is *not* recognized as a highlight and produces no card. Write `==1500
bytes==`, not `== 1500 bytes ==`.

**QA** — `Question :: Answer`, self-graded with four rating buttons:

```markdown
What does the TIME_WAIT state protect against? :: Delayed duplicate segments
from a previous connection being accepted by a new one.
```

**MCQ callout** — `> [!card] mcq`, tap a choice, `- [x]` marks the correct one:

```markdown
> [!card] mcq
> At which OSI layer does TCP operate?
> - [x] Transport (4)
> - [ ] Network (3)
> - [ ] Session (5)
```

**Recall callout** — `> [!card] recall`, self-graded, no answer key:

```markdown
> [!card] recall
> Explain why TCP's congestion control makes it a poor fit for real-time
> video, and what QUIC changes.
```

A `> ---` line inside a recall callout is optional and splits the callout
into a prompt (above) and a model answer (below), to grade yourself against
when you only half-remember something:

```markdown
> [!card] recall
> Explain why wait-free implies lock-free, but not the reverse.
> ---
> Wait-free bounds every thread's own operation; lock-free only guarantees
> that some thread makes progress, so a specific thread can still starve.
```

Obsidian renders `---` as a divider, so the callout still reads correctly
in the editor. Without a separator, the card stays purely self-graded, just
as before — there is no answer key to check yourself against.

### Parser behavior worth knowing

- **A run of plain prose lines wraps and joins.** A sentence you hard-wrap
  across two source lines is treated as one block — the `==...==` or `::`
  can land anywhere in the joined text, not just on a single physical line.
  Blank lines, headings, list items, and blockquotes each break the join.
- **Fenced code blocks (` ``` ` or `~~~`) are skipped entirely.** `==` and
  `::` inside a code fence are never parsed as card syntax.
- **Whitespace-padded highlights are rejected**, as above — `==term==` only,
  no space just inside the `==`.

Syntax deliberately overlaps the Obsidian Spaced Repetition plugin, so notes
stay useful outside this app too.

### Vault conventions

**Folder structure is free; `category` is not.** The pipeline derives
`category` only from a note's frontmatter (`pipeline/src/frontmatter.ts`);
which folder the note lives in affects nothing but its `source.path`
(provenance, and the `obsidian://` deep link). Organize folders however
reads best in Obsidian.

`category`, though, is load-bearing: the scheduler buckets the daily session
by category and takes one card per category per round to interleave it
(spec §5), and Phase 2's per-category mastery bars redirect attention toward
weak topics (spec §8, item 3). Aim for roughly 8–12 notes per category,
matching the existing three. A category that spans a whole textbook
undermines both: its mastery bar averages a wide mix of strong and weak
material into one uninformative number, and lumping unrelated sub-topics
together means they never get interleaved against each other within the
category — which is exactly the discrimination interleaving is for. It also
drags out the tail of the session, since the round-robin exhausts smaller
categories first and finishes alone on whatever's left. Split a big source
into several right-sized categories under one folder instead — for example
OSTEP is organized as three categories (`os-virtualization`,
`os-concurrency`, `os-persistence`), matching the book's three parts, all
under a single `vault/operating-systems/` folder.

**`topic` is an optional shelf above `category`.** `category` stays the
unit interleaving and mastery bars key on; `topic` is the coarser grouping
you browse and bulk-mute by — a book, a cloud provider, a subject — so that
"turn off AWS" is one decision instead of eight independent category
toggles. When `topic` is absent, blank, or not a string, the pipeline
defaults it to the note's own `category`, so a note with no `topic` simply
becomes a single-category shelf and the build never rejects it on that
account. Like `category`, `topic` comes only from frontmatter, never from
folder path. `os-concurrency` and `amp` (Art of Multiprocessor Programming)
share the `concurrency` topic despite being different categories from
different books — a topic groups by subject, not by source — while staying
separate categories so interleaving still discriminates between them.

**Notes are subject-scoped, not chapter-scoped.** (Unrelated to the `topic`
key above — this is about how much material one note covers.) A note should
cover one coherent subject (e.g. `dns.md` covers it as a unit), not mirror a
single textbook chapter. Group related chapters into one note when they read
better together — address translation, paging, and TLBs make one note, not
three thin ones.

**A note's first `# H1` becomes its title in the note viewer** (below); a
note with no H1 falls back to its filename stem.

## Stable ids

Every card gets a `^card-xxxx` block-reference anchor. The build Action
assigns ids to any card that lacks one and **commits them back to the vault
automatically** — you will see `^card-xxxx` appear in your notes after a
push. Do not hand-edit or delete these anchors: review history (FSRS
state — stability, due date, lapses, etc.) is keyed by card id, and deleting
or changing an anchor permanently orphans that card's history on the next
deck rebuild.

## Topics and focused sessions

The dashboard's **Topics** button opens `#topics`, a browsing screen laid
out by shelf: one section per `topic`, each listing its categories with
their due/new counts and a per-category on/off toggle plus a **Learn**
button. A category shows up there as soon as it has any live (non-
tombstoned) card, even a fully caught-up one — it renders `0 due / 0 new`
rather than disappearing, because the picker is also where you would go to
mute a category right as you finish it, and a caught-up category still
needs to stay toggleable. Only a category every one of whose cards is
tombstoned drops out, since there is then nothing left to serve or mute.
Muting is per-category; a shelf's header toggle just flips every category
on it at once (unmute only when the whole shelf is already off).

**Categories are enabled by default.** A newly-added category joins the
daily session immediately — there is no allowlist to remember to opt into,
because a silently-unreviewable new category is worse than a rare unwanted
one. Turning a category off removes it from the daily session and its
"keep going" extension, but is a filter, not a freeze: FSRS due dates keep
advancing while a category is muted, so re-enabling it surfaces whatever
became overdue in the meantime, all at once. That is deliberate — FSRS
models forgetting over real elapsed time, and freezing the clock on a
muted category would overstate how much of it you still remember.

Each category also expands to list its notes by title, for browsing into
the note viewer (below) without going through review at all.

**Learn** starts a focused session on one category, reachable at
`#focus/<category>` in addition to (not instead of) the daily `#review`.
It serves that category's due cards first, then every one of its unseen
cards with no daily new-card cap — composed from the same session and
extension builders the daily queue uses, just scoped to one category, so
there is no second, divergent notion of "due". A focused session is a
real review: grading it writes FSRS state and the review log exactly like
the daily session, new cards taken there count against today's
`newCardsPerDay` allowance the same as anywhere else, and a not-yet-due
card is never pulled forward into it. A muted category can still be
focused — muting only keeps a category out of the *daily* queue, and
deliberately choosing it here is the point.

When read-suppression (see [The note viewer](#the-note-viewer) below) has
held cards back from today's queue, the dashboard names what happened
instead of silently showing a smaller number: **"N cards deferred — you read
their notes recently."**

## Search

The dashboard's **Search** button opens `#search`. The query lives in the
URL hash itself (`#search?q=...`, written with `replaceState` rather than
pushed as a new history entry), so a search is shareable and back/forward
behaves sensibly. An empty query lists recently-read notes instead of
results.

Results are notes, not cards: a row opens the note, a chevron expands it
in place to show the matching snippets, and tapping a snippet opens the
note scrolled to that block. The scan covers note titles, tags, topic and
category, citations, headings, prose (which includes cloze answers),
list items, qa/mcq/recall prompts and answers, and code fences. Query
terms are split on whitespace and must **all** match (AND, not OR), each
at a word boundary with an **open right edge** — `hash` finds `hashing`,
but `ip` does not match inside `multiple`.

Search reads from `notes.json`, the same file the note viewer uses, so it
is unavailable on a cold start with no network — if the service worker
never got a chance to fetch and cache that file, there is nothing to
search yet.

## Scripts

Run with `npm run <script>` from the repo root.

- `test` — runs the full test suite once (`vitest run`).
- `test:watch` — runs the test suite in watch mode.
- `typecheck` — type-checks the app and the service worker (two separate
  `tsc` invocations, since the service worker needs the `WebWorker` lib and
  the rest of the app needs `DOM`).
- `build:deck` — runs the pipeline over `vault/`, writing `deck/deck.json`
  and `deck/notes.json`, and rewriting vault notes in place with any newly
  assigned `^card-xxxx` anchors. `notes.json` (~302 KB gzipped) carries every
  note's body as pre-parsed renderable blocks, for the note viewer below —
  kept out of `deck.json` (241 KB gzipped) because that file is fetched
  network-first with a 2.5s service-worker timeout at the start of every
  review, including sessions that never open a note.
- `predev` — copies `deck/deck.json` and `deck/notes.json` into
  `app/public/`; runs automatically before `dev`, not meant to be invoked
  directly.
- `dev` — starts the Vite dev server for the app.
- `prebuild:app` — copies `deck/deck.json` and `deck/notes.json` into
  `app/public/`; runs automatically before `build:app`, not meant to be
  invoked directly.
- `build:app` — builds the production app bundle into `dist/`.

## How the CI loop works

Two GitHub Actions chain together:

1. **`build-deck.yml`** fires on a push to `main` touching `vault/**`,
   `pipeline/**`, or `package.json`. It runs the tests, runs `build:deck`
   (assigning ids and regenerating `deck/deck.json`), and — if anything
   changed — commits vault + deck changes back to `main` using the default
   `GITHUB_TOKEN`. Pushes made with `GITHUB_TOKEN` don't trigger further
   workflow runs, which is what stops this from looping on itself.
2. **`deploy.yml`** builds the app and deploys it to GitHub Pages. It runs
   on an app-only push to `main` (paths outside `vault/**`/`pipeline/**`
   deploy immediately), and it also runs whenever `build-deck.yml`
   completes, via a `workflow_run` trigger — so a vault edit's rebuilt deck
   reaches the live site without a second, unrelated push being needed to
   nudge it along. A failed `build-deck` run does not trigger a deploy.

So the loop, end to end: edit a note in Obsidian → push → `build-deck`
assigns ids, rebuilds the deck, commits back → that commit's completion
triggers `deploy` → `deploy` builds the app and publishes to Pages.

A third workflow, **`ci.yml`**, runs only on pull requests targeting `main`
— it's the pre-merge gate the two above don't provide, since both only run
after a push has already landed on `main`. It runs tests, typecheck, and
`build:deck`, then fails the PR if the rebuild changes `deck/deck.json`
*or* any `vault/` file compared to what the PR committed (a "deck drift"
check) — telling you to run `npm run build:deck` and commit the result.
Both are checked because `build:deck` mints anchor ids into vault notes as
well as regenerating the deck, so either one can go stale on its own.
Without this, a PR with a
broken test or a stale deck merges cleanly, `build-deck` then fails
post-merge, its deck commit (and the `deploy` run chained off it) never
happens, and the live site silently stops updating with no obvious signal
why. `ci.yml` is read-only (`permissions: contents: read`) — it never
pushes or commits, unlike `build-deck.yml`.

Two smaller PR-only workflows sit alongside it. **`branch-name.yml`**
rejects a PR whose branch doesn't follow the `<type>/<kebab-description>`
convention in `CLAUDE.md` — the agent tooling that creates worktrees
proposes names like `claude/…-fed542`, and a rename that relies on someone
remembering it eventually doesn't happen. It skips fork PRs, whose branch
names live in someone else's repo and never land here.

**`deck-diff.yml`** and **`deck-diff-comment.yml`** post a comment on every
PR saying how many cards it adds or removes and to which notes, and warn
about any touched note left under the 6-card minimum. `deck/deck.json` is
one 1.2MB generated file that every content PR rewrites, so GitHub's diff
view tells a reviewer nothing; this makes the number visible instead. They
are split in two on purpose: posting a comment needs `pull-requests:
write`, which must never be held by a workflow that touches PR-authored
content on a public repo. `deck-diff.yml` reads the PR with no permissions
and uploads an artifact; `deck-diff-comment.yml` holds the write token,
runs on `workflow_run`, and never checks out PR code. Merging them — or
switching to `pull_request_target` — would hand repository write access to
anyone who opens a PR.

**`auto-merge.yml`** turns on GitHub's native auto-merge for PRs the
maintainer opens from a branch in this repo, so they land by themselves
once every required check is green. It needs a repo secret
`AUTO_MERGE_TOKEN` — a fine-grained PAT scoped to this repo with
**`Contents: Read and write`** and **`Pull requests: Read and write`** —
and does nothing when that secret is absent. Contents write is not
optional and is easy to miss: arming auto-merge queues a change to
`main`, so GitHub treats it as a repository write and rejects a
pull-requests-only token with `Resource not accessible by personal
access token (enablePullRequestAutoMerge)`.

It does **not** fall back to `GITHUB_TOKEN`, and the reason matters.
Auto-merge performs the merge as whoever enabled it, and pushes by
`GITHUB_TOKEN` don't trigger workflow runs. Enabling it with
`GITHUB_TOKEN` would therefore land every merge on `main` as
`github-actions[bot]`, `build-deck.yml` would never fire, and the deck
and the deployed site would silently stop updating — the failure this
repo's CI layout exists to prevent, caused by the automation meant to
save a click. Without the secret the workflow stays quiet and you press
the button yourself, which is only tedious.

## One-time setup

1. **Enable GitHub Pages**: repo Settings → Pages → Source: **GitHub
   Actions**. (The `deploy.yml` workflow handles the rest; there is nothing
   else to configure here.)
2. **Require the PR check, without breaking `build-deck`'s push to main**:
   `build-deck.yml` pushes its deck-rebuild commit directly to `main` using
   the default `GITHUB_TOKEN`. Enabling branch protection on `main` without
   an exemption for that push will make `build-deck` start failing on every
   run. GitHub only lists a status check in a ruleset's "Add checks" picker
   once it has reported at least one run on the repo, so open (or already
   have open) a pull request that runs `ci.yml` to completion **before**
   creating the ruleset below — otherwise the check won't be there to
   select. To require `ci.yml` on PRs while keeping that push working:
   - Go to repo **Settings → Rules → Rulesets → New ruleset → New branch
     ruleset**.
   - **Target branches**: add `main` (or use the default branch target).
   - Under **Rules**, enable **Require status checks to pass**, then **Add
     checks** and select **`PR checks (test, typecheck, deck drift)`** —
     that's the job name `ci.yml` reports (not the workflow name `PR
     checks`, which won't appear as a selectable check itself). Add
     **`Branch name follows convention`** the same way.
   - Do **not** enable **Require approvals**. Every PR here is authored by
     the maintainer, and GitHub does not let you approve your own PR — so
     the rule can only ever deadlock, and the usual escape (a workflow that
     auto-approves) would approve fork PRs from strangers too. Required
     status checks are what actually gate a merge; approvals add nothing on
     a solo repo. Enable **Settings → General → Allow auto-merge** instead:
     it is a per-PR button only someone with write access can press, so it
     never lets an outside PR land on its own.
   - Under **Bypass list**, click **Add bypass** and add **Repository
     admin** and **Write**. This is the step that keeps
     `build-deck.yml`'s direct push to `main` working; without it, that
     push starts failing the moment the ruleset is enforced, exactly as
     `build-deck.yml`'s own comment warns.

     Note for anyone following older instructions (including an earlier
     version of this list): there is **no "GitHub Actions" bypass actor on
     a user-owned repo**. That actor only exists in organization rulesets.
     The full actor list here is `Deploy keys`, `Repository admin`,
     `Maintain`, `Write`, and installed Marketplace apps — searching it for
     "GitHub" returns nothing. `Write` is the closest equivalent: the deck
     push comes from `github-actions[bot]` using `GITHUB_TOKEN` with
     `contents: write`, and on a solo repo the only holders of write are
     the maintainer and that bot.

     **Verify this rather than assuming it.** Whether ruleset evaluation
     treats `github-actions[bot]` as holding the `Write` role is not
     something the GitHub docs state plainly. After enabling the ruleset,
     merge a PR that touches `vault/` and confirm `Build deck` goes green
     and its rebuild commit lands on `main`. The failure is silent — no
     deck commit, no `deploy` run, site quietly stale — so it is worth one
     deliberate check.

     If the push is still rejected, the fallback is a fine-grained PAT
     stored as a secret and used for the push: it acts as the maintainer,
     which `Repository admin` covers. The cost is real, and
     `build-deck.yml`'s own comments spell it out — a PAT push **does**
     re-trigger workflows, so `[skip ci]` becomes the only thing preventing
     a self-triggering rebuild loop, and the token needs renewing on
     expiry. Prefer the role bypass if it works.
   - Set **Enforcement status** to **Active** and save.
3. **Install to the iPhone Home Screen**: open the deployed Pages URL in
   Safari, tap Share → **Add to Home Screen**. This is not optional
   polish — it's a hard prerequisite for two things:
   - Web Push notifications (Phase 2, **not yet built**) only work for
     Home Screen–installed PWAs on iOS.
   - Home Screen installation is what exempts the app's local storage
     (IndexedDB — review history, scheduling state) from Safari's 7-day
     script-writable storage eviction. Without it, review history can be
     silently wiped by Safari itself.

## The note viewer

Every card, once revealed, shows an **open note** link back to the note it
came from — for when you half-remember something and want the full
explanation instead of guessing whether your recall was good enough. It's
shown only after reveal, deliberately — the note contains the answer, so
surfacing it beforehand would spoil the card. The topics screen (above)
also lists every category's notes directly, for browsing outside of review.

Both open `#note/<path>`, an in-app viewer rather than a deep link out to
Obsidian. There is no masking any more: **the viewer always shows
everything**, including which mcq choice is correct. What protects review
instead is **read-suppression** — opening a note defers its currently-**due**
cards out of review for `Settings.readSuppressionHours` (default 24, range
0–168; `0` turns the mechanic off entirely). It has no control in the
Settings screen yet — the field lives in the settings store, not the UI. New
cards are never deferred, since there's nothing to spoil. This is a filter on the queue, not
a freeze on scheduling: FSRS state and due dates are untouched, so a deferred
card is simply served later, once the suppression window has passed.
Deferral applies to the daily queue, its "keep going" extension, and focused
sessions — including a session already in progress, so reading a note
mid-review removes that note's other cards from the rest of that session.
Tapping any answer still reveals just that one; a header control reveals the
whole note at once. Full design and rationale in
`docs/superpowers/specs/2026-09-20-in-app-note-viewer-design.md`.

**Opening a note mid-review no longer guarantees the session comes back the
same size.** Going back lands you on the same card, revealed as you left it,
with the rating tallies, the session timer and any card you rated Again all
intact — the review screen is set aside while you read, not torn down and
rebuilt. But the progress counter can shrink: if the note you read owns other
due cards later in this session, read-suppression removes them from it, so
you might return to "4 of 17" where it read "4 of 20". That's expected, not a
bug — the dashboard's deferred-cards line (above) is what tells you where
they went. (A long prompt comes back scrolled to the top.) A full page reload
still ends the session, as it always has.

**Open in Obsidian** moved into the viewer's header. It still opens via an
`obsidian://open` deep link and is still the better tool for *editing* a
note on a Mac — which the in-app viewer will never do — but is no longer
the only way to read one, so it no longer needs to be the primary action on
a phone that generally doesn't have Obsidian installed. The link's `vault`
parameter comes from **Settings → Obsidian vault name**, which defaults to
`vault` — matching the [Vault and authoring](#vault-and-authoring)
instructions above to open this repo's `vault/` folder directly as your
Obsidian vault. If you opened it under a different vault name (or your
vault has a different structure entirely), the default link won't resolve;
update the setting to match what Obsidian calls that vault.

## Backup

**Settings → Export** is the only copy of your review history. There is no
server-side copy — losing the phone (or Safari evicting storage) without
having exported means losing that history. Export periodically and keep the
file somewhere durable (e.g. iCloud Drive).
