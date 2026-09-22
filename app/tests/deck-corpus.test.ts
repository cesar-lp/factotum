import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { renderPrompt, renderActions } from '../src/ui/renderers.js';
import type { StoredCard } from '../src/db/schema.js';
import type { Deck, DeckCard } from '../../pipeline/src/types.js';
import type { IntervalPreview } from '../src/scheduler/fsrs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// The real, built deck — not a fixture. The whole point of this test is to
// catch renderer bugs that only surface on real prose, which a hand-written
// fixture can never reproduce. Read once for the whole file (1300+ cards),
// not per test, to keep this fast on every PR.
const DECK_PATH = resolve(__dirname, '../../deck/deck.json');

const STUB_PREVIEW: IntervalPreview = { again: '10m', hard: '1d', good: '4d', easy: '9d' };

function toStoredCard(card: DeckCard): StoredCard {
  return { ...card, tombstoned: false };
}

/**
 * Pulls every <em>...</em> and <strong>...</strong> span's inner text out of
 * a blob of rendered HTML. Deliberately naive (no real HTML parser) because
 * the renderer's output is a small, controlled vocabulary of tags produced
 * only by inlineMarkup/escapeHtml — a regex scan is sufficient and keeps
 * this fast across 1300+ cards rendered in multiple states.
 */
function emphasisSpans(html: string): { tag: string; text: string }[] {
  const spans: { tag: string; text: string }[] = [];
  const re = /<(em|strong)>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    spans.push({ tag: m[1]!, text: m[2]! });
  }
  return spans;
}

/** Every opening tag in the renderer's small, known vocabulary must have a matching close, in order (non-nesting). */
const KNOWN_TAGS = ['code', 'em', 'strong'];

function findUnbalancedTags(html: string): string[] {
  const problems: string[] = [];
  for (const tag of KNOWN_TAGS) {
    const opens = (html.match(new RegExp(`<${tag}>`, 'g')) ?? []).length;
    const closes = (html.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
    if (opens !== closes) {
      problems.push(`<${tag}> opened ${opens} time(s) but closed ${closes} time(s)`);
    }
  }
  return problems;
}

function hasBareBacktick(html: string): boolean {
  return html.includes('`');
}

function hasExecutableTag(html: string): boolean {
  // Anything that isn't one of the three tags inlineMarkup is allowed to
  // produce, plus the renderer's own known structural tags, is suspect.
  // We specifically check for a real, unescaped <script> (or any other
  // tag not in the allowed set) surviving end to end.
  //
  // These groups exist for different reasons and are kept separate rather
  // than merged into one undifferentiated list:
  //
  //   RENDERER_TAGS is the renderer's own vocabulary -- inlineMarkup,
  //   escapeHtml, and the structural markup in renderers.ts never produce
  //   anything outside this set.
  //
  //   KATEX_MATHML_TAGS is KaTeX's MathML vocabulary. `renderMath` (see
  //   math.ts) calls KaTeX with `output: 'htmlAndMathml'`, which emits a
  //   parallel MathML tree alongside the presentational HTML -- that's the
  //   part a screen reader actually reads, so it isn't optional.
  //
  //   KATEX_SVG_TAGS is KaTeX's OWN presentational half, not MathML: `svg`,
  //   `path` and `line` are how KaTeX draws stretchy wide elements (radical
  //   signs, braces, tall delimiters -- see SvgNode/PathNode/LineNode in
  //   katex's source). They read as more alarming than the MathML tags
  //   (an `<svg>` can carry a `<script>` in general), but KaTeX's own
  //   `toMarkup()` for these three types takes no caller-controlled markup
  //   -- only numeric attributes and `d`/path-data strings it looks up
  //   itself or computes, run through KaTeX's own attribute escaper. They
  //   cannot carry an executable child.
  //
  //   Widening the allowlist to include either group is safe: every piece
  //   of note-derived content reaching this HTML has already been through
  //   `escapeHtml`, so a `<mi>` or `<svg>` typed literally in a note
  //   arrives as `&lt;mi&gt;` / `&lt;svg&gt;` and never matches the tag
  //   regex below. The only way a RAW tag from either group reaches this
  //   string is the renderer itself, or KaTeX running under `trust: false`
  //   (see math.ts) -- never note content. So the invariant this check
  //   exists to enforce -- no executable tag survives end to end from note
  //   content -- is unaffected by admitting KaTeX's inert, presentational
  //   output.
  //
  //   Enumerated explicitly (not "anything starting with m", or a blanket
  //   allowance for svg) so a future KaTeX version emitting an element
  //   outside these exact sets still trips this test.
  const RENDERER_TAGS = [
    'code', 'em', 'strong', 'div', 'span', 'p', 'button', 'input'
  ];
  const KATEX_MATHML_TAGS = [
    'math', 'semantics', 'annotation', 'mrow', 'mi', 'mn', 'mo', 'ms',
    'mtext', 'mspace', 'msub', 'msup', 'msubsup', 'munder', 'mover',
    'munderover', 'mfrac', 'msqrt', 'mroot', 'mstyle', 'mpadded',
    'mphantom', 'menclose', 'mtable', 'mtr', 'mtd', 'mlabeledtr', 'merror',
    'maction', 'mmultiscripts', 'mprescripts', 'none'
  ];
  const KATEX_SVG_TAGS = ['svg', 'path', 'line'];
  const allowed = new Set(
    [...RENDERER_TAGS, ...KATEX_MATHML_TAGS, ...KATEX_SVG_TAGS].flatMap((tag) => [tag, `/${tag}`])
  );
  const tagRe = /<\/?([a-zA-Z0-9-]+)(?:\s[^>]*)?>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const name = m[1]!.toLowerCase();
    const withSlash = html[m.index + 1] === '/' ? `/${name}` : name;
    if (!allowed.has(withSlash)) return true;
  }
  return false;
}

