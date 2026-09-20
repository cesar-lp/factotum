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
  const allowed = new Set([
    'code', '/code', 'em', '/em', 'strong', '/strong',
    'div', '/div', 'span', '/span', 'p', '/p', 'button', '/button', 'input'
  ]);
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
});

const CLOZE_BLANK_RE = /_{3,}/;
