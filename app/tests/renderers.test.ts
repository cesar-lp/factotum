import { describe, it, expect } from 'vitest';
import {
  normalizeAnswer,
  checkCloze,
  isNumericAnswer,
  renderPrompt,
  renderActions,
  shuffle,
  inlineMarkup,
  escapeHtml,
  inlineWithMath
} from '../src/ui/renderers.js';
import { issueUrl } from '../src/ui/flag.js';
import type { StoredCard } from '../src/db/schema.js';
import type { Choice } from '../../pipeline/src/types.js';

const base = {
  topic: 'networking', category: 'networking', tags: [], source: { path: 'vault/a.md', block: 'card-aaaa' },
  citations: ['RFC 9293'], tombstoned: false
};

const cloze: StoredCard = { ...base, id: 'card-aaaa', format: 'cloze', prompt: 'MTU is ___.', answer: '1500 bytes' };
const mcq: StoredCard = {
  ...base, id: 'card-bbbb', format: 'mcq', prompt: 'Layer?',
  choices: [{ text: 'Transport', correct: true }, { text: 'Network', correct: false }]
};
const recall: StoredCard = { ...base, id: 'card-cccc', format: 'recall', prompt: 'Explain ARQ.' };
const qa: StoredCard = { ...base, id: 'card-dddd', format: 'qa', prompt: 'What is ARQ?', answer: 'Automatic repeat request' };

// Deterministic PRNG (mulberry32) so shuffle tests are reproducible without
// depending on Math.random.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('answer checking', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeAnswer('  1500   Bytes ')).toBe('1500 bytes');
  });

  it('accepts answers differing only by case or spacing', () => {
    expect(checkCloze('1500  BYTES', '1500 bytes')).toBe(true);
    expect(checkCloze('1400 bytes', '1500 bytes')).toBe(false);
  });
});

describe('isNumericAnswer', () => {
  it('is true for purely digit answers', () => {
    expect(isNumericAnswer('1')).toBe(true);
    expect(isNumericAnswer('0')).toBe(true);
    expect(isNumericAnswer('  42  ')).toBe(true); // trims surrounding whitespace first
  });

  it('is false for ordinary word or mixed answers', () => {
    expect(isNumericAnswer('SSTF')).toBe(false);
    expect(isNumericAnswer('1500 bytes')).toBe(false); // digits + word, not purely numeric
    expect(isNumericAnswer('24-bit')).toBe(false); // punctuation disqualifies it
    expect(isNumericAnswer('')).toBe(false);
  });
});

describe('renderPrompt', () => {
  it('shows the category chip and prompt text', () => {
    const html = renderPrompt(cloze);
    expect(html).toContain('networking');
    expect(html).toContain('MTU is ___.');
  });

  it('escapes html in prompts', () => {
    const html = renderPrompt({ ...recall, prompt: '<script>x</script>' });
    expect(html).not.toContain('<script>');
  });
});

