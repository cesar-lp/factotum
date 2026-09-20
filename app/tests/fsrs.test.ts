import { describe, it, expect } from 'vitest';
import { Rating } from 'ts-fsrs';
import {
  ratingFor,
  initialState,
  applyRating,
  isDue,
  isStillLearning,
  failureCount,
  isLeech,
  LEECH_THRESHOLD,
  previewIntervals,
  formatInterval,
  type Outcome,
  type IntervalPreview
} from '../src/scheduler/fsrs.js';
import type { CardFormat } from '../../pipeline/src/types.js';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 12 * MONTH_MS;

// Parses a formatInterval label back to milliseconds, so ordering
// assertions can compare magnitudes across unit boundaries (e.g. "50m" vs
// "2h") rather than doing a meaningless lexicographic string comparison.
function labelToMs(label: string): number {
  const match = /^(\d+)(mo|m|h|d|y)$/.exec(label);
  if (!match) throw new Error(`Unparseable interval label: ${label}`);
  const [, digits, unit] = match;
  const n = Number(digits);
  switch (unit) {
    case 'm':
      return n * MINUTE_MS;
    case 'h':
      return n * HOUR_MS;
    case 'd':
      return n * DAY_MS;
    case 'mo':
      return n * MONTH_MS;
    case 'y':
      return n * YEAR_MS;
    default:
      throw new Error(`Unhandled unit: ${unit}`);
  }
}

// The unit-rollover thresholds that formatInterval must never reach: a
// label's numeric part must always be strictly below the count of that
// unit that makes up one of the next unit up (60m -> 1h, not "60m").
const ROLLOVERS: Record<string, number> = { m: 60, h: 24, d: 30, mo: 12 };

const now = new Date('2026-09-18T09:00:00Z');

describe('ratingFor', () => {
  it('maps machine-graded outcomes', () => {
    expect(ratingFor('correct')).toBe(Rating.Good);
    expect(ratingFor('wrong')).toBe(Rating.Again);
  });

  it('passes self-graded outcomes through', () => {
    expect(ratingFor('hard')).toBe(Rating.Hard);
    expect(ratingFor('easy')).toBe(Rating.Easy);
  });

  /**
   * Regression test for a bug the review-screen redesign made visible: a
   * prior version special-cased `format === 'mcq' || format === 'cloze'`
   * BEFORE looking at the outcome at all, which collapsed a self-graded
   * cloze's Hard/Good/Easy tap (the "Show answer" rating row) down to
   * Again -- every outcome except the literal string 'correct' failed the
   * card, including 'easy'. ratingFor is now format-independent (see its
   * doc comment for why that's safe): this pins the full outcome ->
   * rating mapping once, and then re-asserts it holds for every
   * CardFormat, since the whole point of the fix is that format must be
   * irrelevant to the result.
   */
  it('maps every outcome to the exact expected rating, independent of format', () => {
    const expected: Record<Outcome, Rating> = {
      correct: Rating.Good,
      wrong: Rating.Again,
      again: Rating.Again,
      hard: Rating.Hard,
      good: Rating.Good,
      easy: Rating.Easy
    };
    const outcomes = Object.keys(expected) as Outcome[];
    const formats: CardFormat[] = ['mcq', 'cloze', 'qa', 'recall'];

    for (const outcome of outcomes) {
      expect(ratingFor(outcome)).toBe(expected[outcome]);
    }

    // Pinned anyway per the redesign's instructions, even though mcq never
    // renders a rating row today (it only ever produces 'correct'/'wrong')
    // and so this row of the matrix is currently unreachable in the UI.
    for (const format of formats) {
      void format; // ratingFor no longer takes a format argument at all.
      for (const outcome of outcomes) {
        expect(ratingFor(outcome)).toBe(expected[outcome]);
      }
    }

    // The critical regression case this bug was about: a self-graded cloze
    // (or qa/recall) rated Easy/Good/Hard must never be recorded as Again.
    expect(ratingFor('easy')).not.toBe(Rating.Again);
    expect(ratingFor('good')).not.toBe(Rating.Again);
    expect(ratingFor('hard')).not.toBe(Rating.Again);
  });
});

