# LaTeX math rendering

## Problem

Math in this vault is written as backtick code spans — `` `A^T*(b - A*x) = 0` ``
— and rendered as monospace ASCII by `inlineMarkup` in
`app/src/ui/renderers.ts`. A reader working through the least-squares
derivation sees `A^T*(b - A*x) = 0` rather than a typeset equation, and
nothing distinguishes a matrix transpose from a shell variable.

71 of 431 notes contain math-shaped code spans, concentrated in `vault/math`
and `vault/physics`. Many other `^`-bearing spans are genuinely code — `O(n^2)`
in `vault/clrs` is notation about programs — so no blanket change to `<code>`
handling is correct. Math needs its own construct.

## Decisions

Four choices were settled before this document, and the design follows from
them:

1. **Real LaTeX via KaTeX**, not a typographic approximation and not
   hand-written MathML. Stacked fractions, integrals and matrices are the
   point.
2. **All 71 existing notes migrate now**, not new notes only.
3. **A cloze answer may not contain math.** Clozes are graded by exact typed
   match, and nobody types `\frac{a}{b}` on a phone. Lint enforces it.
4. **KaTeX runs in the app, bundled** — not pre-rendered into `deck.json` and
   not loaded from a CDN.

On (4): the app renderers call `katex.renderToString` synchronously while
building HTML, so there is never a flash of raw LaTeX. `deck.json` and
`notes.json` keep plain LaTeX source, which means `search.ts`, the lint and
the deck-drift check keep working on text rather than on markup. Pre-rendering
would have grown `deck.json` by several hundred KB (KaTeX HTML runs ~10x its
source), forced the raw source to be carried alongside for search anyway, and
required the renderers to start trusting injected HTML instead of escaping
everything. A CDN breaks offline unless the service worker precaches it, at
which point it is the bundled option plus a third-party runtime dependency.

## Syntax

**Inline math** is `$...$`, usable anywhere inline markup runs today: prose,
headings, list items, and card prompts, answers and choices.

Flanking rules mirror the existing emphasis rules in `renderers.ts`: an
opening `$` must be preceded by start-of-string, whitespace or opening
punctuation and followed by a non-space character; a closing `$` must be
preceded by a non-space character and followed by end-of-string, whitespace or
punctuation. An unpaired `$` is left completely literal. A literal dollar sign
is written `\$`.

**Display math** is `$$` alone on a line, opening a block that runs to the
next `$$` alone on a line. Its contents are raw LaTeX, joined with `\n`,
passed to KaTeX verbatim. It must be separated from surrounding prose by blank
lines.

```markdown
Orthogonality to every column of A means:

$$
A^\top (b - Ax) = 0
$$

which distributes to the normal equations.
```

Display math is also supported **inline within card prompt and answer text**,
written `$$...$$` on a single line. This is not decoration: a card's prompt and
answer are single joined strings produced by `parseCards`, so a block-level
construct cannot structurally occur inside one. Without this form, display math
would render only in the note viewer, and the derivation cards that motivated
this work would keep their cramped inline rendering. A `$$...$$` run inside card
text renders as a centred display equation within the answer.

### Why `$$` on its own line

It mirrors the `FENCE` branch that both parser walks already have, so the
change is a parallel addition rather than a new parsing shape. It also keeps
`$$` unambiguous: `vault/aws/step-functions` writes `` `$$.Task.Token` ``, which
is inside a code span and therefore already untouchable, but an own-line
delimiter means no prose `$$` can ever be mistaken for an opener.

### Dollar signs already in the vault

`$` is live in 7 notes. Most occurrences are inside code spans (`` `$connect` ``,
`` `$$.Task.Token` ``) or code fences (the assembly listing in
`vault/operating-systems/concurrency/threads-and-the-thread-api.md`, the
suffix-array diagram in `vault/clrs/strings/suffix-arrays.md`). Code spans are
tokenized before math and code fences never receive inline markup at all, so
all of these are safe without change.

Two occurrences are in bare prose and are fixed during migration:

- `vault/security/tls/session-resumption-and-0-rtt.md:111` — `transfer $100`
  becomes `transfer \$100`.
- `vault/aws/edge/edge-functions-and-lambda-at-edge.md:79` — `point at $LATEST`
  becomes `` point at `$LATEST` ``, where this literal AWS token belonged anyway.

