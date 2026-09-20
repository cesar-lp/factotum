# Review experience redesign

A UI/UX pass over all four screens, centred on the review screen. Phase 1
shipped a working scheduler behind an interface assembled from ad-hoc CSS;
this redesign gives that interface a token layer, a typographic identity,
and the states it never had — pressed feedback, a session exit, a
completion moment.

Scope is presentation and the small amount of scheduler/query plumbing new
presentation needs. No change to FSRS behaviour, the card parser, the vault
format, or the deck pipeline.

## Why

A walkthrough of the running app at 375x812 in both themes found defects
that fall into three groups.

**Readability.** 159 cards contain backticked code, 62 contain `**bold**`
and 37 `*italic*`; all of it renders as literal markdown mid-sentence.
Prompt length is p50 176 characters, p90 365, max 851 — and every prompt is
centred, which is the wrong treatment for anything past a line or two.

**Missing states.** There is no way to leave a session (a focus session can
be 105 cards; the only exit is the browser back gesture). There is no
completion screen — the hash clears and the dashboard reappears. No control
anywhere has a pressed, active, or focus state, so on a touch device every
tap feels dead. A wrong cloze discards what you typed instead of showing it
next to the right answer.

**No system.** Nine type sizes, several one pixel apart; ten raw spacing
values; four radii; two button tiers where three are needed. `--dim` on
`--bg` measures about 3.2:1, below AA, and is the colour of nearly every
small label in the app.

## Design

### 1. Token layer

`theme.css` gains scales; `styles.css` stops using raw numbers.

| Scale | Tokens |
| --- | --- |
| Type | `--text-display` 56 · `--text-prompt` 21 · `--text-body` 16 · `--text-label` 14 · `--text-micro` 12 |
| Space | `--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 24 · `--s6` 32 |
| Radius | `--r-sm` 8 · `--r-md` 12 · `--r-pill` 999px |

The existing 17/16/15 all collapse to `--text-body`; 13/12/11 all collapse
to `--text-micro`.

Two families plus mono:

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-serif: ui-serif, 'New York', 'Iowan Old Style', Palatino, Georgia, serif;
--font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
```

Serif is for card prompts and answers only. Chrome — nav, buttons, labels,
stats, citations — stays sans. A system stack was chosen over a self-hosted
webfont deliberately: this is an offline-first PWA with no server, and a
font file would have to join the service-worker precache and would flash on
first load. `ui-serif` resolves to New York on the target device.

`--dim` darkens until it clears 4.5:1 against `--bg` in both themes. Both
the light and dark values change, and the two dark blocks in `theme.css`
(the `prefers-color-scheme` block and the `[data-theme='night']` block) must
stay in agreement — they are duplicated today and will drift if only one is
edited.

### 2. Button tiers and interaction states

Three tiers replace the current two:

- `.btn` — filled `--accent`. One per screen, bottom-anchored.
- `.btn-secondary` — `--surface` fill, `--line` border, same geometry as
  `.btn`. New. This is what "Keep going" and "Export backup" become.
- `.btn-quiet` — text only, but at `--text-body` and `--text`, not
  `--text-micro` and `--dim`.

Every tappable control gains:

