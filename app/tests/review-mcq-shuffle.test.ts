import { describe, it, expect } from 'vitest';
import { getPresentationChoices, highlightClasses } from '../src/ui/review.js';
import { renderActions } from '../src/ui/renderers.js';
import type { StoredCard } from '../src/db/schema.js';

const mcqCard: StoredCard = {
  id: 'card-xxxx', format: 'mcq', category: 'networking', tags: [],
  prompt: 'Layer?', citations: [], tombstoned: false,
  source: { path: 'vault/a.md', block: 'card-xxxx' },
  choices: [
    { text: 'Transport', correct: true },
    { text: 'Network', correct: false },
    { text: 'Data link', correct: false }
  ]
};

// Deterministic PRNG so these tests don't depend on Math.random.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('getPresentationChoices', () => {
  it('reuses the cached order for the same card index (unrevealed -> revealed)', () => {
    const rng = mulberry32(5);
    const first = getPresentationChoices(mcqCard, null, 0, rng);
    // Simulate the revealed re-render of the SAME card: same index, cache passed back in.
    const second = getPresentationChoices(mcqCard, first, 0, rng);
    expect(second).toBe(first); // identical reference: no recomputation, no new shuffle draw
    expect(second.choices).toEqual(first.choices);
  });

  it('recomputes (and may reorder) when the index advances to a new card', () => {
    const rng = mulberry32(5);
    const first = getPresentationChoices(mcqCard, null, 0, rng);
    const next = getPresentationChoices(mcqCard, first, 1, rng);
    expect(next).not.toBe(first);
    expect(next.index).toBe(1);
  });

  it('produces a shuffled order across many presentations, not always deck order', () => {
    // Regression guard for the actual bug: correct answer stuck at index 0.
    const rng = mulberry32(2024);
    let cache: ReturnType<typeof getPresentationChoices> | null = null;
    let deckOrderCount = 0;
    const runs = 200;
    for (let i = 0; i < runs; i++) {
      cache = getPresentationChoices(mcqCard, null, i, rng); // null cache = fresh card each time
      if (cache.choices[0]?.text === 'Transport') deckOrderCount += 1;
    }
    expect(deckOrderCount).toBeGreaterThan(0);
    expect(deckOrderCount).toBeLessThan(runs); // not EVERY presentation is deck order
  });

  it('non-mcq cards get no choices and never invoke the rng', () => {
    const recall: StoredCard = {
      id: 'card-yyyy', format: 'recall', category: 'net', tags: [],
      prompt: 'Explain', citations: [], tombstoned: false,
      source: { path: 'vault/a.md', block: 'card-yyyy' }
    };
    let called = false;
    const rng = () => { called = true; return 0; };
    const result = getPresentationChoices(recall, null, 0, rng);
    expect(result.choices).toEqual([]);
    expect(called).toBe(false);
  });
});

describe('a single card presentation renders a stable order across both renders', () => {
  it('unrevealed and revealed HTML list choices in the same order', () => {
    const rng = mulberry32(11);
    const presentation = getPresentationChoices(mcqCard, null, 0, rng);
    const unrevealedHtml = renderActions(mcqCard, false, presentation.choices);
    // Same presentation reused for the revealed render (as review.ts does).
    const revealedHtml = renderActions(mcqCard, true, presentation.choices);

    const extractOrder = (html: string): string[] =>
      [...html.matchAll(/data-choice="(\d+)" data-correct="(?:true|false)"[^>]*>\s*([^<]+?)\s*</g)]
        .sort((a, b) => Number(a[1]) - Number(b[1]))
        .map((m) => m[2] as string);

    expect(extractOrder(revealedHtml)).toEqual(extractOrder(unrevealedHtml));
  });
});

describe('highlightClasses', () => {
  it('marks the correct choice regardless of its position', () => {
    // Correct answer shuffled to index 2 instead of its deck position of 0.
    const shuffled = [mcqCard.choices![1]!, mcqCard.choices![2]!, mcqCard.choices![0]!];
    const classes = highlightClasses(shuffled, /* tappedIndex */ 0);
    expect(classes[2]).toBe('is-correct'); // correct choice, wherever it landed
    expect(classes[0]).toBe('is-wrong'); // the wrong one the user actually tapped
    expect(classes[1]).toBeNull();
  });

  it('marks the tapped choice as wrong even when it is not first', () => {
    const shuffled = [mcqCard.choices![0]!, mcqCard.choices![2]!, mcqCard.choices![1]!];
    // User tapped the button that rendered at index 1 ("Data link"), not index 0.
    const classes = highlightClasses(shuffled, 1);
    expect(classes[1]).toBe('is-wrong');
    expect(classes[0]).toBe('is-correct');
    expect(classes[2]).toBeNull();
  });

  it('does not mark a wrong choice when the user tapped the correct one', () => {
    const shuffled = [mcqCard.choices![1]!, mcqCard.choices![0]!, mcqCard.choices![2]!];
    const classes = highlightClasses(shuffled, 1); // tapped index 1 = the correct choice
    expect(classes).toEqual([null, 'is-correct', null]);
    expect(classes.filter((c) => c === 'is-wrong')).toHaveLength(0);
  });
});

describe('grading correctness is unaffected by shuffling', () => {
  it('data-correct on the rendered button matches the choice, not the original index', () => {
    const rng = mulberry32(3);
    const presentation = getPresentationChoices(mcqCard, null, 0, rng);
    const html = renderActions(mcqCard, false, presentation.choices);
    const buttons = [...html.matchAll(/data-choice="(\d+)" data-correct="(true|false)"/g)];
    for (const [, choiceIndexStr, correctStr] of buttons) {
      const choiceIndex = Number(choiceIndexStr);
      const expected = presentation.choices[choiceIndex]!.correct;
      expect(correctStr === 'true').toBe(expected);
    }
    // Exactly one correct button, no matter where the shuffle put it.
    const correctCount = buttons.filter(([, , correctStr]) => correctStr === 'true').length;
    expect(correctCount).toBe(1);
  });
});