describe('renderActions', () => {
  it('renders one button per choice for mcq', () => {
    const html = renderActions(mcq, false);
    expect((html.match(/data-choice=/g) ?? [])).toHaveLength(2);
  });

  it('shows a continue button once an mcq is revealed (citations render in renderPrompt now)', () => {
    const html = renderActions(mcq, true);
    expect(html).toContain('data-outcome="continue"');
    expect(html).toContain('disabled');
    const promptHtml = renderPrompt(mcq, true);
    expect(promptHtml).toContain('RFC 9293');
  });

  it('renders mcq choices in the order it is given, not deck order', () => {
    // renderActions itself does no shuffling — it's a pure renderer — but
    // it must honor an explicit choice order passed in by the caller
    // (review.ts), which is where the actual shuffle happens.
    const reordered: Choice[] = [mcq.choices![1]!, mcq.choices![0]!];
    const html = renderActions(mcq, false, reordered);
    const texts = [...html.matchAll(/<span class="choice-text">([^<]+)<\/span>/g)].map((m) => m[1]!.trim());
    expect(texts).toEqual(['Network', 'Transport']);
  });

  it('preserves each choice\'s correctness flag regardless of position', () => {
    const reordered: Choice[] = [mcq.choices![1]!, mcq.choices![0]!];
    const html = renderActions(mcq, false, reordered);
    // The choice at index 0 is now "Network" (incorrect), index 1 is
    // "Transport" (correct) — data-correct must follow the choice, not
    // the original deck position.
    expect(html).toMatch(/data-choice="0" data-correct="false"/);
    expect(html).toMatch(/data-choice="1" data-correct="true"/);
  });

  it('renders an input and check button for cloze before reveal', () => {
    expect(renderActions(cloze, false)).toContain('data-role="cloze-input"');
  });

  it('renders four rating buttons for self-graded cards after reveal', () => {
    const html = renderActions(recall, true);
    for (const outcome of ['again', 'hard', 'good', 'easy']) {
      expect(html).toContain(`data-outcome="${outcome}"`);
    }
  });

  it('always renders the flag button', () => {
    expect(renderActions(mcq, false)).toContain('data-role="flag"');
    expect(renderActions(recall, true)).toContain('data-role="flag"');
  });

  describe('source button: only ever shown after reveal, never before (spoiler risk)', () => {
    it('qa/recall: absent before reveal, present after', () => {
      expect(renderActions(recall, false)).not.toContain('data-role="source"');
      expect(renderActions(qa, false)).not.toContain('data-role="source"');
      expect(renderActions(recall, true)).toContain('data-role="source"');
      expect(renderActions(qa, true)).toContain('data-role="source"');
    });

    it('cloze: absent before reveal (including the self-graded "Show answer" control) and present after every revealed branch', () => {
      expect(renderActions(cloze, false)).not.toContain('data-role="source"');
      expect(renderActions(cloze, true, undefined, 'correct')).toContain('data-role="source"');
      expect(renderActions(cloze, true, undefined, 'wrong')).toContain('data-role="source"');
      expect(renderActions(cloze, true, undefined, 'self-graded')).toContain('data-role="source"');
    });

    it('mcq: absent before reveal, present after', () => {
      expect(renderActions(mcq, false)).not.toContain('data-role="source"');
      expect(renderActions(mcq, true)).toContain('data-role="source"');
    });
  });

  describe('revealed cloze feedback (the correct-path bug this branch fixes)', () => {
    it('a correct answer substitutes into the prompt (tinted ok) and shows citations, and suppresses the override', () => {
      const promptHtml = renderPrompt(cloze, true, { outcome: 'correct' });
      expect(promptHtml).toContain('1500 bytes'); // substituted into the blank now, not a detached paragraph
      expect(promptHtml).toContain('cloze-fill is-ok');
      expect(promptHtml).toContain('RFC 9293'); // citation — this is the bug: it never rendered before

      const html = renderActions(cloze, true, undefined, 'correct');
      expect(html).toContain('data-outcome="continue"');
      expect(html).not.toContain('data-outcome="override"'); // meaningless when already correct
    });

    it('a wrong answer shows the override alongside Continue, citations, and what was typed', () => {
      const promptHtml = renderPrompt(cloze, true, { outcome: 'wrong', typedAnswer: '1400 bytes' });
      expect(promptHtml).toContain('1500 bytes'); // correct answer substituted in
      expect(promptHtml).toContain('cloze-fill is-accent');
      expect(promptHtml).toContain('You typed: 1400 bytes'); // previously discarded entirely
      expect(promptHtml).toContain('RFC 9293');

      const html = renderActions(cloze, true, undefined, 'wrong');
      expect(html).toContain('data-outcome="continue"');
      expect(html).toContain('data-outcome="override"');
    });
  });

  describe('cloze reveal state label (WCAG 1.4.1 — colour is never the only signal)', () => {
    // correct and self-graded differ ONLY by --ok green vs --accent ochre
    // otherwise (no typed line, no override on either), so each of the
    // three reveal states must carry distinguishing TEXT, not just a class
    // name a sighted user with typical colour vision would read as intent.
    it('a correct reveal is labelled "Correct" in an aria-live region', () => {
      const html = renderPrompt(cloze, true, { outcome: 'correct' });
      expect(html).toMatch(/aria-live="polite"[^>]*>Correct</);
    });

    it('a self-graded reveal is labelled distinctly from "Correct", in an aria-live region', () => {
      const html = renderPrompt(cloze, true, { outcome: 'self-graded' });
      expect(html).toMatch(/aria-live="polite"[^>]*>Answer revealed</);
      expect(html).not.toContain('>Correct<');
    });

    it('a wrong reveal is labelled "Not quite" in an aria-live region', () => {
      const html = renderPrompt(cloze, true, { outcome: 'wrong', typedAnswer: '1400 bytes' });
      expect(html).toMatch(/aria-live="polite"[^>]*>Not quite</);
    });

    it('the three reveal states are all textually distinct from one another', () => {
      const correct = renderPrompt(cloze, true, { outcome: 'correct' });
      const wrong = renderPrompt(cloze, true, { outcome: 'wrong' });
      const selfGraded = renderPrompt(cloze, true, { outcome: 'self-graded' });
      const extractLabel = (html: string): string | undefined => html.match(/class="cloze-state[^>]*>([^<]+)</)?.[1];
      const labels = [extractLabel(correct), extractLabel(wrong), extractLabel(selfGraded)];
      expect(labels).toEqual(['Correct', 'Not quite', 'Answer revealed']);
      expect(new Set(labels).size).toBe(3);
    });

    it('an unrevealed cloze has no state label at all', () => {
      expect(renderPrompt(cloze, false)).not.toContain('cloze-state');
    });
  });

  describe('pre-reveal label: keyed off card.answer, not format', () => {
    it('qa keeps "Show answer" — there is an answer key to show', () => {
      const html = renderActions(qa, false);
      expect(html).toContain('Show answer');
    });

    it('recall with no answer key is labelled "Rate yourself"', () => {
      const html = renderActions(recall, false);
      expect(html).not.toContain('Show answer');
      expect(html).toContain('data-role="reveal"');
    });

    it('recall WITH an answer key is labelled "Show answer", not "Rate yourself"', () => {
      const recallWithAnswer: StoredCard = { ...recall, answer: 'Automatic repeat request' };
      const html = renderActions(recallWithAnswer, false);
      expect(html).toContain('Show answer');
    });
  });

  describe('cloze "Show answer" (self-graded reveal, no typing required)', () => {
    it('the pre-reveal state offers a show-answer control beside the input and Check button', () => {
      const html = renderActions(cloze, false);
      expect(html).toContain('data-role="cloze-input"');
      expect(html).toContain('data-role="check"');
      expect(html).toContain('data-role="reveal"');
    });

    it('a self-graded reveal substitutes the answer (tinted accent) and shows a rating row', () => {
      const promptHtml = renderPrompt(cloze, true, { outcome: 'self-graded' });
      expect(promptHtml).toContain('1500 bytes');
      expect(promptHtml).toContain('cloze-fill is-accent');

      const html = renderActions(cloze, true, undefined, 'self-graded');
      for (const outcome of ['again', 'hard', 'good', 'easy']) {
        expect(html).toContain(`data-outcome="${outcome}"`);
      }
    });

    it('a self-graded reveal shows neither correct/wrong feedback nor the override', () => {
      const html = renderActions(cloze, true, undefined, 'self-graded');
      expect(html).not.toContain('class="feedback');
      expect(html).not.toContain('data-outcome="continue"');
      expect(html).not.toContain('data-outcome="override"');
      expect(html.toLowerCase()).not.toContain('correct');
      expect(html.toLowerCase()).not.toContain('not quite');
    });
  });

  describe('qa with a missing answer still degrades safely', () => {
    it('does not throw, and renders no answer paragraph', () => {
      const qaNoAnswer: StoredCard = { ...qa, answer: undefined };
      expect(() => renderActions(qaNoAnswer, true)).not.toThrow();
      expect(() => renderPrompt(qaNoAnswer, true)).not.toThrow();
      expect(renderPrompt(qaNoAnswer, true)).not.toContain('class="expected"');
      // still gets the rating row — nothing about the missing answer breaks the reveal
      const html = renderActions(qaNoAnswer, true);
      for (const outcome of ['again', 'hard', 'good', 'easy']) {
        expect(html).toContain(`data-outcome="${outcome}"`);
      }
    });
  });
});

describe('shuffle', () => {
  it('returns a permutation: same elements, same length', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const result = shuffle(items, mulberry32(1));
    expect(result).toHaveLength(items.length);
    expect([...result].sort()).toEqual([...items].sort());
  });

  it('does not mutate the input array', () => {
    const items = ['a', 'b', 'c'];
    const copy = [...items];
    shuffle(items, mulberry32(42));
    expect(items).toEqual(copy);
  });

  it('is deterministic for a given rng', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(items, mulberry32(7))).toEqual(shuffle(items, mulberry32(7)));
  });

  it('produces a roughly uniform distribution (no fixed-point bias)', () => {
    // The failure mode this guards against: `array.sort(() => Math.random() - 0.5)`,
    // which is a biased "shuffle" that over-represents certain permutations
    // (V8's sort keeps many elements near their original position). With a
    // real Fisher-Yates shuffle and 79 two-choice mcq cards where the
    // correct answer starts at index 0, the correct answer should land at
    // index 0 close to half the time, not on nearly every run.
    const choices = [{ text: 'correct', correct: true }, { text: 'wrong', correct: false }];
    const runs = 2000;
    let atIndexZero = 0;
    const rng = mulberry32(1234);
    for (let i = 0; i < runs; i++) {
      const result = shuffle(choices, rng);
      if (result[0]?.correct) atIndexZero += 1;
    }
    const fraction = atIndexZero / runs;
    expect(fraction).toBeGreaterThan(0.4);
    expect(fraction).toBeLessThan(0.6);
  });

  it('is uniform across more than two positions too', () => {
    const items = ['a', 'b', 'c', 'd'];
    const runs = 4000;
    const counts = { a: 0, b: 0, c: 0, d: 0 };
    const rng = mulberry32(99);
    for (let i = 0; i < runs; i++) {
      const result = shuffle(items, rng);
      if (result[0] === 'a') counts.a += 1;
      else if (result[0] === 'b') counts.b += 1;
      else if (result[0] === 'c') counts.c += 1;
      else counts.d += 1;
    }
    // Each item should land first roughly 1/4 of the time (~1000/4000).
    for (const count of Object.values(counts)) {
      expect(count / runs).toBeGreaterThan(0.18);
      expect(count / runs).toBeLessThan(0.32);
    }
  });
});