```css
:active  { transform: scale(0.97); }  /* plus a background shift */
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

`:active` matters more than it looks: iOS has no hover, so without it a tap
produces no acknowledgement at all until the next render lands.

### 3. Inline markup

A new `inlineMarkup(value: string): string` in `app/src/ui/renderers.ts`
handles exactly three constructs and nothing else:

| Source | Output |
| --- | --- |
| `` `code` `` | `<code>code</code>` |
| `**bold**` | `<strong>bold</strong>` |
| `*italic*` | `<em>italic</em>` |

It runs **after** `escapeHtml`, on already-escaped text, and emits only the
three tags above — so it can never reintroduce an injection path from
free-form vault content. It replaces the bare `escapeHtml` call in
`renderPrompt`, in the answer paragraph, and in mcq choice text.

Constraints worth stating because they are easy to get wrong:

- Backtick spans win over `*`/`**`: emphasis markers **inside** a code span
  are literal. Tokenize code spans first, then apply emphasis to the gaps.
- `**` must be tried before `*`, or `**x**` renders as `<em>*x*</em>`.
- An unmatched marker stays literal. A prompt containing a lone `*` must
  render as a lone `*`, not swallow the rest of the line.
- `$` math appears in exactly one card and is explicitly out of scope.

Tests go in `app/tests/renderers.test.ts` and must cover: each construct,
nesting of emphasis inside code, unmatched markers, and that HTML in the
source is still escaped.

### 4. Review screen

**Layout.** Today `.prompt-area` is `flex: 1; justify-content: center`, so
a short prompt floats to the middle of the screen and a long one fills it —
the prompt lands somewhere different on every card. Replace with a
three-part column:

```
header    progress + counter + close       (fixed, top)
body      chip, prompt, answer             (scrolls when tall)
actions   format-specific controls         (fixed, bottom)
```

The prompt is anchored to the top of `body` and **left-aligned**, as is the
answer and the chip above it. Centring goes away.

**Header.** `12 / 40` plus the progress bar, plus a `×` that leaves the
session. The denominator is the count of **distinct** cards in the session
and does not change as learning cards requeue. Today requeues splice into
`deps.session` and the denominator climbs — observed going 1/10 → 2/11 →
3/12 within three cards, which reads as losing ground.

`×` ends the session and goes to the summary screen (section 5), not
straight to the dashboard. Nothing needs confirming: every card is
persisted by `recordReview` as it is graded, so leaving mid-session loses
nothing.

**Rating row.** Four two-line buttons — label in `--text-label`, next
interval below in `--text-micro` `--dim`:

```
  Again      Hard       Good       Easy
   10m        1d         4d         9d
```

Intervals come from a new pure function in `app/src/scheduler/fsrs.ts`:

```ts
export interface IntervalPreview { again: string; hard: string; good: string; easy: string }
export function previewIntervals(
  state: ReviewState, now: Date, desiredRetention: number
): IntervalPreview
```

It uses `ts-fsrs`'s `repeat()`, which returns all four grades' resulting
cards in one call, and formats each `due - now` as `10m` / `4h` / `3d` /
`2mo`. It must not mutate `state` and must not be the path that actually
schedules anything — `applyRating` stays the only writer. Tests assert the
four values are ordered `again <= hard <= good <= easy` and that formatting
crosses the minute/hour/day/month boundaries correctly.

The row renders for qa, recall, and self-graded cloze. MCQ and typed cloze
grade themselves through `ratingFor`, so they keep their Continue button
and get no row.

**Cloze reveal.** Two changes. The answer is substituted into the blank in
the prompt rather than shown detached below it — the sentence completes
itself, tinted `--ok` on a correct answer and `--accent` when revealed
unanswered. And on a wrong answer, **what you typed is shown above the
correct answer**, tinted `--bad`. Today it is discarded, which removes the
comparison that is most of the learning.

**MCQ.** Choices gain `A`/`B`/`C`/`D` badges and stronger borders, so they
read as controls rather than paragraphs. The existing shuffle invariant is
untouched: `getPresentationChoices` still computes one order per card
presentation and `highlightClasses` still matches by position.

**Chip.** A new `app/src/ui/labels.ts` exports
`categoryLabel(category: string, topic?: string): string`, which strips a
redundant topic-derived prefix and humanizes what is left —
`os-virtualization` under `operating-systems` becomes `virtualization`,
`algo-graphs` under `algorithms` becomes `graphs`, `amp` under
`concurrency` has no shared prefix and stays `amp`. Used by both the review
chip and the topics list. Pure and unit-tested.

**Citations** move to `--text-micro`, left-aligned with the answer,
de-emphasised.

### 5. Session summary

A new `app/src/ui/summary.ts` renders a completion screen, reached both by
finishing a session and by the header `×`:

- cards reviewed
- again-rate (share of gradings that were `Rating.Again`)
- time spent
- per-rating breakdown

Every field derives from entries `startReview` already writes to
`reviewLog`, which stores `rating` and `durationMs` and indexes `ts`. The
screen collects its own totals in-session rather than re-querying, so a
summary reflects exactly the session just finished. **No schema change.**

A single `Done` button returns to wherever the session came from — the
dashboard for `#review` and `#review-extend`, `#topics` for a focus
session, matching the existing `onDone` routing in `main.ts`.

