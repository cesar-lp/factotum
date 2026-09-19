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
    flagged: false,
    learningFailures: 0
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

  // FSRS only increments `lapses` when a card that has graduated to Review
  // lapses back out. An Again rated while the card is still in its initial
  // Learning steps (or Relearning) leaves `lapses` untouched -- the card
  // can be failed forever without FSRS ever charging it. Detect that gap
  // BEHAVIORALLY, by asking FSRS what it actually did (`card.lapses ===
  // state.lapses` despite an Again), rather than re-deriving "which states
  // charge a lapse" ourselves from State.Learning/State.Relearning. If
  // ts-fsrs ever changes when it charges a lapse, this stays correct and
  // can never double-count.
  const failedWithoutLapse = rating === Rating.Again && card.lapses === state.lapses;

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
    lastReview: now.getTime(),
    learningFailures: (state.learningFailures ?? 0) + (failedWithoutLapse ? 1 : 0)
  };

  if (isLeech(next)) {
    next.suspended = true;
    next.flagged = true;
  }
  return next;
}

/**
 * Total times a card has been failed: real FSRS lapses (a graduated card
 * rated Again) plus learning failures (an Again FSRS declined to charge as
 * a lapse). This is what spec section 5's "a card failed 8 times" means.
 */
export function failureCount(state: ReviewState): number {
  return state.lapses + (state.learningFailures ?? 0);
}

export function isLeech(state: ReviewState): boolean {
  return failureCount(state) >= LEECH_THRESHOLD;
}

export function isDue(state: ReviewState, now: Date): boolean {
  return !state.suspended && state.due <= now.getTime();
}

/**
 * True when a card is still inside its (re)learning steps -- FSRS state
 * Learning (a brand-new card working through its first steps) or
 * Relearning (a graduated card that lapsed and is working through its
 * relapse steps) -- rather than `due - now` against some arbitrary
 * threshold. Such a card is typically due minutes, not days, from now, so
 * it belongs back in the SAME session instead of surfacing later on the
 * dashboard. A card that reaches Review state has graduated and follows
 * the normal due-date flow.
 */
export function isStillLearning(state: ReviewState): boolean {
  return state.state === State.Learning || state.state === State.Relearning;
}