describe('inlineMarkup', () => {
  it('renders a code span', () => {
    expect(inlineMarkup('use `PutItem` here')).toBe('use <code>PutItem</code> here');
  });

  it('renders bold', () => {
    expect(inlineMarkup('this is **important**')).toBe('this is <strong>important</strong>');
  });

  it('renders italic', () => {
    expect(inlineMarkup('this is *subtle*')).toBe('this is <em>subtle</em>');
  });

  it('tries ** before * so bold does not become nested italics', () => {
    expect(inlineMarkup('**x**')).toBe('<strong>x</strong>');
  });

  it('keeps emphasis markers inside a code span literal', () => {
    expect(inlineMarkup('`a * b`')).toBe('<code>a * b</code>');
    expect(inlineMarkup('`a ** b`')).toBe('<code>a ** b</code>');
  });

  it('leaves an unmatched single asterisk literal without swallowing the rest of the line', () => {
    expect(inlineMarkup('this * that stays plain')).toBe('this * that stays plain');
  });

  it('leaves an unmatched backtick literal', () => {
    expect(inlineMarkup('this ` that stays plain')).toBe('this ` that stays plain');
  });

  it('leaves an unmatched ** literal', () => {
    expect(inlineMarkup('this ** that stays plain')).toBe('this ** that stays plain');
  });

  it('does not corrupt already-escaped HTML entities', () => {
    const escaped = escapeHtml('<script>alert(1)</script>');
    expect(inlineMarkup(escaped)).toBe(escaped);
  });

  it('handles escaped entities alongside markup', () => {
    const escaped = escapeHtml('a *b* & <c>');
    expect(inlineMarkup(escaped)).toBe('a <em>b</em> &amp; &lt;c&gt;');
  });

  it('handles real deck fixtures: code spans with punctuation', () => {
    const input = 'A ___ attached to a write (`PutItem`, `UpdateItem`, `DeleteItem`) makes the write fail';
    expect(inlineMarkup(escapeHtml(input))).toBe(
      'A ___ attached to a write (<code>PutItem</code>, <code>UpdateItem</code>, <code>DeleteItem</code>) makes the write fail'
    );
  });

  it('handles real deck fixtures: code span containing operators', () => {
    const input = 'defined as `actual_cost + Phi(after) - Phi(before)`';
    expect(inlineMarkup(escapeHtml(input))).toBe(
      'defined as <code>actual_cost + Phi(after) - Phi(before)</code>'
    );
  });

  it('regression: card-8kx7 — multiplication asterisks in c*g(n) must not pair with *every*', () => {
    const input =
      'The strict versions tighten the inequality itself, not just which side it bounds. ___ requires f(n) < c*g(n) for *every* positive constant c, eventually, meaning f(n) becomes insignificant relative to g(n) as n grows. Its mirror is little-omega, requiring f(n) > c*g(n) for every constant c; in both strict cases the bound can never be met with equality in the limit, unlike O and Omega where it can.';
    const out = inlineMarkup(escapeHtml(input));
    expect(out).toContain('c*g(n)');
    expect(out).toContain('<em>every</em>');
    expect(out).not.toMatch(/<em>g\(n\)/);
  });

  it('regression: card-r04a — same c*g(n) / *every* shape', () => {
    const input =
      'Why does little-o require the inequality f(n) < c*g(n) to hold for *every* positive constant c, rather than just some constant c the way O(g(n)) does?';
    const out = inlineMarkup(escapeHtml(input));
    expect(out).toContain('c*g(n)');
    expect(out).toContain('<em>every</em>');
  });

  it('regression: card-q592 — O(E * |f*|) must not be mangled, *which* still italicises', () => {
    const input =
      'It leaves the choice of *which* augmenting path unspecified, and that choice matters: with a poor choice, its running time can be as bad as O(E * |f*|), where |f*| is the value of the maximum flow, since integer capacities can force one unit of flow to be added per iteration in the worst case.';
    const out = inlineMarkup(escapeHtml(input));
    expect(out).toContain('<em>which</em>');
    expect(out).toContain('O(E * |f*|)');
    expect(out).toContain('|f*| is the value');
    expect(out).not.toMatch(/<em>\s*\|f/);
  });

  it('applies multiple code spans and emphasis in the same string', () => {
    expect(inlineMarkup('`a` and **b** and *c*')).toBe(
      '<code>a</code> and <strong>b</strong> and <em>c</em>'
    );
  });
});

