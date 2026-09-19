import { describe, it, expect } from 'vitest';
import { Rating } from 'ts-fsrs';
import {
  ratingFor,
  initialState,
  applyRating,
  isDue,
  isStillLearning,
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

  it('repeated Again on a fresh card never trips the leech/lapses counter (documents why a separate session cap is needed)', () => {
    let state = initialState('card-aaaa', now);
    let now2 = now;
    for (let i = 0; i < 15; i++) {
      state = applyRating(state, Rating.Again, now2, 0.9);
      now2 = new Date(state.due);
    }
    expect(state.lapses).toBe(0);
    expect(state.suspended).toBe(false);
    expect(isStillLearning(state)).toBe(true);
  });
});