describe('deck corpus render invariants', () => {
  let deck: Deck;
  let cards: StoredCard[];

  beforeAll(() => {
    const raw = readFileSync(DECK_PATH, 'utf8');
    deck = JSON.parse(raw) as Deck;
    cards = deck.cards.map(toStoredCard);
  });

  it('loaded a real, substantial deck (sanity guard against a broken path)', () => {
    expect(cards.length).toBeGreaterThan(1000);
  });

  it('renders every card, in every real render state, with no invariant violation', () => {
    const violations: string[] = [];

    function report(card: StoredCard, state: string, message: string) {
      violations.push(`${card.id} [${card.source.path}] (${state}): ${message}`);
    }

    function checkHtml(card: StoredCard, state: string, html: string) {
      if (hasBareBacktick(html)) {
        report(card, state, `literal backtick survived in rendered output:\n    ${html}`);
      }
      for (const problem of findUnbalancedTags(html)) {
        report(card, state, `unbalanced tags: ${problem}\n    ${html}`);
      }
      for (const span of emphasisSpans(html)) {
        if (/^\s|\s$/.test(span.text)) {
          report(
            card,
            state,
            `<${span.tag}> text begins or ends with whitespace: ${JSON.stringify(span.text)}\n    ${html}`
          );
        }
        if (span.text.length > 80) {
          report(
            card,
            state,
            `<${span.tag}> text exceeds 80 chars (likely markers paired across unrelated prose): ${JSON.stringify(span.text)}`
          );
        }
      }
      if (hasExecutableTag(html)) {
        report(card, state, `unexpected/executable tag survived in rendered output:\n    ${html}`);
      }
    }

    for (const card of cards) {
      // --- format-specific content invariants -------------------------------
      if (card.format === 'cloze') {
        if (!CLOZE_BLANK_RE.test(card.prompt)) {
          report(card, 'source', `cloze prompt has no blank matching /_{3,}/:\n    ${card.prompt}`);
        }
        if (!card.answer || !card.answer.trim()) {
          report(card, 'source', 'cloze card has no non-empty answer');
        }
      }
      if (card.format === 'qa') {
        if (!card.answer || !card.answer.trim()) {
          report(card, 'source', 'qa card has no non-empty answer');
        }
      }
      if (card.format === 'mcq') {
        const choices = card.choices ?? [];
        if (choices.length < 2 || choices.length > 4) {
          report(card, 'source', `mcq has ${choices.length} choice(s), expected 2..4`);
        }
        const correctCount = choices.filter((c) => c.correct).length;
        if (correctCount !== 1) {
          report(card, 'source', `mcq has ${correctCount} correct choice(s), expected exactly 1`);
        }
      }

      // --- render every real state --------------------------------------------
      // Unrevealed.
      checkHtml(card, 'prompt:unrevealed', renderPrompt(card, false));
      checkHtml(card, 'actions:unrevealed', renderActions(card, false, card.choices, undefined, STUB_PREVIEW));

      if (card.format === 'cloze') {
        const outcomes: { outcome: 'correct' | 'wrong' | 'self-graded'; typedAnswer?: string }[] = [
          { outcome: 'correct' },
          { outcome: 'wrong', typedAnswer: 'a wrong guess' },
          { outcome: 'self-graded' }
        ];
        for (const { outcome, typedAnswer } of outcomes) {
          const promptHtml = renderPrompt(card, true, { outcome, typedAnswer });
          checkHtml(card, `prompt:revealed:${outcome}`, promptHtml);
          checkHtml(
            card,
            `actions:revealed:${outcome}`,
            renderActions(card, true, card.choices, outcome, STUB_PREVIEW)
          );

          // Invariant 7: substituteClozeBlank's "(answer)" fallback must
          // never be reached for a real card — every cloze prompt must
          // genuinely have its blank replaced, not have the answer appended
          // in parens as a fallback for a missing blank.
          if (/\(<span class="cloze-fill/.test(promptHtml)) {
            report(
              card,
              `prompt:revealed:${outcome}`,
              `cloze fell back to the "(answer)" append form -- no blank was found to substitute:\n    ${promptHtml}`
            );
          }
        }
      } else {
        checkHtml(card, 'prompt:revealed', renderPrompt(card, true));
        checkHtml(
          card,
          'actions:revealed',
          renderActions(card, true, card.choices, undefined, STUB_PREVIEW)
        );
      }

      // --- mcq-specific: every rendered choice has a non-empty badge ----------
      if (card.format === 'mcq') {
        const choices = card.choices ?? [];
        for (const state of [false, true]) {
          const html = renderActions(card, state, choices, undefined, STUB_PREVIEW);
          const badges = [...html.matchAll(/<span class="choice-badge">([\s\S]*?)<\/span>/g)].map((m) => m[1]!.trim());
          if (badges.length !== choices.length) {
            report(card, `actions:${state ? 'revealed' : 'unrevealed'}`, `expected ${choices.length} badges, found ${badges.length}`);
          }
          badges.forEach((badge, index) => {
            if (!badge) {
              report(card, `actions:${state ? 'revealed' : 'unrevealed'}`, `choice ${index} rendered an empty badge`);
            }
          });
        }
      }
    }

    expect(
      violations,
      `${violations.length} render invariant violation(s) across the deck corpus:\n\n${violations.join('\n\n')}`
    ).toEqual([]);
  });

  it('escapes and marks up hostile content end to end without leaking an executable tag', () => {
    // Three distinct attack shapes, deliberately combined in one string so a
    // single card exercises all of them:
    //   - a literal <script> tag (relies on `<`/`>` escaping)
    //   - a bare `&` in ordinary prose (relies on `&` escaping; asserted
    //     POSITIVELY below, not just "nothing bad happened" -- 156 of the
    //     1310 real deck cards contain a bare `&` today, mostly in
    //     citations like "Herlihy & Shavit", so this is guarding live
    //     content, not only a synthetic case)
    //   - author-typed text that already LOOKS like an HTML entity
    //     (`&lt;script&gt;`, typed as those literal characters, not a real
    //     tag). escapeHtml replaces `&` before `<`/`>` specifically so this
    //     stays inert text; if `&` escaping is ever neutered, `<`/`>`
    //     escaping does nothing to it (there is no literal `<` or `>` in
    //     it) and a browser decodes it back into a real <script> tag on
    //     render. `<script>...</script>` alone can't catch that regression
    //     -- it is caught only by asserting the double-escaped form below.
    const hostile =
      '<script>alert(1)</script> & "quotes" \'single\' *em* **strong** `code` ' +
      'already-escaped-looking: &lt;script&gt;alert(2)&lt;/script&gt; and &amp;';
    const card: StoredCard = {
      id: 'card-test-xss',
      format: 'qa',
      topic: 'test',
      category: 'test',
      tags: [],
      prompt: hostile,
      answer: hostile,
      source: { path: 'test.md', block: 'card-test-xss' },
      citations: [hostile],
      tombstoned: false
    };
    const mcqCard: StoredCard = {
      ...card,
      id: 'card-test-xss-mcq',
      format: 'mcq',
      choices: [
        { text: hostile, correct: true },
        { text: 'safe choice', correct: false }
      ]
    };

    // Action-only renders (a bare "Show answer"/rating-row button, no
    // hostile text embedded) vs. renders that actually carry the hostile
    // string somewhere in their markup. The positive escaping assertions
    // below only make sense against the latter -- an html blob that never
    // contained the hostile string in the first place would trivially
    // "fail to escape" it.
    const controlOnlyHtmls = [
      renderActions(card, false, undefined, undefined, STUB_PREVIEW),
      renderActions(card, true, undefined, undefined, STUB_PREVIEW)
    ];
    const hostileHtmls = [
      renderPrompt(card, false),
      renderPrompt(card, true),
      renderPrompt(mcqCard, false),
      renderPrompt(mcqCard, true),
      renderActions(mcqCard, false, mcqCard.choices, undefined, STUB_PREVIEW),
      renderActions(mcqCard, true, mcqCard.choices, undefined, STUB_PREVIEW)
    ];

    for (const html of [...controlOnlyHtmls, ...hostileHtmls]) {
      // Negative: no real tag survived, in every render regardless of
      // whether it happens to carry the hostile text.
      expect(html).not.toContain('<script>');
      expect(hasExecutableTag(html), `unexpected tag survived:\n${html}`).toBe(false);
    }

    for (const html of hostileHtmls) {
      // Positive: escaping actually happened, not merely "nothing bad
      // showed up" (which would also be true of a renderer that silently
      // dropped all hostile input). A bare `&` in source must appear as
      // `&amp;` in output --
      expect(html, `bare & was not escaped to &amp;:\n${html}`).toContain('&amp;');
      // -- and author-typed text that already looks like an entity
      // (`&lt;script&gt;`) must come out DOUBLE-escaped (`&amp;lt;...`).
      // If `&` escaping is broken, this stays as plain `&lt;script&gt;`,
      // which a browser decodes back into a real <script> tag even though
      // no literal `<`/`>` character was ever in the source -- the one
      // shape `not.toContain('<script>')` cannot see.
      expect(html, `already-entity-looking text was not double-escaped:\n${html}`).toContain(
        '&amp;lt;script&amp;gt;'
      );
    }
  });

  it('hasExecutableTag still rejects real threats after widening for KaTeX (script, iframe, img)', () => {
    // The hostile-content test above proves the end-to-end pipeline never
    // lets a raw <script> through, because escapeHtml runs on note content
    // before hasExecutableTag ever sees it -- that test would pass even if
    // hasExecutableTag's allowlist were "anything goes", since escaping is
    // what actually neutralizes the input in that path.
    //
    // This test is narrower and more direct: it calls hasExecutableTag on
    // synthetic, ALREADY-RAW markup, the way it would see a tag that
    // reached it unescaped (the failure mode the whole check exists to
    // catch). It exists specifically because this file just added two new
    // groups of tags to the allowlist (KaTeX's MathML vocabulary and its
    // svg/path/line presentational vocabulary) -- this confirms that
    // widening did not also, even accidentally, admit an executable tag,
    // and that a real attack shape is still caught regardless of what else
    // happens to be in the markup around it (including legitimate KaTeX
    // output).
    const katexShapedSnippet =
      '<span class="katex"><math xmlns="http://www.w3.org/1998/Math/MathML">' +
      '<semantics><mrow><mi>x</mi></mrow></semantics></math>' +
      '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg></span>';

    // Sanity check: legitimate KaTeX-shaped markup alone is not flagged --
    // otherwise the "still rejects" assertions below would be meaningless
    // (a check that flags everything "rejects" every threat trivially).
    expect(hasExecutableTag(katexShapedSnippet)).toBe(false);

    for (const threat of [
      '<script>alert(1)</script>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<img src=x onerror=alert(1)>'
    ]) {
      expect(hasExecutableTag(threat), `threat not caught in isolation: ${threat}`).toBe(true);
      // And the same threat still trips the check when it arrives alongside
      // genuine, allowed KaTeX markup -- proving the newly-widened allowlist
      // doesn't somehow mask it.
      expect(
        hasExecutableTag(katexShapedSnippet + threat),
        `threat not caught alongside KaTeX markup: ${threat}`
      ).toBe(true);
    }
  });
});

const CLOZE_BLANK_RE = /_{3,}/;
