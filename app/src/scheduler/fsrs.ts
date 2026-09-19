import { fsrs, generatorParameters, createEmptyCard, Rating, State, type Card as FsrsCard, type Grade } from 'ts-fsrs';
import type { CardFormat } from '../../../pipeline/src/types.js';
import type { ReviewState } from '../db/schema.js';

export type Outcome = 'correct' | 'wrong' | 'again' | 'hard' | 'good' | 'easy';

export const LEECH_THRESHOLD = 8;

export function ratingFor(format: CardFormat, outcome: Outcome): Rating {
  if (format === 'mcq' || format === 'cloze') {
    return outcome === 'correct' ? Rating.Good : Rating.Again;
  }
  switch (outcome) {
    case 'again':
      return Rating.Again;
    case 'hard':
      return Rating.Hard;
    case 'good':
      return Rating.Good;
    case 'easy':
      return Rating.Easy;
    case 'correct':
      return Rating.Good;
    case 'wrong':
      return Rating.Again;
    default: {
      const exhaustive: never = outcome;
      throw new Error(`Unhandled outcome: ${String(exhaustive)}`);
    }
  }
}

export function initialState(cardId: string, now: Date): ReviewState {
  const empty = createEmptyCard(now);
  return {
    cardId,
    due: empty.due.getTime(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsedDays: empty.elapsed_days,
    scheduledDays: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    state: empty.state,
    lastReview: null,
    suspended: false,
    flagged: false
  };
}

function toFsrsCard(state: ReviewState): FsrsCard {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as State,
    last_review: state.lastReview !== null ? new Date(state.lastReview) : undefined
  };
}

export function applyRating(
  state: ReviewState,
  rating: Rating,
  now: Date,
  desiredRetention: number
): ReviewState {
  if (rating === Rating.Manual) {
    throw new Error('Rating.Manual is not a valid grade for applyRating');
  }
  const scheduler = fsrs(generatorParameters({ request_retention: desiredRetention }));
  const { card } = scheduler.next(toFsrsCard(state), now, rating satisfies Grade);

  const next: ReviewState = {
    ...state,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: now.getTime()
  };

  if (next.lapses >= LEECH_THRESHOLD) {
    next.suspended = true;
    next.flagged = true;
  }
  return next;
}

export function isDue(state: ReviewState, now: Date): boolean {
  return !state.suspended && state.due <= now.getTime();
}