## Pipeline

### Types

`pipeline/src/types.ts` gains one variant, identical in both `RawBlock` and
`NoteBlock`:

```ts
| { kind: 'math'; text: string }
```

No `cardIndex` or `cardId`: a display equation is reading material and never
mints a card. Because the variant is identical in both unions, `resolveBlocks`
passes it through unchanged, exactly as it does for `code`, `heading` and
`list`.

### Parsing

A shared `DISPLAY_MATH = /^\s*\$\$\s*$/` joins the regex constants at the top
of `cards.ts`. That file's own comment names those shared constants as the
coupling that keeps its two independent walks in agreement, and this change
uses that mechanism rather than working around it.

- `parseBlocks` (cards.ts:355) gains a branch mirroring its fence branch at
  cards.ts:408: flush pending prose and list state, consume lines to the
  closing delimiter, push `{ kind: 'math', text }`.
- `parseCards` (cards.ts:263) gains a matching skip, mirroring its fence skip
  at cards.ts:272 and its fence break at cards.ts:313, so a display block's
  contents can never mint a card.

Both walks must be changed together. If only one is, `build.ts`'s
`resolveBlocks` total-zip assertion fails the build loudly — which is the
intended safety net, not an acceptable outcome.

### Lint

`pipeline/src/lint.ts` gains four rules, so every failure mode is a build
error rather than a broken card discovered on a phone:

1. **Unpaired `$`** — an unescaped, unpaired `$` in prose.
2. **Math in a cloze answer** — a `$` inside `==...==`, or a math span
   straddling a `==` boundary. This is decision (3), enforced the way
   `pipeline/tests/cloze-self-answer.test.ts` enforces its invariant.
3. **Invalid LaTeX** — a math span KaTeX rejects in strict mode.
4. **Card syntax inside a display block** — `==` or `::` between `$$`
   delimiters, which would otherwise mean the two parser walks disagree about
   how many cards a note has. The same rule enforces the blank line separating
   a `$$` block from adjacent prose, so that authoring requirement is checked
   rather than merely documented.

Rule 3 makes `katex` a dependency of the pipeline as well as the app. That is
deliberate: a typo'd `\frac` fails CI instead of rendering an error card.

### What does not change

`ParsedCard`, `DeckCard` and card extraction are untouched. Inline math is
just characters in prompt and answer text, so card ids, FSRS review state and
the deck-drift check are unaffected by this feature. The migration does change
prompt text in 71 notes, but ids are carried by `^card-xxxx` anchors and are
independent of the text.

## App

### Rendering

A new `app/src/ui/math.ts` exposes `renderMath(latex, display)`, wrapping
`katex.renderToString` with `throwOnError: false`, `trust: false`, and
`output: 'htmlAndMathml'`. The MathML half gives screen readers a real
equation rather than a soup of positioned spans, consistent with the WCAG
1.4.1 care already visible in `renderers.ts`. `throwOnError: false` means a
span that somehow reaches the client invalid renders in KaTeX's error styling
instead of throwing mid-render and blanking the card — lint rule 3 is the real
defence; this is the backstop.

### The escaping contract

`renderers.ts` documents a strict contract: escape first, then apply inline
markup, because the markup layer escapes nothing itself. Math complicates this,
because KaTeX needs **raw** LaTeX — `x < y` must not arrive as `x &lt; y`.

The resolution is a new entry point, `inlineWithMath(raw)`:

1. One combined tokenizer splits the raw string into backtick code spans, math
   spans (`$$...$$` before `$...$`, `\$` honoured as an escape), and the plain
   gaps between them.
2. Code spans and gaps go through the existing `escapeHtml` → `inlineMarkup`
   path, unchanged.
3. Math spans go to `renderMath`.

Code spans are tokenized before math, which is what keeps `` `$connect` `` code
rather than an opened math span.

The only unescaped HTML this introduces is KaTeX's own output under
`trust: false`, which cannot emit caller-supplied HTML. `inlineMarkup` keeps
its current signature and its existing tests.

### Call sites

- `note-render.ts:9` — `text()` becomes `inlineWithMath`. One line, and every
  block kind that routes through it inherits math.
- `note-render.ts` — a new `math` branch, rendered via `renderMath(text, true)`
  and never given inline markup, exactly as the `code` branch is never given
  inline markup.
