import { describe, it, expect } from 'vitest';
import { Rating } from 'ts-fsrs';
import { ratingFor, initialState, applyRating, isDue, LEECH_THRESHOLD } from '../src/scheduler/fsrs.js';

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
});

describe('isDue', () => {
  it('is true when due has passed and the card is not suspended', () => {
    const state = { ...initialState('card-aaaa', now), due: now.getTime() - 1000 };
    expect(isDue(state, now)).toBe(true);
    expect(isDue({ ...state, suspended: true }, now)).toBe(false);
  });
});