describe('applyRating', () => {
  it('schedules a new card into the future on Good', () => {
    const next = applyRating(initialState('card-aaaa', now), Rating.Good, now, 0.9);
    expect(next.due).toBeGreaterThan(now.getTime());
    expect(next.reps).toBe(1);
    expect(next.stability).toBeGreaterThan(0);
  });

  it('counts a lapse on Again for a previously learned card', () => {
    let state = initialState('card-aaaa', now);
    state = applyRating(state, Rating.Easy, now, 0.9);
    const lapsed = applyRating(state, Rating.Again, new Date(state.due), 0.9);
    expect(lapsed.lapses).toBe(1);
  });

  it('suspends and flags a card at the leech threshold', () => {
    let state = { ...initialState('card-aaaa', now), lapses: LEECH_THRESHOLD - 1, reps: 20, state: 2 };
    state = applyRating(state, Rating.Again, now, 0.9);
    expect(state.lapses).toBe(LEECH_THRESHOLD);
    expect(state.suspended).toBe(true);
    expect(state.flagged).toBe(true);
  });

  it('keeps an already-suspended leech suspended and flagged even on a Good rating', () => {
    const state = {
      ...initialState('card-aaaa', now),
      lapses: LEECH_THRESHOLD,
      reps: 20,
      state: 2,
      suspended: true,
      flagged: true
    };
    const next = applyRating(state, Rating.Good, now, 0.9);
    expect(next.suspended).toBe(true);
    expect(next.flagged).toBe(true);
  });
});

describe('isDue', () => {
  it('is true when due has passed and the card is not suspended', () => {
    const state = { ...initialState('card-aaaa', now), due: now.getTime() - 1000 };
    expect(isDue(state, now)).toBe(true);
    expect(isDue({ ...state, suspended: true }, now)).toBe(false);
  });
});

describe('isStillLearning', () => {
  // State numbering per ts-fsrs: New=0, Learning=1, Review=2, Relearning=3.
  it('is true for a brand-new card rated Again/Hard/Good (stays in Learning)', () => {
    for (const rating of [Rating.Again, Rating.Hard, Rating.Good]) {
      const next = applyRating(initialState('card-aaaa', now), rating, now, 0.9);
      expect(next.state).toBe(1);
      expect(isStillLearning(next)).toBe(true);
    }
  });

  it('is false for a brand-new card rated Easy (graduates straight to Review)', () => {
    const next = applyRating(initialState('card-aaaa', now), Rating.Easy, now, 0.9);
    expect(next.state).toBe(2);
    expect(isStillLearning(next)).toBe(false);
  });

  it('is true for a graduated card that lapses back into Relearning', () => {
    let state = applyRating(initialState('card-aaaa', now), Rating.Easy, now, 0.9);
    state = applyRating(state, Rating.Again, new Date(state.due), 0.9);
    expect(state.state).toBe(3);
    expect(isStillLearning(state)).toBe(true);
  });

  it('is false once a card is fully graduated (Review) and not lapsing', () => {
    const state = { ...initialState('card-aaaa', now), state: 2 };
    expect(isStillLearning(state)).toBe(false);
  });

  it('repeated Again on a fresh card never increments FSRS lapses, but now trips the leech guard via learningFailures', () => {
    let state = initialState('card-aaaa', now);
    let now2 = now;
    for (let i = 0; i < 15; i++) {
      state = applyRating(state, Rating.Again, now2, 0.9);
      now2 = new Date(state.due);
    }
    // ts-fsrs fact, unchanged and still worth pinning: lapses never
    // increments for a card stuck in initial Learning.
    expect(state.lapses).toBe(0);
    // But learningFailures now counts these Agains, so the card DOES
    // suspend -- closing the cross-session leech gap.
    expect(state.suspended).toBe(true);
    expect(state.flagged).toBe(true);
    expect(isStillLearning(state)).toBe(true);
  });
});

