# Topic Categories, Plug-n-Play Toggles, and On-Demand Sessions — Design Spec

Status: approved 2026-09-19. Supersedes nothing; extends
`2026-09-18-factotum-design.md` §3 (content model), §5 (scheduling) and §7
(UI). Implements the mechanism only — authoring CLRS and AWS notes is
deliberately out of scope and follows in separate branches.

## 1. Problem

`category` is a flat string, and the README caps a category at roughly 8–12
notes so that interleaving and per-category mastery stay meaningful. The
vault is about to gain CLRS (~5–6 categories) and AWS (~7–8: DynamoDB,
OpenSearch, RDS, S3, Lambda, SQS/SNS, …) on top of today's 7 categories.
Three things break at that size:

1. **No shelf.** "Mute all of AWS" is eight independent decisions, and a
   flat picker of ~20 categories is unreadable.
2. **No opt-out.** `buildSession` takes every non-tombstoned card. The only
   exclusion mechanism is per-card `suspended`, which is a leech-handling
   tool, not a "not ready for this subject yet" tool.
3. **No on-demand path.** Review is exclusively the daily interleaved
   queue. There is no way to deliberately sit down with one topic.

## 2. Goals and non-goals

**Goals**

- A grouping level above `category`, so categories can be presented and
  toggled by shelf.
- Per-**category** enable/disable that keeps disabled material out of the
  daily session and its extension.
- An on-demand focused session over a single category, in addition to (not
  instead of) the daily session.

**Non-goals**

- Authoring CLRS or AWS notes. Separate branches.
- Per-topic FSRS parameters, per-topic retention, or topic-level mastery
  bars (spec §8 item 3 remains as written, keyed on `category`).
- Changing what interleaving operates on. Interleaving stays per-`category`.
- Any change to the daily session's shape, cap, or ordering when nothing is
  disabled. With an empty `disabledCategories`, behavior is byte-identical
  to today.

## 3. Content model

### 3.1 The `topic` key

Notes gain an optional frontmatter key `topic`, above `category`:

```markdown
---
topic: aws
category: aws-dynamodb
tags: [nosql, partition-key]
---
```

- **topic** — the shelf: a book, a cloud provider, a subject. The unit you
  group and bulk-toggle by.
- **category** — unchanged: the ~8–12-note unit that interleaving buckets
  on and that mastery bars will be keyed to.

`topic` is **optional**. When absent, blank, or not a string, the pipeline
defaults it to the note's own `category`. A missing topic therefore never
fails a build and never blocks a card from being generated — it simply
yields a single-category shelf. Values are trimmed; comparison is exact and
case-sensitive, matching how `category` is already treated.

`category` remains required — a note without it is still ignored entirely.

### 3.2 Backfill

The existing 68 notes are backfilled so the picker groups sensibly from the
first run. This is mechanical and content-free:

| category | topic |
|---|---|
| `networking` | `networking` |
| `data-systems` | `data-systems` |
| `database-internals` | `database-internals` |
| `amp` | `concurrency` |
| `os-virtualization` | `operating-systems` |
| `os-concurrency` | `operating-systems` |
| `os-persistence` | `operating-systems` |

Only OSTEP's three categories and `amp` change grouping; the other three
become single-category shelves, which is the same thing the default rule
would have produced. They are still written explicitly so every note in the
vault states its shelf.

Folder structure stays free-form. `topic` is derived from frontmatter only,
never from a path — the same rule `category` already follows.

### 3.3 Deck format

`NoteMeta` and `DeckCard` gain `topic: string`. It is always populated in
`deck.json` (the default rule guarantees it), so consumers never handle an
absent topic. Example card:

```json
{
  "id": "card-m8q4",
  "format": "mcq",
  "topic": "networking",
  "category": "networking",
  "tags": ["tcp"],
  "prompt": "At which OSI layer does TCP operate?",
  "choices": [{ "text": "Transport (4)", "correct": true }],
  "source": { "path": "vault/networking/tcp.md", "block": "card-m8q4" },
  "citations": ["RFC 793 §1.4"]
}
```

