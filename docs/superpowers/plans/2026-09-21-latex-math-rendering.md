# LaTeX Math Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render mathematics in cards and notes as typeset LaTeX via KaTeX, instead of the monospace ASCII code spans the vault uses today.

**Architecture:** KaTeX is bundled into the app and called synchronously while HTML is built, so there is no flash of raw LaTeX and `deck.json` stays plain text. Inline math is `$...$`; display math is either a `$$`-delimited note block (a new `math` block kind flowing through both parser walks) or a `$$...$$` run inside card text. A new `inlineWithMath` tokenizer sits in front of the existing escape-then-markup pipeline, giving code spans precedence over math so `` `$connect` `` stays code.

**Tech Stack:** TypeScript, Vite, Vitest, KaTeX. No framework — the app builds HTML strings directly.

**Spec:** `docs/superpowers/specs/2026-09-21-latex-math-rendering-design.md`

## Global Constraints

- **Escape-then-markup is a security contract.** `escapeHtml` runs before any markup layer; markup layers escape nothing themselves. The only unescaped HTML this feature may introduce is KaTeX output produced with `trust: false`.
- **KaTeX options in the app:** `throwOnError: false`, `trust: false`, `strict: false`, `output: 'htmlAndMathml'`. The MathML half is required — it is what a screen reader reads.
- **KaTeX options in the lint:** `throwOnError: true`, `strict: 'error'`. Invalid LaTeX must fail CI, not render an error card on a phone.
- **`parseCards` and `parseBlocks` are two independent walks** over the same body, kept in agreement by the shared regex constants at the top of `pipeline/src/cards.ts`. Any delimiter added to one MUST be added to the other in the same commit, using a shared exported constant.
- **`pipeline/tests/vault-lint.test.ts` asserts the real vault has zero lint problems.** A commit that adds a lint rule must, in that same commit, fix every existing note the rule flags.
- **Node version comes from `.nvmrc`.** Do not create a `.tool-versions`. See `CLAUDE.md`.
- **Never hand-write or edit a `^card-xxxx` anchor.** The build assigns them.
- **Pre-PR gate:** `npm test && npm run typecheck && npm run build:deck && git status --porcelain` — the last command must print nothing.
- **Commit messages** are Conventional Commits, explain *why* in the body, and end with:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

---

### Task 1: KaTeX dependency and the `renderMath` wrapper

**Files:**
- Modify: `package.json` (dependencies)
- Create: `app/src/ui/math.ts`
- Test: `app/tests/math.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `renderMath(latex: string, display?: boolean): string` — returns a KaTeX HTML+MathML string. Every later task calls this and nothing else from KaTeX.

- [ ] **Step 1: Install KaTeX**

KaTeX is a runtime dependency of both the app and the pipeline lint, so it goes in `dependencies`, not `devDependencies`.

```bash
npm install katex@^0.16.11
npm install --save-dev @types/katex
```

- [ ] **Step 2: Write the failing test**

Create `app/tests/math.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderMath } from '../src/ui/math.js';

