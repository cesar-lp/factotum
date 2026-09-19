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
  type Outcome
} from '../src/scheduler/fsrs.js';
import type { CardFormat } from '../../pipeline/src/types.js';

const now = new Date('2026-09-18T09:00:00Z');

describe('ratingFor', () => {
  it('maps machine-graded outcomes', () => {
    expect(ratingFor('mcq', 'correct')).toBe(Rating.Good);
    expect(ratingFor('mcq', 'wrong')).toBe(Rating.Again);
    expect(ratingFor('cloze', 'correct')).toBe(Rating.Good);
    expect(ratingFor('cloze', 'wrong')).toBe(Rating.Again);
  });

  it('passes self-graded outcomes through', () => {
    expect(ratingFor('qa', 'hard')).toBe(Rating.Hard);
    expect(ratingFor('recall', 'easy')).toBe(Rating.Easy);
  });

  it('maps every (format, outcome) pair to the exact expected rating', () => {
    const outcomes: Outcome[] = ['correct', 'wrong', 'again', 'hard', 'good', 'easy'];
    const selfGradedExpected: Record<Outcome, Rating> = {
      correct: Rating.Good,
      wrong: Rating.Again,
      again: Rating.Again,
      hard: Rating.Hard,
      good: Rating.Good,
      easy: Rating.Easy
    };

    const machineGraded: CardFormat[] = ['mcq', 'cloze'];
    const selfGraded: CardFormat[] = ['qa', 'recall'];

    for (const format of machineGraded) {
      for (const outcome of outcomes) {
        // Machine-graded formats only ever recognize 'correct' as a pass;
        // every other outcome value must fail the card.
        expect(ratingFor(format, outcome)).toBe(outcome === 'correct' ? Rating.Good : Rating.Again);
      }
    }

    for (const format of selfGraded) {
      for (const outcome of outcomes) {
        expect(ratingFor(format, outcome)).toBe(selfGradedExpected[outcome]);
      }
    }

    // The critical regression cases: a wrong answer on a self-graded card must
    // never be recorded as a passing grade.
    expect(ratingFor('qa', 'wrong')).toBe(Rating.Again);
    expect(ratingFor('recall', 'wrong')).toBe(Rating.Again);
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