`StoredCard extends DeckCard`, so IndexedDB picks `topic` up for free on the
next deck merge. Cards already in IndexedDB from a pre-`topic` deck are
updated in place by the existing merge-by-id rule; no migration is needed
and FSRS state is preserved, exactly as for any other content change.

## 4. Selection

### 4.1 Disabled categories

`buildSession` and `buildExtension` are **not** modified. One new pure
function in `app/src/scheduler/queue.ts`:

```ts
export function selectEnabled(
  cards: StoredCard[],
  disabled: ReadonlySet<string>
): StoredCard[]
```

It returns the cards whose `category` is not in `disabled`, preserving input
order. `loadDashboardState` applies it once, before building both the
session and the extension, so a disabled category is absent from the daily
queue, from the "keep going" extension, and from every count the dashboard
renders.

**Disabling is a filter, not a freeze.** FSRS state is untouched: due dates
keep advancing while a category is off, so re-enabling surfaces whatever
became overdue in the meantime, all at once. This is deliberate — FSRS
models forgetting over real elapsed time, and pretending the clock stopped
would misrepresent how much of that material is actually still retained.

Per-card `suspended` and `tombstoned` continue to work exactly as before and
are orthogonal to this.

### 4.2 Focused sessions

A focused session is composition of the two existing builders, not a third
scheduling path. For the cards of one category:

```ts
const catCards = cards.filter((c) => c.category === category);
const focus = [
  ...buildSession({ cards: catCards, reviews, now, newCardsPerDay: 0, newCardsSeenToday: 0 }),
  ...buildExtension({ cards: catCards, reviews })
];
```

`newCardsPerDay: 0` makes `buildSession` contribute due cards only;
`buildExtension` then contributes every unseen card in the category,
uncapped. Result: **that category's due cards first, then all its new cards,
with no daily limit.**

Consequences, all intended:

- Grading in a focused session is a **real review**. It writes FSRS state
  and appends to `reviewLog` identically to the daily session. There is no
  "drill mode" that discards results.
- New cards taken in a focused session **do** count toward
  `newCardsSeenToday`, and therefore shrink the remaining daily allowance.
  The cap means "new cards introduced today", regardless of which screen
  introduced them.
- Not-yet-due cards are **not** included. A focused session never pulls a
  card forward and so cannot corrupt an existing schedule.
- A **disabled** category can still be focused. Disabling means "keep this
  out of my daily queue", not "hide this" — deliberately picking it is the
  entire point of an on-demand session.
- `tombstoned` and `suspended` cards stay excluded, inherited from the two
  builders unchanged.

## 5. Persistence

`Settings` gains one field:

```ts
disabledCategories: string[];
```

Default `[]` — **categories are enabled by default**. A category added to
the vault joins the daily rotation immediately; you turn off what you are
not ready for. The inverse (an allowlist) was rejected because it makes a
freshly written note silently unreviewable until someone remembers to opt
in.

`sanitizeSettings` coerces the field with the same defensive posture it
already applies to the other three: a non-array becomes `[]`; non-string
entries are dropped; entries are trimmed and empty ones dropped; duplicates
are removed; the list is capped at 200 entries to bound a corrupt write.
Order is not significant and is not preserved as meaningful.

**No `openDb` version bump.** Settings live as a single value in the
existing `meta` store, and `sanitizeSettings` already falls back
field-by-field, so a settings object written before this change reads back
with `disabledCategories: []`. `exportBackup` dumps every `meta` key, so the
preference rides along in backups with no change there either.

A category name in `disabledCategories` that no longer exists in the deck
(renamed, deleted) is harmless: it filters nothing and is simply not
rendered by the picker. It is not auto-pruned — a temporarily missing deck
must not silently re-enable a muted shelf.

## 6. UI and routing

### 6.1 Topics screen

A new screen at `#topics`, reached from a new dashboard button. Settings is
untouched — this is a browsing surface, not a preferences form.