- `renderers.ts` — the five `inlineMarkup(escapeHtml(...))` sites in
  `renderPrompt`, `substituteClozeBlank` and the mcq choice list.

A card answer containing `$$...$$` renders a block-level `<span
class="katex-display">`. The answer element becomes a `<div class="expected">`
rather than a `<p>`, since block content inside a paragraph is invalid HTML and
browsers will close the paragraph early.

### Search

`search.ts:68` switches exhaustively on `block.kind`, so the new variant must
be handled there or typecheck fails. Math blocks are indexed at the existing
`code` weight, on their raw LaTeX source. Indexing raw LaTeX admits a few
meaningless matches (`frac`, `partial`), but excluding math blocks would create
a silent hole where a note's central equation is unfindable, and the code-fence
precedent already indexes non-prose source.

`README.md`'s search section is updated to say math blocks are indexed.

### Offline

`katex.min.css` is imported so Vite emits KaTeX's fonts as content-hashed
assets under `assets/`, which `sw-routing.ts:44` already serves cache-first —
correct, because a hashed filename changes whenever its content does.

The gap is first use. A phone that installs the app and goes offline before
ever displaying a math card has no KaTeX fonts cached, and math renders in
fallback glyphs — legible but wrong, with broken stretchy delimiters. The fix
is `<link rel="preload">` in `index.html` for `KaTeX_Main-Regular` and
`KaTeX_Math-Italic`, which between them cover essentially all of this vault's
math and are fetched on first load into the same cache-first bucket.

The hand-written `SHELL` array in `sw.ts:12` is not extended: it lists stable
URLs, and hashed font filenames cannot be named by hand. `CACHE` does not need
bumping — the shell is network-first and fonts are new URLs, not stale ones.

### Styles

A new `app/src/styles/math.css`, imported alongside the existing style modules.
It covers display-equation spacing and horizontal overflow — a wide equation on
a 375px phone must scroll within its own block rather than widening the page.
KaTeX's own colours are inherited from `--text`, so light and dark themes need
no separate treatment.

## Migration

A separate commit from the mechanism, so the feature is reviewable apart from
the sweep.

The judgment per span is *math or code*. `A^T*A`, `R^n` and `∂^2f/∂x^2` become
`$A^\top A$`, `$\mathbb{R}^n$` and `$\partial^2 f/\partial x^2$`. `O(n^2)` in
`vault/clrs` and `vault/operating-systems` largely stays a code span, because it
is notation about programs rather than mathematics. The sweep goes category by
category, and anything genuinely ambiguous is raised rather than guessed at.

Cloze answers containing math are rewritten so the math sits in the prompt and
the blank falls on typeable prose — decision (3). Lint rule 2 finds every such
note, so none is missed by inspection.

`npm run build:deck` runs once at the end. Per `CLAUDE.md`, the working tree is
checked for stray untracked notes first, since the deck build walks `vault/`
rather than the git index.

## Testing

- **Tokenizer** (`app/tests`): code-span precedence over math; `\$` escaping;
  an unpaired `$` left literal; `$$...$$` preferred over `$...$`; and the two
  real prose cases from `session-resumption-and-0-rtt.md` and
  `edge-functions-and-lambda-at-edge.md` as regression fixtures.
- **Escaping**: a math span containing `<`, `>` and `&` renders as mathematics,
  and a non-math gap containing the same characters still escapes.
- **Cloze blank**: `substituteClozeBlank` matches `___` against already-marked-up
  HTML. A test covers a cloze prompt that also contains math, confirming KaTeX
  output introduces nothing that the `_{3,}` match can hit and that the blank
  still resolves.
- **Parsers** (`pipeline/tests`): `parseBlocks` emits a `math` block; `parseCards`
  mints no card from the same input; the two agree under `resolveBlocks` for a
  note mixing display math, clozes and callouts.
- **Lint**: one failing fixture per rule, and a passing fixture that uses all
  the legal forms.
- **Search**: a math block is indexed and findable by a term in its source.

## Out of scope

- **Math inside code fences.** A fence is code; `$` in one stays literal.
- **Chemistry (`\ce`), TikZ, and other KaTeX extensions.** Not loaded.
- **Math in `deck.json` as pre-rendered HTML.** Decision (4).
- **Authoring-time preview.** Lint reports an invalid span by line; that is the
  feedback loop.
