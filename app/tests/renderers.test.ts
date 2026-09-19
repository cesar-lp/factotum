import { describe, it, expect } from 'vitest';
import { normalizeAnswer, checkCloze, renderPrompt, renderActions, shuffle } from '../src/ui/renderers.js';
import { issueUrl } from '../src/ui/flag.js';
import type { StoredCard } from '../src/db/schema.js';
import type { Choice } from '../../pipeline/src/types.js';

const base = {
  category: 'networking', tags: [], source: { path: 'vault/a.md', block: 'card-aaaa' },
  citations: ['RFC 9293'], tombstoned: false
};

const cloze: StoredCard = { ...base, id: 'card-aaaa', format: 'cloze', prompt: 'MTU is ___.', answer: '1500 bytes' };
const mcq: StoredCard = {
  ...base, id: 'card-bbbb', format: 'mcq', prompt: 'Layer?',
  choices: [{ text: 'Transport', correct: true }, { text: 'Network', correct: false }]
};
const recall: StoredCard = { ...base, id: 'card-cccc', format: 'recall', prompt: 'Explain ARQ.' };

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

  it('shows citations and a continue button once an mcq is revealed', () => {
    const html = renderActions(mcq, true);
    expect(html).toContain('RFC 9293');
    expect(html).toContain('data-outcome="continue"');
    expect(html).toContain('disabled');
  });

  it('renders mcq choices in the order it is given, not deck order', () => {
    // renderActions itself does no shuffling — it's a pure renderer — but
    // it must honor an explicit choice order passed in by the caller
    // (review.ts), which is where the actual shuffle happens.
    const reordered: Choice[] = [mcq.choices![1]!, mcq.choices![0]!];
    const html = renderActions(mcq, false, reordered);
    const texts = [...html.matchAll(/data-correct="(true|false)"[^>]*>\s*([^<]+?)\s*</g)].map((m) => m[2]);
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

describe('issueUrl', () => {
  it('prefills the card id and note path', () => {
    const url = issueUrl(cloze, 'cesar-lp/factotum');
    expect(url).toContain('https://github.com/cesar-lp/factotum/issues/new');
    expect(decodeURIComponent(url)).toContain('card-aaaa');
    expect(decodeURIComponent(url)).toContain('vault/a.md');
  });
});