Layout: one section per topic, sorted by topic name. Each section header
carries the topic name and a **toggle-all** control. Its action is
unambiguous: if *any* category on that shelf is currently enabled, it
disables all of them; only when every category on the shelf is already
disabled does it enable all of them. Within a section, each category is a
row with:

- the category name,
- its due-card and new-card counts (computed from the same review state the
  dashboard uses, and **not** affected by whether the category is disabled —
  the counts describe the material, so a muted shelf still shows what is
  waiting behind it),
- an enable/disable toggle,
- a **Learn** button starting a focused session for that category.

A category with zero cards in the deck is not rendered. A topic whose
categories are all disabled renders normally, visibly off — nothing is
hidden.

Toggling writes `disabledCategories` through `saveSettings` immediately, the
same write-on-change pattern the settings screen already uses.

### 6.2 Routing

`decideRoute` in `app/src/route.ts` gains two decisions. It stays pure and
DOM-free.

- `#topics` → `'topics'`.
- `#focus/<category>` → `'focus'`, carrying the decoded category name.

Because a hash is plain client state — reachable from a stale
back/forward entry, a reload, or a bookmark — `'focus'` is validated the
same way `'review-extend'` already is: the decision falls back to
`'dashboard'` when the category is absent from the deck or its focused
session would be empty, and `route()` clears the stale hash. The category
segment is URL-encoded on write and decoded on read, since category names
are free-form frontmatter strings.

`decideRoute`'s return type changes from a bare string union to a
discriminated union so `'focus'` can carry its category:

```ts
export type RouteDecision =
  | { kind: 'review' }
  | { kind: 'review-extend' }
  | { kind: 'focus'; category: string }
  | { kind: 'topics' }
  | { kind: 'settings' }
  | { kind: 'dashboard' };
```

Existing `route.test.ts` cases are updated to the new shape. Precedence is
unchanged and explicit: `#review` (when the session is non-empty) wins,
then `#review-extend` under its existing empty-session guard, then
`#focus/…`, then `#topics`, then `#settings`, then the dashboard. Focus
deliberately does **not** require the daily queue to be empty — it is an
extra, available whenever you ask for it.

Focused sessions reuse `startReview` verbatim, with `onDone` returning to
`#topics` rather than the dashboard, so a focused session lands you back
where you launched it.

## 7. Testing

TDD throughout, matching the repo's existing test layout.

**Pipeline**

- `frontmatter.test.ts` — `topic` parsed and trimmed; absent/blank/
  non-string `topic` defaults to `category`; a note with `topic` but no
  `category` is still ignored.
- `build.test.ts` — `topic` reaches `DeckCard` in `deck.json`, including
  the defaulted case.

**App**

- `queue.test.ts` — `selectEnabled` excludes disabled categories and
  preserves order; an empty disabled set is a no-op; disabled categories are
  absent from both session and extension; the focused-session composition
  yields due-then-all-new ordering, is uncapped, excludes not-yet-due cards,
  and excludes suspended/tombstoned cards.
- `settings.test.ts` — `disabledCategories` defaults to `[]`; a non-array,
  non-string entries, blanks, duplicates, and an over-long list are all
  coerced; a settings object written before this change reads back with the
  default.
- `route.test.ts` — `'topics'` and `'focus'` decisions; focus carries the
  decoded category; a stale `#focus/…` for an unknown or empty category
  falls back to the dashboard; existing precedence cases still hold under
  the new discriminated-union shape.

**Regression bar:** with `disabledCategories: []`, the existing session and
extension tests must pass unchanged. That is the guarantee that this feature
is inert until used.

## 8. Documentation

README gains a `topic` paragraph in "Vault conventions" (topic = shelf,
category = the unit interleaving and mastery use; folders stay free-form)
and a short section describing the topics screen, the default-on rule, and
what a focused session does to scheduling. The frontmatter example near the
top of the README gains a `topic` line.

## 9. Out of scope, deliberately

- Topic-level mastery bars or stats.
- Rescheduling or burying a backlog when a category is re-enabled.
- Reordering, renaming, or creating topics from the app. Topics come from
  the vault; the app only reads them.
- A cram mode over not-yet-due cards.