describe('inlineMarkup wired into renderers', () => {
  it('renders bold/italic/code in the prompt', () => {
    const card: StoredCard = { ...base, id: 'card-eeee', format: 'qa', prompt: 'What is **MTU** in `IP`?', answer: 'x' };
    const html = renderPrompt(card);
    expect(html).toContain('<strong>MTU</strong>');
    expect(html).toContain('<code>IP</code>');
  });

  it('renders markup in the answer paragraph', () => {
    const card: StoredCard = { ...base, id: 'card-ffff', format: 'qa', prompt: 'p', answer: 'It is `1500 bytes`' };
    const html = renderPrompt(card, true);
    expect(html).toContain('<code>1500 bytes</code>');
  });

  it('renders markup in mcq choice text', () => {
    const card: StoredCard = {
      ...base, id: 'card-gggg', format: 'mcq', prompt: 'p',
      choices: [{ text: 'The `Transport` layer', correct: true }, { text: 'Network', correct: false }]
    };
    const html = renderActions(card, false);
    expect(html).toContain('<code>Transport</code>');
  });
});

describe('issueUrl', () => {
  it('prefills the card id and note path', () => {
    const url = issueUrl(cloze, 'cesar-lp/factotum');
    expect(url).toContain('https://github.com/cesar-lp/factotum/issues/new');
    expect(decodeURIComponent(url)).toContain('card-aaaa');
    expect(decodeURIComponent(url)).toContain('vault/a.md');
  });
});

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

  it('cannot have its escape sentinel forged by note content', () => {
    // The sentinel is NUL + "d" + NUL. Content containing it must not come
    // back out as a dollar sign.
    const html = inlineWithMath('literal \u0000d\u0000 sequence');
    expect(html).not.toContain('$');
  });
});

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

  it('fills the real blank, not underscores inside rendered math', () => {
    const card: StoredCard = {
      ...base, id: 'card-u', format: 'cloze', due: 0, reps: 0, lapses: 0,
      prompt: 'In $\\text{a___b}$ the notation marks ___ explicitly.',
      answer: 'the gap'
    } as StoredCard;
    const html = renderPrompt(card, true, { outcome: 'correct' });
    // Exactly one filler, and the math span is still intact around it.
    expect(html.match(/cloze-fill/g)).toHaveLength(1);
    expect(html).toContain('katex');
  });

  it('keeps emphasis that spans the blank working', () => {
    const card: StoredCard = {
      ...base, id: 'card-e', format: 'cloze', due: 0, reps: 0, lapses: 0,
      prompt: 'It is **very ___ indeed**.', answer: 'odd'
    } as StoredCard;
    expect(renderPrompt(card, true, { outcome: 'correct' })).toContain('<strong>');
  });

  it('cannot have its blank marker forged by note content', () => {
    const card: StoredCard = {
      ...base, id: 'card-f', format: 'cloze', due: 0, reps: 0, lapses: 0,
      prompt: 'Literal @@factotum-cloze-blank@@ then the real ___ blank.',
      answer: 'filled'
    } as StoredCard;
    const html = renderPrompt(card, true, { outcome: 'correct' });
    expect(html.match(/cloze-fill/g)).toHaveLength(1);
    expect(html).not.toContain('@@factotum-cloze-blank@@');
  });

  it('agrees with inlineWithMath about math-span boundaries near an escaped dollar', () => {
    // Regression test for markFirstBlank and inlineWithMath tokenizing
    // inconsistently on escaped dollars. `$note___\$` has no real closing
    // `$` once `\$` is shielded (the shielded second dollar can't pair), so
    // inlineWithMath treats the whole thing as literal text, not math -- and
    // markFirstBlank must agree, finding the blank in place there, rather
    // than mistaking `$note___\$` for a matched math span (it starts and
    // ends with an unshielded `$`) and skipping over the only blank in the
    // prompt entirely.
    const card: StoredCard = {
      ...base, id: 'card-g', format: 'cloze', due: 0, reps: 0, lapses: 0,
      prompt: 'A real span $y$ is fine, but $note___\\$ trails after it.',
      answer: 'filled'
    } as StoredCard;
    const html = renderPrompt(card, true, { outcome: 'correct' });
    // Filled exactly once, in place -- not the parenthetical append fallback
    // that would fire if markFirstBlank found no blank at all.
    expect(html.match(/cloze-fill/g)).toHaveLength(1);
    expect(html).not.toContain('(<span class="cloze-fill');
    expect(html).not.toContain('___');
    // The genuine math span still typesets, and the literal dollar in
    // `\$note___` (rendered outside math) survives as a plain `$`.
    expect(html).toContain('katex');
    expect(html).toContain('$note');
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