describe('failureCount / isLeech', () => {
  it('suspends and flags after 8 consecutive Again ratings on a fresh card that never graduates', () => {
    let state = initialState('card-aaaa', now);
    let now2 = now;
    for (let i = 0; i < 8; i++) {
      state = applyRating(state, Rating.Again, now2, 0.9);
      now2 = new Date(state.due);
    }
    expect(state.lapses).toBe(0);
    expect(state.suspended).toBe(true);
    expect(state.flagged).toBe(true);
  });

  it('does NOT suspend after only 7 consecutive Again ratings on a fresh card', () => {
    let state = initialState('card-aaaa', now);
    let now2 = now;
    for (let i = 0; i < 7; i++) {
      state = applyRating(state, Rating.Again, now2, 0.9);
      now2 = new Date(state.due);
    }
    expect(state.suspended).toBe(false);
    expect(state.flagged).toBe(false);
  });

  it('sums learning failures and real lapses toward one shared threshold of 8', () => {
    // 4 Again ratings while stuck in Learning (learningFailures accrues,
    // lapses stays 0).
    let state = initialState('card-aaaa', now);
    let now2 = now;
    for (let i = 0; i < 4; i++) {
      state = applyRating(state, Rating.Again, now2, 0.9);
      now2 = new Date(state.due);
    }
    expect(state.learningFailures).toBe(4);
    expect(state.lapses).toBe(0);
    expect(state.suspended).toBe(false);

    // Graduate the card out of Learning.
    state = applyRating(state, Rating.Easy, now2, 0.9);
    now2 = new Date(state.due);
    expect(state.state).toBe(2);

    // 3 real lapses (Review -> Again -> Relearning) don't yet trip the
    // threshold (4 + 3 = 7).
    for (let i = 0; i < 3; i++) {
      state = applyRating(state, Rating.Again, now2, 0.9);
      now2 = new Date(state.due);
      // Re-graduate so the next Again is a fresh Review->lapse, not a
      // Relearning->Again (which FSRS also declines to charge as a lapse).
      state = applyRating(state, Rating.Easy, now2, 0.9);
      now2 = new Date(state.due);
    }
    expect(state.lapses).toBe(3);
    expect(state.learningFailures).toBe(4);
    expect(failureCount(state)).toBe(7);
    expect(state.suspended).toBe(false);

    // The 8th failure (a real lapse) trips the shared threshold.
    state = applyRating(state, Rating.Again, now2, 0.9);
    expect(state.lapses).toBe(4);
    expect(state.learningFailures).toBe(4);
    expect(failureCount(state)).toBe(8);
    expect(isLeech(state)).toBe(true);
    expect(state.suspended).toBe(true);
    expect(state.flagged).toBe(true);
  });

  it('does not increment learningFailures on a non-Again rating during learning', () => {
    let state = initialState('card-aaaa', now);
    state = applyRating(state, Rating.Hard, now, 0.9);
    expect(state.learningFailures).toBe(0);
    state = applyRating(state, Rating.Good, new Date(state.due), 0.9);
    expect(state.learningFailures).toBe(0);
  });

  it('a genuine Review->Again lapse increments lapses and leaves learningFailures alone', () => {
    let state = applyRating(initialState('card-aaaa', now), Rating.Easy, now, 0.9);
    expect(state.state).toBe(2);
    const lapsed = applyRating(state, Rating.Again, new Date(state.due), 0.9);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.learningFailures).toBe(0);
  });

  it('treats an absent learningFailures field (a record already on disk) as zero and still trips the leech rule on lapses alone', () => {
    const state = {
      ...initialState('card-aaaa', now),
      lapses: LEECH_THRESHOLD - 1,
      reps: 20,
      state: 2
    };
    delete (state as { learningFailures?: number }).learningFailures;
    expect(state.learningFailures).toBeUndefined();

    const next = applyRating(state, Rating.Again, now, 0.9);
    expect(next.lapses).toBe(LEECH_THRESHOLD);
    expect(next.suspended).toBe(true);
    expect(next.flagged).toBe(true);
  });

  // SECOND, DISTINCT flavor of the same gap: this is NOT the "never
  // graduates" case above. Here the card DOES graduate and DOES lapse once
  // (lapses=1), but then gets stuck failing its relearning steps
  // (State.Relearning) without ever re-graduating. FSRS charges a lapse
  // only on the Review->Again transition, not on repeated Relearning->Again,
  // so `lapses` freezes at 1 forever -- this path was just as immune to the
  // leech rule as the initial-Learning case, before learningFailures.
  it('a graduated card stuck failing its relearning steps (lapses frozen, never re-graduating) also trips the leech guard via learningFailures', () => {
    let state = applyRating(initialState('card-aaaa', now), Rating.Easy, now, 0.9);
    expect(state.state).toBe(2);
    let now2 = new Date(state.due);

    // One real lapse: Review -> Again -> Relearning.
    state = applyRating(state, Rating.Again, now2, 0.9);
    now2 = new Date(state.due);
    expect(state.state).toBe(3);
    expect(state.lapses).toBe(1);

    // Keep failing the relearning steps WITHOUT re-graduating: 6 more
    // Agains (total failures so far: 1 lapse + 6 learningFailures = 7).
    for (let i = 0; i < 6; i++) {
      state = applyRating(state, Rating.Again, now2, 0.9);
      now2 = new Date(state.due);
    }
    // ts-fsrs fact this rests on, the direct analogue of `lapses === 0`
    // pinned for the initial-Learning case: lapses stays frozen at 1 while
    // stuck in Relearning.
    expect(state.state).toBe(3);
    expect(state.lapses).toBe(1);
    expect(state.learningFailures).toBe(6);
    expect(failureCount(state)).toBe(7);
    expect(state.suspended).toBe(false);

    // The 8th failure (still an uncounted Relearning->Again) trips the
    // shared threshold.
    state = applyRating(state, Rating.Again, now2, 0.9);
    expect(state.lapses).toBe(1);
    expect(state.learningFailures).toBe(7);
    expect(failureCount(state)).toBe(8);
    expect(isLeech(state)).toBe(true);
    expect(state.suspended).toBe(true);
    expect(state.flagged).toBe(true);
  });
});

