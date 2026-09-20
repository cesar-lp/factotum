import { describe, it, expect } from 'vitest';
import { summaryHtml, type RatingCounts } from '../src/ui/summary.js';

// vitest here runs under the `node` environment (no jsdom/`document`), same
// as review.ts's own DOM wiring — so, like renderPrompt/renderActions, only
// the pure string renderer (summaryHtml) is unit-tested; renderSummary's
// thin DOM wiring (innerHTML assignment, the Done click listener) is left
// to the browser-preview check.

function counts(overrides: Partial<RatingCounts> = {}): RatingCounts {
  return { again: 0, hard: 0, good: 0, easy: 0, ...overrides };
}

describe('summaryHtml', () => {
  it('shows cards reviewed, again-rate, and time spent', () => {
    const html = summaryHtml({ cardsReviewed: 10, timeSpentMs: 5 * 60_000, ratingCounts: counts({ again: 3, good: 7 }) });
    expect(html).toContain('10');
    expect(html).toContain('30%'); // 3/10 again
    expect(html).toContain('5m');
  });

  it('formats sub-minute durations in seconds', () => {
    const html = summaryHtml({ cardsReviewed: 1, timeSpentMs: 45_000, ratingCounts: counts({ good: 1 }) });
    expect(html).toContain('45s');
  });

  it('formats minute-plus durations in whole minutes', () => {
    const html = summaryHtml({ cardsReviewed: 1, timeSpentMs: 125_000, ratingCounts: counts({ good: 1 }) });
    expect(html).toContain('2m');
  });

  it('shows a per-rating breakdown with each count', () => {
    const html = summaryHtml({ cardsReviewed: 4, timeSpentMs: 60_000, ratingCounts: { again: 1, hard: 2, good: 3, easy: 4 } });
    for (const [label, count] of [
      ['Again', 1],
      ['Hard', 2],
      ['Good', 3],
      ['Easy', 4]
    ] as const) {
      expect(html).toContain(label);
      expect(html).toContain(String(count));
    }
  });

  it('again-rate is 0% for a session with no reviews, not NaN or Infinity', () => {
    const html = summaryHtml({ cardsReviewed: 0, timeSpentMs: 0, ratingCounts: counts() });
    expect(html).toContain('0%');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  });

  it('renders exactly one button, labelled Done', () => {
    const html = summaryHtml({ cardsReviewed: 1, timeSpentMs: 1000, ratingCounts: counts({ good: 1 }) });
    expect((html.match(/<button/g) ?? [])).toHaveLength(1);
    expect(html).toContain('data-role="done"');
    expect(html).toContain('>Done<');
  });
});