describe('renderMath', () => {
  it('renders inline math as KaTeX HTML', () => {
    const html = renderMath('x^2');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('katex-display');
  });

  it('renders display math in display mode', () => {
    const html = renderMath('A^\\top A x = A^\\top b', true);
    expect(html).toContain('katex-display');
  });

  it('emits MathML alongside the HTML, so screen readers get a real equation', () => {
    expect(renderMath('\\frac{a}{b}')).toContain('<math');
  });

  it('does not throw on invalid LaTeX, so one bad span cannot blank a card', () => {
    expect(() => renderMath('\\frac{')).not.toThrow();
    expect(renderMath('\\frac{')).toContain('katex');
  });

  it('never emits raw HTML from the source, even via \\href', () => {
    const html = renderMath('\\href{javascript:alert(1)}{x}');
    expect(html).not.toContain('javascript:');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run app/tests/math.test.ts`
Expected: FAIL — cannot resolve `../src/ui/math.js`.

- [ ] **Step 4: Write the implementation**

Create `app/src/ui/math.ts`:

```ts
import katex from 'katex';

/**
 * Renders a LaTeX span to HTML. The single point in the app where KaTeX is
 * called, so its options are stated once rather than at each call site.
 *
 * `output: 'htmlAndMathml'` is not optional: the HTML half is a tree of
 * absolutely-positioned spans that a screen reader reads as nonsense, and
 * the MathML half is the only part that carries the equation's actual
 * structure. `trust: false` refuses `\href` and friends, which is what
 * keeps this the one place allowed to bypass escapeHtml.
 *
 * `throwOnError: false` renders an invalid span in KaTeX's error styling
 * instead of throwing mid-render and blanking the whole card. It is a
 * backstop only -- the real defence is the `invalid-math` lint rule, which
 * fails the build before a bad span can ever reach a phone.
 */
export function renderMath(latex: string, display = false): string {
  return katex.renderToString(latex, {
    displayMode: display,
    throwOnError: false,
    trust: false,
    strict: false,
    output: 'htmlAndMathml'
  });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run app/tests/math.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors. If `katex` has no types, confirm `@types/katex` installed in Step 1.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json app/src/ui/math.ts app/tests/math.test.ts
git commit -F - <<'MSG'
feat: add KaTeX math rendering wrapper

One module owns every KaTeX call so its options are stated once. Two
of them are load-bearing rather than taste: htmlAndMathml, because the
HTML half is positioned spans that a screen reader reads as nonsense
and only the MathML carries the equation's structure; and trust:false,
because this is the one place in the app permitted to emit HTML that
did not go through escapeHtml, so it must not be able to emit
caller-supplied markup.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 2: The `inlineWithMath` tokenizer

This is the heart of the feature. It sits in front of the existing escape-then-markup pipeline and must give code spans precedence over math.

**Files:**
- Modify: `app/src/ui/renderers.ts` (add after `inlineMarkup`, around line 68)
- Test: `app/tests/renderers.test.ts`

**Interfaces:**
- Consumes: `renderMath(latex, display)` from Task 1.
- Produces: `inlineWithMath(raw: string): string` — takes **raw, unescaped** text and returns safe HTML. Tasks 3 and 4 replace their `inlineMarkup(escapeHtml(x))` calls with `inlineWithMath(x)`. `inlineMarkup` and `escapeHtml` keep their current signatures and tests.

- [ ] **Step 1: Write the failing tests**

Append to `app/tests/renderers.test.ts` (and add `inlineWithMath` to the existing import list from `../src/ui/renderers.js`):

```ts
describe('inlineWithMath', () => {
  it('renders an inline math span', () => {
    const html = inlineWithMath('the residual $b - Ax$ is orthogonal');
    expect(html).toContain('class="katex"');
    expect(html).toContain('the residual ');
    expect(html).toContain(' is orthogonal');
  });

  it('renders a $$...$$ run inside card text as display math', () => {
    expect(inlineWithMath('gives $$A^\\top A x = A^\\top b$$ exactly')).toContain('katex-display');
  });

  it('gives code spans precedence, so `$connect` stays code', () => {
    const html = inlineWithMath('reserved routes (`$connect`, `$disconnect`)');
    expect(html).toContain('<code>$connect</code>');
    expect(html).toContain('<code>$disconnect</code>');
    expect(html).not.toContain('katex');
  });

  it('treats \\$ as a literal dollar, not a delimiter', () => {
    const html = inlineWithMath('transfer \\$100 from account A to account B');
    expect(html).toContain('transfer $100 from account A');
    expect(html).not.toContain('katex');
  });

  it('leaves an unpaired $ completely literal', () => {
    const html = inlineWithMath('point at $LATEST and let it float');
    expect(html).toBe('point at $LATEST and let it float');
  });

  it('escapes the non-math gaps', () => {
    expect(inlineWithMath('a <b> & $x$')).toContain('&lt;b&gt; &amp;');
  });

  it('does not escape the math itself -- KaTeX needs raw LaTeX', () => {
    // If "<" reached KaTeX as "&lt;" it would typeset the entity text.
    const html = inlineWithMath('$x < y$');
    expect(html).toContain('katex');
    expect(html).not.toContain('&amp;lt;');
  });

  it('still applies emphasis in the gaps', () => {
    expect(inlineWithMath('**bold** and $x$')).toContain('<strong>bold</strong>');
  });

  it('does not mistake multiplication asterisks for emphasis', () => {
    expect(inlineWithMath('O(E * |f*|)')).not.toContain('<em>');
  });

  it('leaves a lone $ inside an otherwise plain sentence alone', () => {
    expect(inlineWithMath('costs $5')).toBe('costs $5');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/tests/renderers.test.ts`
Expected: FAIL — `inlineWithMath` is not exported.

- [ ] **Step 3: Write the implementation**

In `app/src/ui/renderers.ts`, add the import at the top:

```ts
import { renderMath } from './math.js';
```

Then add below `applyEmphasis` (after the existing `ITALIC_RE`/`applyEmphasis` block):

```ts
/**
 * Stand-in for a backslash-escaped dollar while the tokenizer runs, so `\$`
 * can never open or close a math span. U+0000 cannot appear in a vault note
 * (the build reads UTF-8 markdown), which is what makes this substitution
 * safe rather than merely unlikely to collide.
 */
const ESCAPED_DOLLAR = '\u0000d\u0000';

const CODE_SPAN = '`[^`]+`';
// `$$...$$` is tried before `$...$`, so a display run is never parsed as two
// empty inline spans. Single-line only: a multi-line display equation is a
// `math` BLOCK (see pipeline/src/cards.ts), not an inline construct.
const DISPLAY_MATH_SPAN = String.raw`\$\$(?:[^$]+)\$\$`;
// Same flanking rules as emphasis, and for the same reason: this deck's prose
// contains bare dollar signs (prices, `$LATEST`), and a marker that is not
// properly flanked on both sides must stay literal rather than swallow the
// rest of the sentence looking for a partner.
const INLINE_MATH_SPAN = `${OPEN_BEFORE}\\$(?:\\S(?:[^$]*\\S)?)\\$${CLOSE_AFTER}`;
const MATH_TOKENS = new RegExp(`(${CODE_SPAN}|${DISPLAY_MATH_SPAN}|${INLINE_MATH_SPAN})`, 'gu');

/**
 * Entry point for any text that may contain math. Takes RAW, unescaped text
 * -- unlike `inlineMarkup`, which requires pre-escaped input.
 *
 * The inversion is forced by KaTeX: it needs real LaTeX, so `x < y` must
 * reach it as `x < y` and not as `x &lt; y`, which it would typeset as the
 * literal entity. Escaping therefore cannot happen up front for the whole
 * string; it happens per non-math chunk instead.
 *
 * Code spans are tokenized in the SAME pass as math and matched first, which
 * is what keeps `` `$connect` `` (and `` `$$.Task.Token` ``, both real vault
 * content) code rather than an opened math span. Non-math gaps are handed to
 * the existing escapeHtml -> inlineMarkup path unchanged; they contain no
 * backticks by construction, so inlineMarkup only applies emphasis to them.
 *
 * The one piece of unescaped HTML this introduces is KaTeX's own output under
 * `trust: false`, which cannot emit caller-supplied markup. That is the whole
 * exception to renderers.ts's escape-first contract -- do not widen it.
 */
export function inlineWithMath(raw: string): string {
  const shielded = raw.replace(/\\\$/g, ESCAPED_DOLLAR);
  return shielded
    .split(MATH_TOKENS)
    .map((part) => {
      if (part === undefined || part === '') return '';
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        // Same output as inlineMarkup's code branch; produced here because
        // the span was consumed by this pass rather than that one.
        return `<code>${escapeHtml(unshieldLiteral(part.slice(1, -1)))}</code>`;
      }
      if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
        return renderMath(unshieldLatex(part.slice(2, -2)).trim(), true);
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
        return renderMath(unshieldLatex(part.slice(1, -1)).trim(), false);
      }
      return inlineMarkup(escapeHtml(unshieldLiteral(part)));
    })
    .join('');
}

/** Outside math, a shielded `\$` was only ever a literal dollar sign. */
function unshieldLiteral(text: string): string {
  return text.replaceAll(ESCAPED_DOLLAR, '$');
}

/** Inside math, `\$` is LaTeX's own escape and must survive as such. */
function unshieldLatex(text: string): string {
  return text.replaceAll(ESCAPED_DOLLAR, String.raw`\$`);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/tests/renderers.test.ts`
Expected: PASS — the new `inlineWithMath` block plus every pre-existing test in the file. If a pre-existing `inlineMarkup` test broke, the change went too far: `inlineMarkup` must be untouched.

- [ ] **Step 5: Commit**

```bash
git add app/src/ui/renderers.ts app/tests/renderers.test.ts
git commit -F - <<'MSG'
feat: tokenize inline and display math ahead of inline markup

KaTeX needs raw LaTeX, so the escape-first contract cannot hold for a
whole string any more: "x < y" must reach KaTeX as typed, not as
"x &lt; y", which it would typeset as the literal entity. Escaping
moves to a per-chunk step instead, and the one piece of unescaped HTML
introduced is KaTeX output under trust:false, which cannot emit
caller-supplied markup.

Code spans are matched in the same pass and tried first. This is not a
nicety: the vault already writes `$connect` and `$$.Task.Token` in
AWS notes, and either would otherwise open a math span. Bare prose
dollars get the same flanking rules as emphasis, so "point at $LATEST"
stays literal rather than swallowing the rest of the sentence looking
for a closing delimiter.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 3: Math in review cards

**Files:**
- Modify: `app/src/ui/renderers.ts` (`substituteClozeBlank`, `renderPrompt`, `renderActions`'s mcq branch)
- Modify: `app/src/styles/review.css` (the `.expected` selector, if it assumes `<p>`)
- Test: `app/tests/renderers.test.ts`

**Interfaces:**
- Consumes: `inlineWithMath(raw)` from Task 2.
- Produces: `renderPrompt` emits the revealed answer as `<div class="expected">`, not `<p class="expected">`. Nothing else changes shape.

- [ ] **Step 1: Write the failing tests**

Append to `app/tests/renderers.test.ts`:

```ts
describe('math in review cards', () => {
  const mathCard: StoredCard = {
    ...base, id: 'card-math', format: 'qa', due: 0, reps: 0, lapses: 0,
    prompt: 'Derive the normal equations from $b - Ax$ being orthogonal to every column of $A$.',
    answer: 'Orthogonality means $A^\\top(b - Ax) = 0$, i.e. $$A^\\top A x = A^\\top b$$'
  } as StoredCard;

  it('typesets math in an unrevealed prompt', () => {
    expect(renderPrompt(mathCard, false)).toContain('class="katex"');
  });

  it('typesets math in the revealed answer', () => {
    expect(renderPrompt(mathCard, true)).toContain('katex');
  });

  it('renders the answer in a div, since katex-display is block content', () => {
    const html = renderPrompt(mathCard, true);
    expect(html).toContain('<div class="expected">');
    expect(html).not.toContain('<p class="expected">');
  });

  it('still fills a cloze blank when the prompt also contains math', () => {
    const clozeCard: StoredCard = {
      ...base, id: 'card-cl', format: 'cloze', due: 0, reps: 0, lapses: 0,
      prompt: 'The projection matrix $P$ satisfies ___ for any projection.',
      answer: 'P^2 = P'
    } as StoredCard;
    const html = renderPrompt(clozeCard, true, { outcome: 'correct' });
    expect(html).toContain('cloze-fill');
    expect(html).not.toContain('___');
    expect(html).not.toContain('(<span class="cloze-fill');  // not the append fallback
  });

  it('typesets math in an mcq choice', () => {
    const mcqCard: StoredCard = {
      ...base, id: 'card-mcq', format: 'mcq', due: 0, reps: 0, lapses: 0,
      prompt: 'Which is the projection?',
      choices: [{ text: '$A(A^\\top A)^{-1}A^\\top$', correct: true }, { text: '$A^\\top A$', correct: false }]
    } as StoredCard;
    expect(renderActions(mcqCard, false)).toContain('katex');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/tests/renderers.test.ts`
Expected: FAIL — no `katex` in the output, and `<p class="expected">` is still emitted.

- [ ] **Step 3: Replace the five call sites**

In `app/src/ui/renderers.ts`, change each `inlineMarkup(escapeHtml(...))` to `inlineWithMath(...)`:

In `substituteClozeBlank`:

```ts
  const promptHtml = inlineWithMath(card.prompt);
  const tint = reveal.outcome === 'correct' ? 'is-ok' : 'is-accent';
  const filler = `<span class="cloze-fill ${tint}">${inlineWithMath(card.answer ?? '')}</span>`;
```

In `renderPrompt`:

```ts
  const promptHtml = isCloze && revealed ? substituteClozeBlank(card, reveal) : inlineWithMath(card.prompt);
```

```ts
      ? `<p class="cloze-typed">You typed: ${inlineWithMath(reveal.typedAnswer)}</p>`
```

and the expected-answer element, which changes tag as well as content:

```ts
  // A <div>, not a <p>: a card answer may contain a $$...$$ run, which KaTeX
  // renders as a block-level <span class="katex-display">. Block content
  // inside a <p> makes the browser close the paragraph early, which detaches
  // the rest of the answer from its own element and breaks .expected's
  // styling for the text after the equation.
  const expected =
    revealed && !isCloze && card.format !== 'mcq' && card.answer
      ? `<div class="expected">${inlineWithMath(card.answer)}</div>`
      : '';
```

In `renderActions`'s mcq branch:

```ts
             <span class="choice-text">${inlineWithMath(choice.text)}</span>
```

- [ ] **Step 4: Confirm the `.expected` styles still apply**

Run: `grep -n "expected" app/src/styles/review.css`

Expected: `app/src/styles/review.css:124` is already a plain class selector (`.expected { ... margin: 0; }`), not `p.expected`, so the tag change needs no CSS change. Confirm that is still true rather than assuming it.

Note that rule sets `color: var(--ok)` — a revealed answer is green. Task 7's stylesheet must therefore let KaTeX inherit its colour rather than pinning it to `--text`, or math inside an answer would render dark against green prose in the same sentence.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run app/tests/renderers.test.ts`
Expected: PASS, including every pre-existing test in the file.

- [ ] **Step 6: Run the full app suite for regressions**

Run: `npx vitest run app/tests/`
Expected: PASS. `review-mcq-shuffle.test.ts` and `deck-corpus.test.ts` exercise these renderers on real deck content and are the ones most likely to catch an accidental behaviour change.

- [ ] **Step 7: Commit**

```bash
git add app/src/ui/renderers.ts app/src/styles/review.css app/tests/renderers.test.ts
git commit -F - <<'MSG'
feat: typeset math on the review screen

The answer element becomes a div rather than a p. A card answer may
contain a $$...$$ run, which KaTeX renders as a block-level span;
block content inside a paragraph makes the browser close that
paragraph early, detaching whatever follows the equation from the
element that styles it.

The cloze path needed checking rather than changing:
substituteClozeBlank matches ___ against already-marked-up HTML, so
KaTeX output sharing that pattern would have silently moved where the
answer lands. It does not, and a test now pins that.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 4: Inline math in the note viewer

**Files:**
- Modify: `app/src/ui/note-render.ts:9-11` (the `text()` helper)
- Test: `app/tests/note-render.test.ts`

**Interfaces:**
- Consumes: `inlineWithMath(raw)` from Task 2.
- Produces: no new exports. Every block kind routed through `text()` — heading, list, prose, qa, card, choices — inherits inline math.

- [ ] **Step 1: Write the failing tests**

Append to `app/tests/note-render.test.ts`:

```ts
describe('inline math in notes', () => {
  it('typesets math in prose', () => {
    const html = renderNoteBlocks([{ kind: 'prose', text: 'The residual $b - Ax$ is orthogonal.', clozes: [] }]);
    expect(html).toContain('class="katex"');
  });

  it('typesets math in a heading', () => {
    expect(renderNoteBlocks([{ kind: 'heading', level: 2, text: 'Projections onto $R^n$' }])).toContain('katex');
  });

  it('leaves a code fence completely alone', () => {
    const html = renderNoteBlocks([{ kind: 'code', lang: 'bash', text: 'echo $HOME && echo $PATH' }]);
    expect(html).toContain('echo $HOME &amp;&amp; echo $PATH');
    expect(html).not.toContain('katex');
  });

  it('keeps cloze offsets correct when the same block contains math', () => {
    const html = renderNoteBlocks([{
      kind: 'prose',
      text: 'A projection $P$ satisfies idempotence exactly.',
      clozes: [{ start: 24, end: 35, cardId: 'card-abcd', answer: 'idempotence' }]
    }]);
    expect(html).toContain('data-card="card-abcd"');
    expect(html).toContain('>idempotence<');
  });
});
```

Note on the last test: `renderProse` slices the RAW text at cloze offsets and escapes each piece afterwards, so offsets must still index the raw string. `start: 24` is the index of `idempotence` in that exact string — if you change the text, recompute it.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/tests/note-render.test.ts`
Expected: FAIL — no `katex` in the output.

- [ ] **Step 3: Change `text()`**

In `app/src/ui/note-render.ts`, replace the import and the helper:

```ts
import { escapeHtml, inlineWithMath } from './renderers.js';

/**
 * Inline markup plus math. `inlineWithMath` takes RAW text and escapes each
 * non-math chunk itself -- it must NOT be handed pre-escaped input, or KaTeX
 * receives HTML entities where it expects LaTeX operators. See its contract
 * in renderers.ts.
 */
function text(value: string): string {
  return inlineWithMath(value);
}
```

`escapeHtml` stays imported: the `code` branch and `cardIdAttr` still use it directly.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/tests/note-render.test.ts`
Expected: PASS, including every pre-existing test in the file.

- [ ] **Step 5: Commit**

```bash
git add app/src/ui/note-render.ts app/tests/note-render.test.ts
git commit -F - <<'MSG'
feat: typeset inline math in the note viewer

One helper change reaches every block kind, since headings, lists,
prose, qa and card blocks all route their text through it. Code
fences deliberately do not -- a fence is code, and the vault's
assembly listing writes "add $1, %eax", which must stay literal.

Cloze offsets index the raw block text and are sliced before any
escaping, so moving escaping inside the inline layer leaves them
valid; a test pins that against a block containing both a cloze and
a math span.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 5: The `math` block kind in both parser walks

**Files:**
- Modify: `pipeline/src/types.ts` (`RawBlock` and `NoteBlock` unions)
- Modify: `pipeline/src/cards.ts` (shared constant; `parseCards` at lines 263-330; `parseBlocks` at lines 355-470)
- Test: `pipeline/tests/blocks.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks — this is pipeline-side and independent of Tasks 1-4.
- Produces: the block variant `{ kind: 'math'; text: string }`, identical in `RawBlock` and `NoteBlock`, and the exported constant `DISPLAY_MATH_FENCE: RegExp` from `cards.ts`. Tasks 6 and 8 both consume these.

- [ ] **Step 1: Write the failing tests**

Append to `pipeline/tests/blocks.test.ts` (match the existing import style in that file; it imports `parseBlocks` from `../src/cards.js`):

```ts
describe('display math blocks', () => {
  const body = [
    'Orthogonality to every column of A means:',
    '',
    '$$',
    'A^\\top (b - Ax) = 0',
    '$$',
    '',
    'which distributes to the normal equations.'
  ].join('\n');

  it('emits a math block holding the raw LaTeX', () => {
    const blocks = parseBlocks(body);
    const math = blocks.find((b) => b.kind === 'math');
    expect(math).toEqual({ kind: 'math', text: 'A^\\top (b - Ax) = 0' });
  });

  it('keeps the surrounding prose in its own blocks', () => {
    expect(parseBlocks(body).map((b) => b.kind)).toEqual(['prose', 'math', 'prose']);
  });

  it('joins a multi-line equation with newlines', () => {
    const blocks = parseBlocks(['$$', '\\begin{aligned}', 'x &= 1', '\\end{aligned}', '$$'].join('\n'));
    expect(blocks).toEqual([{ kind: 'math', text: '\\begin{aligned}\nx &= 1\n\\end{aligned}' }]);
  });

  it('mints no cards from a display block', () => {
    expect(parseCards(body, 0)).toEqual([]);
  });

  it('leaves $$ inside a code fence to the fence', () => {
    const fenced = ['```', '$$', 'not math', '$$', '```'].join('\n');
    expect(parseBlocks(fenced).map((b) => b.kind)).toEqual(['code']);
  });

  it('agrees with parseCards on card count for a note mixing math and clozes', () => {
    const mixed = [
      'A projection is ==idempotent==.',
      '',
      '$$',
      'P^2 = P',
      '$$',
      '',
      'Its rank equals its ==trace==.'
    ].join('\n');
    const blocks = parseBlocks(mixed);
    const ordinals = blocks.flatMap((b) => (b.kind === 'prose' ? b.clozes.map((c) => c.cardIndex) : []));
    expect(ordinals).toEqual([0, 1]);
    expect(parseCards(mixed, 0)).toHaveLength(2);
  });
});
```

Add `parseCards` to that file's import from `../src/cards.js` if it is not already there.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run pipeline/tests/blocks.test.ts`
Expected: FAIL — no `math` block is produced.

- [ ] **Step 3: Add the block variant to the types**

In `pipeline/src/types.ts`, add the same line to BOTH unions. In `RawBlock`, after the `code` line:

```ts
  | { kind: 'math'; text: string }
```

and in `NoteBlock`, after its `code` line:

```ts
  | { kind: 'math'; text: string }
```

No `cardIndex` or `cardId`: a display equation is reading material and never mints a card. Because the variant is byte-identical in both unions, `build.ts`'s `resolveBlocks` passes it through via its existing `return block;` fallthrough with no change.

- [ ] **Step 4: Add the shared delimiter constant**

In `pipeline/src/cards.ts`, beside the other exported constants near line 10:

```ts
/**
 * Opens and closes a display-math block: `$$` alone on a line.
 *
 * Exported and shared for the same reason FENCE is: parseCards and
 * parseBlocks are two independent walks over the same body, and a
 * hand-copied lookalike in one of them is exactly how they drift. Both
 * MUST honour this, or resolveBlocks' total-zip assertion fails the build.
 *
 * Own-line only, never `$$inline$$`. That keeps it the same branch shape the
 * fence already has in both walks, and it means no prose `$$` can be
 * mistaken for an opener -- vault/aws/step-functions writes `$$.Task.Token`,
 * which is inside a code span but would be an unpleasant near-miss.
 */
export const DISPLAY_MATH_FENCE = /^\s*\$\$\s*$/;
```

- [ ] **Step 5: Teach `parseCards` to skip display blocks**

In `parseCards`, add `let inMath = false;` beside `let inFence = false;` (line 266). Then insert this immediately AFTER the existing `if (inFence) { i++; continue; }` block (around line 281) — after, so that a `$$` inside a code fence is already swallowed by the fence and never toggles math state:

```ts
    if (DISPLAY_MATH_FENCE.test(rawLine)) {
      inMath = !inMath;
      i++;
      continue;
    }
    if (inMath) {
      i++;
      continue;
    }
```

Then in the prose-run lookahead (around line 313), add the delimiter as a block breaker beside the fence one:

```ts
      if (FENCE.test(candidate)) break;
      if (DISPLAY_MATH_FENCE.test(candidate)) break;
```

- [ ] **Step 6: Teach `parseBlocks` to emit the block**

In `parseBlocks`, insert this branch immediately AFTER the existing fence branch (which ends `blocks.push({ kind: 'code', lang, text: content.join('\n') }); continue;` around line 420) — again after, so a fence wins:

```ts
    if (DISPLAY_MATH_FENCE.test(rawLine)) {
      flushProse(prose); prose = []; flushList();
      const content: string[] = [];
      i++;
      while (i < lines.length && !DISPLAY_MATH_FENCE.test(lines[i] ?? '')) {
        content.push(lines[i] ?? '');
        i++;
      }
      i++; // consume the closing delimiter (or run off the end on an unclosed one)
      blocks.push({ kind: 'math', text: content.join('\n') });
      continue;
    }
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run pipeline/tests/`
Expected: PASS. `notes-corpus.test.ts` and `build.test.ts` exercise `resolveBlocks` over the real vault and will fail loudly if the two walks disagree.

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: this will FAIL in `app/src/search.ts`, because its `switch (block.kind)` is exhaustive and does not handle `math`. That is correct and expected — Task 6 fixes it. Do not add a `default` case to silence it; the exhaustiveness is what forced this to be noticed.

- [ ] **Step 9: Commit**

```bash
git add pipeline/src/types.ts pipeline/src/cards.ts pipeline/tests/blocks.test.ts
git commit -F - <<'MSG'
feat: parse $$-delimited display math blocks

The delimiter lives in one exported constant that both walks import,
which is the mechanism this file already uses for FENCE and the only
thing that keeps parseCards and parseBlocks in agreement. Adding it to
one walk alone would not fail quietly -- resolveBlocks' total-zip
assertion would throw -- but it would fail at build time across the
whole vault rather than here.

Both branches sit after the fence handling, so a $$ inside a code
fence is consumed as code and never toggles math state. The block
carries no card ordinal: a display equation is reading material and
mints nothing, so the variant is identical in RawBlock and NoteBlock
and resolveBlocks passes it through untouched.

This leaves app/src/search.ts failing typecheck on its exhaustive
switch, which is the next commit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 6: Render and index math blocks

**Files:**
- Modify: `app/src/ui/note-render.ts` (`renderNoteBlocks`, beside the `code` branch)
- Modify: `app/src/search.ts:68-79` (`blockText`)
- Modify: `README.md` (the search-coverage sentence near line 216)
- Test: `app/tests/note-render.test.ts`, `app/tests/search.test.ts`

**Interfaces:**
- Consumes: `renderMath` (Task 1), the `math` block variant (Task 5).
- Produces: a `<div class="note-math">` wrapper element, which Task 7 styles.

- [ ] **Step 1: Write the failing tests**

Append to `app/tests/note-render.test.ts`:

```ts
describe('display math blocks', () => {
  it('renders a math block as display-mode KaTeX', () => {
    const html = renderNoteBlocks([{ kind: 'math', text: 'A^\\top A x = A^\\top b' }]);
    expect(html).toContain('note-math');
    expect(html).toContain('katex-display');
  });

  it('never applies inline markup to a math block', () => {
    // `*` and `_` are LaTeX operators here, not emphasis markers.
    const html = renderNoteBlocks([{ kind: 'math', text: 'a_1 * b_2 * c_3' }]);
    expect(html).not.toContain('<em>');
    expect(html).not.toContain('<strong>');
  });

  it('carries the block index like every other block', () => {
    const html = renderNoteBlocks([{ kind: 'prose', text: 'x', clozes: [] }, { kind: 'math', text: 'y' }]);
    expect(html).toContain('data-block="1"');
  });
});
```

Append to `app/tests/search.test.ts` (match its existing import of `blockText` from `../src/search.js`; if it does not import it, add the import):

```ts
describe('math block indexing', () => {
  it('indexes a math block on its raw LaTeX source', () => {
    const { text } = blockText({ kind: 'math', text: '\\nabla f(x) = 0' });
    expect(text).toBe('\\nabla f(x) = 0');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/tests/note-render.test.ts app/tests/search.test.ts`
Expected: FAIL — no `note-math` element, and `blockText` has no `math` case.

- [ ] **Step 3: Render the block**

In `app/src/ui/note-render.ts`, add the import:

```ts
import { renderMath } from './math.js';
```

and add this branch immediately after the `code` branch in `renderNoteBlocks`:

```ts
    if (block.kind === 'math') {
      // Never inline markup, for the same reason the code branch above is
      // never given it: `*` and `_` are LaTeX operators here, not emphasis
      // markers. renderMath escapes nothing and needs the LaTeX raw.
      return `<div class="note-math" ${blockAttr}>${renderMath(block.text, true)}</div>`;
    }
```

- [ ] **Step 4: Index the block**

In `app/src/search.ts`, add to the `switch` in `blockText`, beside the `code` case:

```ts
    case 'math': return { text: block.text, weight: FIELD_WEIGHTS.code };
```

Indexed at code weight on the raw LaTeX. This admits a few meaningless matches on `frac` or `partial`, which is the lesser problem: excluding math blocks would make a note's central equation unfindable, and the code-fence case already sets the precedent that non-prose source is indexed.

- [ ] **Step 5: Update the README**

In `README.md`, in the search-coverage sentence near line 216, add math blocks to the list of indexed fields. Find:

```
category, citations, headings, prose (which includes cloze answers),
list items, qa/mcq/recall prompts and answers, and code fences.
```

Replace with:

```
category, citations, headings, prose (which includes cloze answers),
list items, qa/mcq/recall prompts and answers, code fences, and
display-math blocks (matched against their raw LaTeX source, so
`nabla` finds an equation that uses `\nabla`).
```

- [ ] **Step 6: Run the tests and typecheck**

Run: `npx vitest run app/tests/ && npm run typecheck`
Expected: PASS and no type errors — the exhaustive switch from Task 5 Step 8 is now satisfied.

- [ ] **Step 7: Commit**

```bash
git add app/src/ui/note-render.ts app/src/search.ts app/tests/note-render.test.ts app/tests/search.test.ts README.md
git commit -F - <<'MSG'
feat: render and index display math blocks

Rendered without inline markup, for the reason the code branch beside
it is: inside an equation `*` and `_` are LaTeX operators, and running
emphasis over them would both corrupt the source KaTeX receives and
inject tags into it.

Indexed at code weight on the raw LaTeX, which admits a few
meaningless matches on "frac" or "partial". The alternative is worse:
excluding math blocks makes a note's central equation unfindable, and
search already indexes code fences, so non-prose source being
searchable is the established behaviour rather than a new one.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 7: Styles, fonts, and offline

**Files:**
- Create: `app/src/styles/math.css`
- Modify: `app/src/styles.css` (import list, lines 5-12)
- Modify: `app/src/main.ts` (KaTeX stylesheet import; call the font preload)
- Modify: `app/src/ui/math.ts` (add `preloadMathFonts`)
- Test: `app/tests/math.test.ts`

**Interfaces:**
- Consumes: `renderMath` (Task 1), `.note-math` (Task 6), `.expected` (Task 3).
- Produces: `MATH_FONT_URLS: string[]` (the tested data) and `preloadMathFonts(): void` (the untested DOM glue that consumes it), called once at app boot.

- [ ] **Step 1: Import KaTeX's stylesheet**

In `app/src/main.ts`, beside the existing style imports at the top:

```ts
import './theme.css';
import './styles.css';
import 'katex/dist/katex.min.css';
```

This is what makes Vite emit KaTeX's woff2 fonts as content-hashed assets under `assets/`, which `sw-routing.ts` already serves cache-first.

- [ ] **Step 2: Write the failing test for the font URL list**

`vitest.config.ts` sets `environment: 'node'` for the whole repo and jsdom is not a dependency, so there is no `document` in tests. Do NOT add jsdom for this — the repo's pattern is to test pure functions and leave thin DOM glue (`main.ts`'s own bootstrap, for instance) untested. So `math.ts` exports the URL list as data, which is testable in node, and `preloadMathFonts` stays the untestable glue around it.

Extend the existing import at the top of `app/tests/math.test.ts` rather than adding a second import statement:

```ts
import { renderMath, MATH_FONT_URLS } from '../src/ui/math.js';
```

and append:

```ts
describe('MATH_FONT_URLS', () => {
  it('names the two faces this vault actually needs', () => {
    expect(MATH_FONT_URLS).toHaveLength(2);
  });

  it('resolves each one to a bundled .woff2 asset URL', () => {
    for (const url of MATH_FONT_URLS) {
      expect(typeof url).toBe('string');
      expect(url).toMatch(/\.woff2($|\?)/);
    }
  });
});
```

The second assertion is the one that earns its keep: it fails if Vite ever stops resolving the `?url` import and hands back the module object instead, which would otherwise show up only as a silently broken preload in production.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run app/tests/math.test.ts`
Expected: FAIL — `MATH_FONT_URLS` is not exported.

- [ ] **Step 4: Implement the preload helper**

Append to `app/src/ui/math.ts`:

```ts
import mainRegular from 'katex/dist/fonts/KaTeX_Main-Regular.woff2?url';
import mathItalic from 'katex/dist/fonts/KaTeX_Math-Italic.woff2?url';

/**
 * Warms the two KaTeX fonts this vault's math actually uses.
 *
 * Without this there is a real offline hole rather than a theoretical one:
 * KaTeX's fonts are hashed assets fetched on first use, so a phone that
 * installs the PWA and goes offline BEFORE ever displaying a math card has
 * none of them cached, and every equation renders in fallback glyphs with
 * broken stretchy delimiters. Fetching them at boot puts them in the same
 * cache-first bucket (see sw-routing.ts) as any other hashed asset.
 *
 * Only two of KaTeX's ~20 faces: upright text and math italic cover
 * essentially all of this vault. The rest still load on demand for the rare
 * note that needs script or fraktur.
 *
 * The `?url` imports are what make this possible at all -- a static <link>
 * in index.html cannot name a content-hashed filename, so Vite has to
 * resolve it and the link has to be injected at runtime.
 */
export const MATH_FONT_URLS: string[] = [mainRegular, mathItalic];

export function preloadMathFonts(): void {
  for (const href of MATH_FONT_URLS) {
    if (document.head.querySelector(`link[rel="preload"][href="${href}"]`)) continue;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = href;
    document.head.append(link);
  }
}
```

If `npm run typecheck` rejects the `?url` imports, add to `app/src/css.d.ts` (which already declares the CSS module shape):

```ts
declare module '*.woff2?url' {
  const url: string;
  export default url;
}
```

- [ ] **Step 5: Call it at boot**

In `app/src/main.ts`, beside the existing bootstrap at the bottom:

```ts
const appRoot = document.querySelector<HTMLElement>('#app');
if (!appRoot) throw new Error('#app missing');
preloadMathFonts();
void boot(appRoot);
```

and add `preloadMathFonts` to the import from `./ui/math.js`.

- [ ] **Step 6: Write the stylesheet**

Create `app/src/styles/math.css`:

```css
/* A wide equation must scroll inside its own block rather than widening the
   page. This is the same failure the .note-code rule guards against, and it
   depends on the same ancestor min-width:0 chain (.note-screen, .note-body)
   already established in note.css. */
.note-math { margin: 0 0 var(--s4); overflow-x: auto; overflow-y: hidden; }

/* KaTeX ships its own 1em top/bottom margin on display math. The wrapper
   above owns block spacing, so drop it to avoid doubling. */
.note-math .katex-display { margin: 0; }

/* A $$...$$ run inside a card answer is inline-with-block content: it needs
   breathing room from the prose around it, which the note wrapper's own
   margin does not provide here. */
.expected .katex-display { margin: var(--s3) 0; overflow-x: auto; overflow-y: hidden; }

/* KaTeX's default 1.21em is sized for a desktop article. The review screen's
   prompt is already --text-prompt, and math at 1.21em above that overflows a
   375px phone for any equation of real length. */
.katex { font-size: 1.05em; }

/* `inherit`, NOT var(--text). A revealed card answer is styled
   `color: var(--ok)` (review.css:124), so math pinned to --text would
   render dark against green prose in the same sentence. Inheriting also
   handles both themes for free, and the cloze-fill tints besides. */
.katex, .katex .mord, .katex .mbin, .katex .mrel { color: inherit; }
```

- [ ] **Step 7: Register the stylesheet**

In `app/src/styles.css`, add to the import list after `note.css`:

```css
@import './styles/math.css';
```

- [ ] **Step 8: Run the tests, typecheck, and build**

```bash
npx vitest run app/tests/ && npm run typecheck && npm run build:app
```

Expected: PASS, no type errors, and a successful build. Confirm the fonts were emitted:

```bash
ls app/dist/assets | grep -i katex
```

Expected: several `KaTeX_*.woff2` files with hashed names.

- [ ] **Step 9: Verify in the browser**

Start the dev server and check a note containing display math renders typeset, scrolls horizontally rather than widening the page at 375px width, and is legible in both light and dark themes. `app/tests/contrast.test.ts` covers theme contrast for existing tokens; the `.katex` colour rule above inherits `--text`, so no new token is introduced.

- [ ] **Step 10: Commit**

```bash
git add app/src/styles/math.css app/src/styles.css app/src/main.ts app/src/ui/math.ts app/src/css.d.ts app/tests/math.test.ts
git commit -F - <<'MSG'
feat: style math and precache its fonts for offline use

The offline hole here is real rather than theoretical. KaTeX's fonts
are hashed assets fetched on first use, so a phone that installs the
PWA and goes offline before ever seeing a math card has none of them
cached, and every equation renders in fallback glyphs with broken
stretchy delimiters. Two faces -- upright text and math italic --
cover essentially all of this vault, and fetching them at boot puts
them in the same cache-first bucket as any other hashed asset.

The links are injected at runtime rather than written into
index.html because a static link cannot name a content-hashed
filename; Vite has to resolve the URL first.

sw.ts's SHELL array is deliberately not extended: it lists stable
URLs, and these are hashed. CACHE is not bumped either -- the shell
is network-first and these are new URLs, not stale ones.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 8: Lint rules and the authoring convention

**This task must fix the two existing bare-dollar notes in the same commit** — `pipeline/tests/vault-lint.test.ts` asserts the whole real vault is lint-clean, so adding the `unpaired-dollar` rule without fixing them leaves the suite red.

**Files:**
- Modify: `pipeline/src/lint.ts`
- Modify: `vault/security/tls/session-resumption-and-0-rtt.md:111`
- Modify: `vault/aws/edge/edge-functions-and-lambda-at-edge.md:79`
- Modify: `README.md` (authoring conventions)
- Test: `pipeline/tests/lint.test.ts`

**Interfaces:**
- Consumes: `DISPLAY_MATH_FENCE` (Task 5), `renderMath`'s underlying `katex` package (Task 1) — but note the lint calls `katex.renderToString` directly with STRICT options, not `renderMath`.
- Produces: four new rule ids — `unpaired-dollar`, `math-in-cloze`, `invalid-math`, `display-math-block`.

- [ ] **Step 1: Write the failing tests**

Append to `pipeline/tests/lint.test.ts` (match the file's existing helper for building a note with frontmatter; if it has one, use it, otherwise write the frontmatter inline as the other tests do):

```ts
describe('math lint rules', () => {
  const note = (body: string) => `---\ncategory: math\n---\n\n${body}\n`;
  const rules = (body: string) => lintNote(note(body)).map((p) => p.rule);

  it('flags an unpaired dollar in prose', () => {
    expect(rules('A transfer of $100 between accounts.')).toContain('unpaired-dollar');
  });

  it('accepts an escaped dollar', () => {
    expect(rules('A transfer of \\$100 between accounts.')).not.toContain('unpaired-dollar');
  });

  it('accepts a balanced inline math span', () => {
    expect(rules('The residual $b - Ax$ is orthogonal.')).not.toContain('unpaired-dollar');
  });

  it('ignores dollars inside a code span', () => {
    expect(rules('Reserved routes (`$connect`, `$disconnect`).')).not.toContain('unpaired-dollar');
  });

  it('ignores dollars inside a code fence', () => {
    expect(rules('```\nadd $1, %eax\n```')).not.toContain('unpaired-dollar');
  });

  it('flags math inside a cloze answer', () => {
    expect(rules('A projection satisfies ==$P^2 = P$==.')).toContain('math-in-cloze');
  });

  it('flags a math span straddling a cloze boundary', () => {
    expect(rules('A projection is ==idempotent$== so $P^2 = P$.')).toContain('math-in-cloze');
  });

  it('accepts math in the prompt with a prose cloze answer', () => {
    expect(rules('The matrix $P$ with $P^2 = P$ is called ==idempotent==.')).not.toContain('math-in-cloze');
  });

  it('flags LaTeX KaTeX cannot parse', () => {
    expect(rules('The gradient $\\frac{$ vanishes.')).toContain('invalid-math');
  });

  it('flags a cloze inside a display block', () => {
    expect(rules('$$\nP^2 = ==P==\n$$')).toContain('display-math-block');
  });

  it('flags a display block not separated from prose by a blank line', () => {
    expect(rules('The equation is:\n$$\nP^2 = P\n$$')).toContain('display-math-block');
  });

  it('accepts a well-formed display block', () => {
    expect(rules('The equation is:\n\n$$\nP^2 = P\n$$\n\nwhich is idempotence.')).toEqual([]);
  });

  it('validates a multi-line block as one equation, not line by line', () => {
    // A bare "\\begin{aligned}" is not valid LaTeX on its own. If this rule
    // ever regresses to a per-line check, this is the test that catches it.
    const body = ['$$', '\\begin{aligned}', 'A^\\top A x &= A^\\top b', '\\end{aligned}', '$$'].join('\n');
    expect(rules(body)).toEqual([]);
  });

  it('still reports a genuinely broken multi-line block, at its opening line', () => {
    const body = ['$$', '\\begin{aligned}', 'x &= 1', '$$'].join('\n');
    expect(rules(body)).toContain('invalid-math');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run pipeline/tests/lint.test.ts`
Expected: FAIL — none of the four rules exist.

- [ ] **Step 3: Implement the rules**

In `pipeline/src/lint.ts`, extend the imports:

```ts
import katex from 'katex';
import {
  HIGHLIGHT, QA, FENCE, CALLOUT_OPEN, CALLOUT_LINE, CHOICE, DISPLAY_MATH_FENCE, parseCards, stripAnchor
} from './cards.js';
```

Add the helpers below `HIGHLIGHT_CANDIDATE`:

```ts
/**
 * Strips what the math tokenizer would never see as math: code spans, and
 * backslash-escaped dollars. Mirrors app/src/ui/renderers.ts's inlineWithMath
 * -- if that tokenizer's precedence changes, this must change with it, or the
 * lint starts flagging text the renderer handles fine (or worse, stops
 * flagging text it chokes on).
 */
function withoutNonMath(line: string): string {
  return line.replace(/`[^`]+`/g, '').replace(/\\\$/g, '');
}

/** The math spans a line contains, display first, as raw LaTeX source. */
function mathSpans(line: string): string[] {
  const stripped = withoutNonMath(line);
  const spans: string[] = [];
  for (const match of stripped.matchAll(/\$\$([^$]+)\$\$|\$(\S(?:[^$]*\S)?)\$/g)) {
    spans.push((match[1] ?? match[2] ?? '').trim());
  }
  return spans;
}

/** Validates one span the way the build should, not the way the app renders. */
function latexError(latex: string): string | null {
  try {
    // strict + throwOnError, unlike renderMath's forgiving app-side options:
    // a typo must fail CI here rather than render an error card on a phone.
    katex.renderToString(latex, { throwOnError: true, strict: 'error', output: 'html' });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
```

Now add the per-line checks inside the existing `for` loop in `lintNote`, immediately after the `if (inFence) continue;` line. First, track display blocks — add `let inMath = false;`, `let mathOpenLine = -1;` and `let mathLines: string[] = [];` beside `inFence`/`fenceOpenLine`, then:

```ts
    if (DISPLAY_MATH_FENCE.test(raw)) {
      inMath = !inMath;
      if (inMath) {
        mathOpenLine = fileLine;
        mathLines = [];
        const previous = (lines[i - 1] ?? '').trim();
        if (previous !== '' && i > 0) {
          problems.push({
            line: fileLine,
            rule: 'display-math-block',
            message:
              'A "$$" display block must be separated from the prose above it by a blank line. ' +
              'Without one, parseCards joins that prose to the block while parseBlocks does not, ' +
              'and the two walks can disagree about how many cards the note has.'
          });
        }
      } else {
        const next = (lines[i + 1] ?? '').trim();
        if (next !== '' && i + 1 < lines.length) {
          problems.push({
            line: fileLine,
            rule: 'display-math-block',
            message:
              'A "$$" display block must be followed by a blank line before prose resumes, ' +
              'for the same reason it must be preceded by one.'
          });
        }
        // Validated as ONE equation at the close, never line by line: a
        // multi-line block is a single LaTeX expression, and its individual
        // lines are not valid on their own -- a bare "\begin{aligned}" fails
        // to parse, so a per-line check would reject every legal multi-line
        // equation in the vault.
        const blockSource = mathLines.join('\n').trim();
        const blockError = blockSource === '' ? null : latexError(blockSource);
        if (blockError) {
          problems.push({
            line: mathOpenLine,
            rule: 'invalid-math',
            message: `KaTeX cannot parse the display math opened at line ${mathOpenLine}: ${blockError}`
          });
        }
        mathLines = [];
      }
      continue;
    }

    if (inMath) {
      mathLines.push(raw);
      // Card syntax is checked per line, because unlike the LaTeX itself it
      // IS a per-line property and the line number is the useful part of the
      // report.
      if (new RegExp(HIGHLIGHT.source, HIGHLIGHT.flags).test(raw) || QA.test(raw.trim())) {
        problems.push({
          line: fileLine,
          rule: 'display-math-block',
          message:
            'Card syntax ("==cloze==" or "A :: B") inside a "$$" display block. parseBlocks skips ' +
            'the block entirely while parseCards would mint a card from this line, so the two walks ' +
            'disagree and the build throws. Move the card outside the equation.'
        });
      }
      continue;
    }

    const mathStripped = withoutNonMath(raw);
    const dollars = (mathStripped.match(/\$/g) ?? []).length;
    if (dollars % 2 !== 0) {
      problems.push({
        line: fileLine,
        rule: 'unpaired-dollar',
        message:
          'An unpaired "$" outside code. "$" now opens inline math, so a lone one is either a ' +
          'literal dollar sign that needs writing as "\\$", a shell/AWS token that belongs in ' +
          'backticks, or a math span missing its closing delimiter.'
      });
    }

    for (const span of mathSpans(raw)) {
      const error = latexError(span);
      if (error) {
        problems.push({
          line: fileLine,
          rule: 'invalid-math',
          message: `KaTeX cannot parse the math span "$${span}$": ${error}`
        });
      }
    }

    for (const match of raw.matchAll(new RegExp(HIGHLIGHT.source, HIGHLIGHT.flags))) {
      const inner = match[1] ?? '';
      if (inner.includes('$')) {
        problems.push({
          line: fileLine,
          rule: 'math-in-cloze',
          message:
            `Cloze answer "==${inner}==" contains math. A cloze is graded by exact typed match, ` +
            'and nobody types LaTeX on a phone keyboard. Move the math into the prompt and let the ' +
            'blank fall on typeable prose.'
        });
      }
    }
```

Finally, add the unclosed-block report beside the existing `if (inFence)` one at the end of `lintNote`:

```ts
  if (inMath) {
    problems.push({
      line: mathOpenLine,
      rule: 'display-math-block',
      message:
        `Display math opened at line ${mathOpenLine} is never closed. Everything below it is ` +
        'skipped by both parser walks, so every card in the rest of this note silently disappears. ' +
        'Add a matching closing "$$".'
    });
  }
```

Note the straddling case (`==idempotent$==`) is caught by `math-in-cloze`, because the cloze's inner text contains a `$`.

- [ ] **Step 4: Run the rule tests**

Run: `npx vitest run pipeline/tests/lint.test.ts`
Expected: PASS (14 new tests plus every pre-existing one).

- [ ] **Step 5: Run the vault lint to find what the new rules flag**

Run: `npx vitest run pipeline/tests/vault-lint.test.ts`
Expected: FAIL, reporting `unpaired-dollar` at exactly two locations. If it reports more, read each one before changing it — the survey found two, but the vault may have moved.

- [ ] **Step 6: Fix the two flagged notes**

In `vault/security/tls/session-resumption-and-0-rtt.md:111`, escape the literal dollar:

```
> A payments API accepts a "transfer \$100 from account A to account B"
```

In `vault/aws/edge/edge-functions-and-lambda-at-edge.md:79`, put the AWS token in backticks, where it belonged anyway:

```
trigger — never an alias. There's no "point at `$LATEST` and let it float"
```

Both are prose-only edits. Neither touches a `^card-xxxx` anchor, a cloze, or a `::` separator, so no card text changes and no card id moves.

- [ ] **Step 7: Verify the vault is clean**

Run: `npx vitest run pipeline/tests/`
Expected: PASS, including `vault-lint.test.ts`.

- [ ] **Step 8: Document the syntax in the README**

In `README.md`, in the authoring-conventions section alongside the existing **Cloze** / **QA** / **MCQ** entries, add:

````markdown
**Math** — `$...$` inline, `$$` on its own line for a display block:

```markdown
The residual $b - Ax$ is orthogonal to every column of $A$:

$$
A^\top (b - Ax) = 0
$$
```

Rendered with KaTeX. Four rules the linter enforces:

- A **literal dollar sign** in prose is written `\$`. A lone unescaped `$`
  is an error, because it now opens math. A shell or AWS token like
  `$LATEST` belongs in backticks instead — code spans are matched before
  math, so anything inside backticks is never touched.
- A **cloze answer may not contain math.** Clozes are graded by exact
  typed match, and nobody types `\frac{a}{b}` on a phone. Put the math in
  the prompt and let the blank fall on typeable prose.
- A **display block is surrounded by blank lines**, and contains no card
  syntax. Both parser walks skip its contents, so a `==cloze==` inside one
  makes them disagree about the note's card count and fails the build.
- **Invalid LaTeX fails the build**, checked in KaTeX strict mode, rather
  than rendering an error card on a phone.

Display math also works inline inside card text, written `$$...$$` on one
line — a card's prompt and answer are single joined strings, so a block
cannot occur in one.
````

- [ ] **Step 9: Commit**

```bash
git add pipeline/src/lint.ts pipeline/tests/lint.test.ts README.md \
  vault/security/tls/session-resumption-and-0-rtt.md \
  vault/aws/edge/edge-functions-and-lambda-at-edge.md
git commit -F - <<'MSG'
feat: lint math syntax, and fix the vault's two bare dollars

Four rules, each covering a failure that is silent rather than loud.
An unpaired "$" now swallows or mangles a sentence instead of being
punctuation. Math in a cloze answer produces a card nobody can type
the answer to. Card syntax inside a display block makes parseCards and
parseBlocks disagree about a note's card count. Invalid LaTeX would
otherwise reach a phone as an error card, since the app renders with
throwOnError:false so one bad span cannot blank a whole card.

The two vault fixes ship here rather than with the migration because
vault-lint.test.ts asserts the whole vault is clean, so the rule and
the fixes cannot be separated without leaving the suite red. Both are
prose-only: "transfer $100" becomes "\$100", and "$LATEST" moves into
backticks, where an AWS token belonged regardless of this feature.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 9: Migrate the vault

The mechanism is complete and tested at this point; this task is the content sweep. It is deliberately last and deliberately separate, so the feature is reviewable apart from a 71-file diff.

**Files:**
- Modify: notes under `vault/` containing math-shaped code spans
- Modify: `deck/deck.json` (regenerated, never hand-edited)

**Interfaces:**
- Consumes: the syntax and lint rules from Tasks 5 and 8.
- Produces: no code.

- [ ] **Step 1: Check the working tree for stray untracked notes**

```bash
git status --porcelain | grep '^?? vault/'
```

Expected: no output. Per `CLAUDE.md`, `build:deck` walks `vault/` rather than the git index, so an untracked draft would have its cards minted into the deck. Anything that turns up and does not belong to this change must be moved out of the tree before building.

- [ ] **Step 2: List the notes to review, by category**

```bash
grep -rl '`[^`]*\^[^`]*`' vault --include='*.md' | sort
```

Work through the output one category at a time. Commit per category, so a disagreement about one book's notation does not block the rest.

- [ ] **Step 3: Convert, applying the math-or-code test**

For each code span, ask whether it is *mathematics* or *notation about a program*. Mathematics converts; notation about a program stays a code span.

Convert (`vault/math`, `vault/physics`):

| Before | After |
|---|---|
| `` `A^T*A` `` | `$A^\top A$` |
| `` `R^n` `` | `$\mathbb{R}^n$` |
| `` `A^T*(b - A*x) = 0` `` | `$A^\top(b - Ax) = 0$` |
| `` `A = P*D*P^-1` `` | `$A = PDP^{-1}$` |
| `` `∂^2f/∂x^2` `` | `$\partial^2 f/\partial x^2$` |
| `` `x·x = sum x_i^2` `` | `$x \cdot x = \sum_i x_i^2$` |
| `` `f'(x) = e^x = y` `` | `$f'(x) = e^x = y$` |

Leave as code spans:

| Stays | Why |
|---|---|
| `` `O(n^2)` `` in `vault/clrs`, `vault/operating-systems` | complexity notation about a program |
| `` `$connect` ``, `` `$$.Task.Token` `` | AWS identifiers |
| anything inside a ``` fence | a fence is code |

Where a derivation reads as a cramped run of operators — the least-squares normal equations being the case that motivated this feature — promote it to a `$$` display block, or to an inline `$$...$$` run if it lives in a card answer.

Anything genuinely ambiguous: leave it as a code span and raise it in the PR description rather than guessing.

- [ ] **Step 4: Fix any cloze answers the lint flags**

```bash
npx vitest run pipeline/tests/vault-lint.test.ts
```

For each `math-in-cloze`, rewrite so the math sits in the prompt and the blank falls on prose. For example:

```markdown
A projection satisfies ==$P^2 = P$==.
```

becomes:

```markdown
A projection matrix satisfies $P^2 = P$ — the property called ==idempotence==.
```

Check the rewrite against the cloze self-answer rule while you are there: the parser joins consecutive prose lines into one block, so the paragraph must not restate the hidden word elsewhere.

- [ ] **Step 5: Commit the category**

```bash
git add vault/math
git commit -F - <<'MSG'
feat: typeset the linear algebra notes as LaTeX

Converted the spans that are mathematics; left complexity notation
like O(n^2) as code spans, since that describes a program rather than
an equation. Derivations that read as a run of operators in one line
are promoted to display blocks.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

Repeat Steps 3-5 per category.

- [ ] **Step 6: Rebuild the deck**

```bash
npm run build:deck && git status --porcelain
```

`build:deck` regenerates `deck/deck.json` and `deck/notes.json` and mints any new `^card-xxxx` anchors. Card ids are carried by those anchors and are independent of prompt text, so rewriting a prompt does NOT orphan its FSRS review history. If the diff shows anchors being *removed* or *renumbered*, stop — that means a cloze count changed, and the review history for those cards is about to be orphaned.

- [ ] **Step 7: Commit the rebuilt deck**

```bash
git add deck/
git commit -F - <<'MSG'
chore: rebuild deck after math migration

Card ids ride on ^card-xxxx anchors rather than on prompt text, so
rewriting a prompt into LaTeX leaves FSRS review history attached.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

- [ ] **Step 8: Run the full pre-PR gate**

```bash
npm test && npm run typecheck && npm run build:deck && git status --porcelain
```

Expected: all green and the last command prints nothing.

- [ ] **Step 9: Re-sync with main before opening the PR**

```bash
git fetch origin && git rebase origin/main
```

If the rebase pulled in vault changes, regenerate — `deck.json` is downstream of both sides and is the file most likely to conflict:

```bash
npm run build:deck && git status --porcelain
```

- [ ] **Step 10: Open the PR**

Describe the feature, list any spans left as code spans because the math-or-code call was ambiguous, and note that the migration commits are separable from the mechanism commits.

---

## Notes for the reviewer

Three things are worth looking at closely:

1. **`inlineWithMath`'s escaping order** (Task 2). It is the one place the escape-first contract is relaxed, and the relaxation is load-bearing — KaTeX needs raw LaTeX. Check that every non-math chunk still routes through `escapeHtml`, and that `trust: false` is set.
2. **The two parser walks** (Task 5). They must gain the delimiter together. `resolveBlocks`' total-zip assertion catches drift, but at build time across the whole vault rather than in a unit test.
3. **The migration's math-or-code calls** (Task 9). `O(n^2)` is code; `A^\top A` is math. The line is a judgment call and the diff is large, so spot-check `vault/clrs` in particular, where both kinds appear in the same note.