describe('formatInterval', () => {
  it('formats sub-hour gaps in minutes', () => {
    expect(formatInterval(0)).toBe('0m');
    expect(formatInterval(10 * MINUTE_MS)).toBe('10m');
    expect(formatInterval(59 * MINUTE_MS)).toBe('59m');
  });

  it('formats the minute/hour boundary', () => {
    // Just under an hour still rounds to 60 whole minutes, which must
    // promote to "1h" rather than print the out-of-range "60m".
    expect(formatInterval(60 * MINUTE_MS - 1)).toBe('1h');
    expect(formatInterval(HOUR_MS)).toBe('1h');
  });

  it('formats sub-day gaps in hours', () => {
    expect(formatInterval(4 * HOUR_MS)).toBe('4h');
    expect(formatInterval(23 * HOUR_MS)).toBe('23h');
  });

  it('formats the hour/day boundary', () => {
    // Just under a day rounds to 24 whole hours, which must promote to
    // "1d" rather than print the out-of-range "24h".
    expect(formatInterval(24 * HOUR_MS - 1)).toBe('1d');
    expect(formatInterval(DAY_MS)).toBe('1d');
  });

  it('formats sub-month gaps in days', () => {
    expect(formatInterval(3 * DAY_MS)).toBe('3d');
    expect(formatInterval(29 * DAY_MS)).toBe('29d');
  });

  it('formats the day/month boundary', () => {
    // Just under a month rounds to 30 whole days, which must promote to
    // "1mo" rather than print the out-of-range "30d".
    expect(formatInterval(30 * DAY_MS - 1)).toBe('1mo');
    expect(formatInterval(MONTH_MS)).toBe('1mo');
  });

  it('formats multi-month gaps in months', () => {
    expect(formatInterval(2 * MONTH_MS)).toBe('2mo');
    expect(formatInterval(9 * MONTH_MS)).toBe('9mo');
  });

  it('formats the month/year boundary', () => {
    // Just under a year rounds to 12 whole months, which must promote to
    // "1y" rather than print the out-of-range "12mo".
    expect(formatInterval(YEAR_MS - 1)).toBe('1y');
    expect(formatInterval(YEAR_MS)).toBe('1y');
  });

  it('formats multi-year gaps in years, with no ceiling to promote past', () => {
    expect(formatInterval(2 * YEAR_MS)).toBe('2y');
    expect(formatInterval(50 * YEAR_MS)).toBe('50y');
  });

  it('rounds to the nearest unit rather than flooring', () => {
    // 59.6 minutes is closer to 60m than 59m -- and 60m immediately
    // promotes to the next unit, per the boundary tests above.
    expect(formatInterval(59.6 * MINUTE_MS)).toBe('1h');
  });

  it('floors a non-positive gap to 0m instead of going negative', () => {
    // Reachable: a card whose due date has already passed (e.g. a review
    // session re-rating a card that was missed) yields due - now <= 0.
    expect(formatInterval(-1000)).toBe('0m');
    expect(formatInterval(0)).toBe('0m');
  });

  it('never emits a number at or above its unit\'s rollover, across a spread spanning all five tiers', () => {
    // Property-style sweep: for many durations from a minute out to a
    // century, in both round-number and deliberately-awkward fractional
    // forms, the parsed-back number must always be strictly below the
    // threshold at which that unit promotes to the next one up. This is
    // the general form of the exact bug the hand-picked boundary tests
    // above pin: rounding inside a tier chosen from raw ms can reach that
    // tier's rollover, and the formatter must re-promote when it does.
    const samples: number[] = [];
    for (let n = 1; n <= 400; n++) {
      samples.push(n * MINUTE_MS);
      samples.push(n * MINUTE_MS - 0.4 * MINUTE_MS);
      samples.push(n * HOUR_MS);
      samples.push(n * HOUR_MS - 0.4 * HOUR_MS);
      samples.push(n * DAY_MS);
      samples.push(n * DAY_MS - 0.4 * DAY_MS);
      samples.push(n * MONTH_MS - 0.4 * MONTH_MS);
      samples.push(n * YEAR_MS - 0.4 * YEAR_MS);
    }

    for (const ms of samples) {
      if (ms <= 0) continue;
      const label = formatInterval(ms);
      const match = /^(\d+)(mo|m|h|d|y)$/.exec(label);
      expect(match, `unparseable label "${label}" for ${ms}ms`).not.toBeNull();
      const [, digits, unit] = match!;
      if (digits === undefined || unit === undefined) throw new Error(`Bad match for "${label}"`);
      const rollover = ROLLOVERS[unit];
      if (rollover !== undefined) {
        expect(
          Number(digits),
          `"${label}" for ${ms}ms reached or exceeded the ${unit} rollover of ${rollover}`
        ).toBeLessThan(rollover);
      }
    }
  });
});