### 6. Dashboard

The 56px due count stays; it is the one element already doing its job.

Below it, a streak and a seven-day review-count bar row, from a new
`app/src/db/stats.ts` that reads `reviewLog` over its `ts` index. Streak is
consecutive days with at least one review, counted back from today, using
the existing `dayKey` from `scheduler/queue.ts` so day boundaries match the
new-card counter's.

The all-clear state stops being a **disabled button labelled "All clear"**.
A disabled control is how the app currently reports success, and it reads
as broken. It becomes a real state: a mark, the message, and no dead
control. "Keep going" moves to `.btn-secondary` so it no longer competes
with the primary as a second full-weight accent button.

### 7. Topics and Settings

Token pass, plus:

- **Topics** — a real switch instead of the `on`/`off` word button, with
  `learn` separated from it (today they are adjacent 44px quiet buttons 8px
  apart, and a mis-tap mutes a shelf when you meant to start a session).
  Category names via `categoryLabel`. Shelf-level due/new counts in the
  `topic-head`. The row chip drops to `--dim` when it reads `0 due`.
- **Settings** — desired retention becomes a labelled percentage slider
  (today a raw number spinner showing `0,9` under a comma-decimal locale).
  Theme becomes a three-way segmented control. Export drops to
  `.btn-secondary`; it is currently the visual focus of the screen. A
  read-only "deck synced" line is added, which matters for an offline-first
  app with a cached deck.

`clampSettings` / `sanitizeSettings` stay the single source of validity —
the slider's range must be derived from the same [0.7, 0.97] bounds rather
than hardcoding a second copy.

### 8. Icon and PWA

New artwork: three offset rounded rectangles — a card stack — in `--on-accent`
cream on `--accent` ochre. Generated as a committed SVG source plus exported
PNGs, so it can be regenerated rather than being an opaque binary.

Required outputs and manifest changes:

- `icon-192.png`, `icon-512.png` — regenerated with the new mark
- `icon-maskable-512.png` with `"purpose": "maskable"`, artwork inside the
  80% safe zone. Without this, Android composites the icon onto a white
  backplate.
- `apple-touch-icon.png` at 180x180, linked from `index.html`. Opaque, square,
  unrounded — iOS applies its own mask.
- `apple-mobile-web-app-status-bar-style` meta
- The manifest's hardcoded `"theme_color": "#faf4e8"` is removed or made to
  match. `index.html` already does theme-colour correctly with media
  queries, but in standalone mode the manifest value can override it and
  produce a cream status bar in dark mode.
- `description`, and a `shortcuts` entry that deep-links to `#review`.

`app/src/sw.ts` precache list must be checked against the new asset names;
a renamed or added icon that the service worker does not know about is an
offline hole.

## Testing

Everything in this redesign that is not CSS is a pure function, and is
tested as one:

| Unit | Tests |
| --- | --- |
| `inlineMarkup` | `app/tests/renderers.test.ts` |
| `previewIntervals` + formatter | `app/tests/fsrs.test.ts` |
| `categoryLabel` | new `app/tests/labels.test.ts` |
| streak / 7-day counts | new `app/tests/stats.test.ts` |
| stable progress denominator | `app/tests/review-requeue.test.ts` |

Presentation itself is verified in the browser preview at 375x812 in both
themes, per screen and per card format.

The existing 258 tests are green at the start of this work and must be
green at the end. `npm test && npm run typecheck && npm run build:deck &&
git status --porcelain` must pass with an empty final line before the PR,
per `CLAUDE.md`.

## Out of scope

- FSRS parameters, scheduling behaviour, and the queue builder
- The card parser, vault format, and deck pipeline
- Block markdown in prompts — lists, links, code blocks, tables
- LaTeX/math rendering (one card, not worth a dependency)
- Backup *import* to match export — a real gap, but its own change
- Notification push and automated note generation (later phases)