describe('previewIntervals', () => {
  it('returns the four labels ordered again <= hard <= good <= easy', () => {
    const state = initialState('card-aaaa', now);
    const preview = previewIntervals(state, now, 0.9);
    const again = labelToMs(preview.again);
    const hard = labelToMs(preview.hard);
    const good = labelToMs(preview.good);
    const easy = labelToMs(preview.easy);
    expect(again).toBeLessThanOrEqual(hard);
    expect(hard).toBeLessThanOrEqual(good);
    expect(good).toBeLessThanOrEqual(easy);
  });

  it('holds the ordering for a graduated Review-state card too', () => {
    const state = applyRating(initialState('card-aaaa', now), Rating.Easy, now, 0.9);
    const later = new Date(state.due);
    const preview = previewIntervals(state, later, 0.9);
    const again = labelToMs(preview.again);
    const hard = labelToMs(preview.hard);
    const good = labelToMs(preview.good);
    const easy = labelToMs(preview.easy);
    expect(again).toBeLessThanOrEqual(hard);
    expect(hard).toBeLessThanOrEqual(good);
    expect(good).toBeLessThanOrEqual(easy);
  });

  it('does not mutate the state it is given', () => {
    const state = initialState('card-aaaa', now);
    const snapshot = JSON.parse(JSON.stringify(state));
    previewIntervals(state, now, 0.9);
    expect(state).toEqual(snapshot);
  });

  it('agrees with what applyRating actually does for each rating', () => {
    const ratings: { grade: Rating; key: keyof ReturnType<typeof previewIntervals> }[] = [
      { grade: Rating.Again, key: 'again' },
      { grade: Rating.Hard, key: 'hard' },
      { grade: Rating.Good, key: 'good' },
      { grade: Rating.Easy, key: 'easy' }
    ];

    for (const { grade, key } of ratings) {
      const state = initialState('card-aaaa', now);
      const preview = previewIntervals(state, now, 0.9);
      const actual = applyRating(state, grade, now, 0.9);
      expect(formatInterval(actual.due - now.getTime())).toBe(preview[key]);
    }
  });

  it('agrees with applyRating on a previously-reviewed, graduated card as well', () => {
    const base = applyRating(initialState('card-aaaa', now), Rating.Good, now, 0.9);
    const later = new Date(base.due);
    const preview = previewIntervals(base, later, 0.9);
    const actual = applyRating(base, Rating.Good, later, 0.9);
    expect(formatInterval(actual.due - later.getTime())).toBe(preview.good);
  });

  /**
   * The property that was actually broken by the ratingFor bug (see
   * fsrs.test.ts's ratingFor describe block): a rating button's displayed
   * interval must match the interval the card ACTUALLY gets once that
   * exact button is tapped, going through the SAME path review.ts does --
   * ratingFor(outcome) then applyRating -- rather than asserting the two
   * halves (previewIntervals' labels, and applyRating's own behaviour)
   * separately and trusting they compose correctly. Covers every Outcome
   * review.ts can ever send to submit(), for every card format: the
   * mapping is format-independent, but this still iterates formats to
   * pin that a card's format genuinely has no bearing on the result.
   */
  it('a rating button never lies: the outcome each button sends produces exactly the interval it displayed', () => {
    const outcomeToPreviewKey: Record<Outcome, keyof ReturnType<typeof previewIntervals>> = {
      again: 'again',
      hard: 'hard',
      good: 'good',
      easy: 'easy',
      correct: 'good',
      wrong: 'again'
    };
    const formats: CardFormat[] = ['qa', 'recall', 'cloze', 'mcq'];

    for (const format of formats) {
      for (const [outcome, previewKey] of Object.entries(outcomeToPreviewKey) as [Outcome, keyof IntervalPreview][]) {
        const state = initialState(`card-${format}-${outcome}`, now);
        const preview = previewIntervals(state, now, 0.9);
        const actual = applyRating(state, ratingFor(outcome), now, 0.9);
        expect(
          formatInterval(actual.due - now.getTime()),
          `format=${format} outcome=${outcome}: button showed "${preview[previewKey]}" but tapping it actually scheduled "${formatInterval(actual.due - now.getTime())}"`
        ).toBe(preview[previewKey]);
      }
    }
  });
});
