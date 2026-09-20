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

export interface IntervalPreview {
  again: string;
  hard: string;
  good: string;
  easy: string;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 12 * MONTH_MS;

/**
 * Tiers, from smallest to largest, each with the unit ms and the count of
 * that unit at which a value must be promoted to the next tier instead of
 * printed as-is (e.g. 60 whole minutes is "1h", never "60m"). The last
 * tier (years) has no ceiling -- there is nothing bigger to promote into.
 */
const INTERVAL_TIERS: { unit: string; unitMs: number; rollover: number }[] = [
  { unit: 'm', unitMs: MINUTE_MS, rollover: 60 },
  { unit: 'h', unitMs: HOUR_MS, rollover: 24 },
  { unit: 'd', unitMs: DAY_MS, rollover: 30 },
  { unit: 'mo', unitMs: MONTH_MS, rollover: 12 },
  { unit: 'y', unitMs: YEAR_MS, rollover: Infinity }
];

/**
 * Formats a `due - now` gap compactly enough for a button label: "10m",
 * "4h", "3d", "2mo", "3y". Thresholds:
 *   - under 1 hour -> whole minutes ("10m")
 *   - under 1 day -> whole hours ("4h")
 *   - under 1 month (30 days) -> whole days ("3d")
 *   - under 1 year (12 30-day months, 360 days) -> whole months ("2mo")
 *   - 1 year or more -> whole years ("3y")
 *
 * Each bucket rounds to the nearest unit rather than flooring, so a gap a
 * hair under a boundary (e.g. 59.6 minutes) reads as the next unit ("1h")
 * instead of a confusing "59m" -- but the unit is picked from the RAW ms
 * first and then re-checked after rounding: rounding within a tier can
 * itself reach that tier's rollover (e.g. 59.6 minutes selects the minute
 * tier, rounds to 60, and must then promote to "1h" rather than printing
 * "60m"). The loop below keeps promoting until the rounded value is
 * strictly below the tier's rollover, so the emitted number is never equal
 * to or greater than the count of that unit in the next unit up.
 *
 * A non-positive gap (a card whose due date has already passed, e.g. one
 * being re-rated after being missed) floors to "0m" -- "due now" is the
 * honest label for a button whose preview can't distinguish "just due"
 * from "overdue by some amount", and "0m" reads unambiguously as that
 * rather than as a broken negative number.
 */
function tierAt(index: number): { unit: string; unitMs: number; rollover: number } {
  const tier = INTERVAL_TIERS[index];
  if (tier === undefined) throw new Error(`No interval tier at index ${index}`);
  return tier;
}

export function formatInterval(ms: number): string {
  if (ms <= 0) return '0m';

  let index = 0;
  if (ms >= YEAR_MS) index = 4;
  else if (ms >= MONTH_MS) index = 3;
  else if (ms >= DAY_MS) index = 2;
  else if (ms >= HOUR_MS) index = 1;

  let value = Math.round(ms / tierAt(index).unitMs);
  while (value >= tierAt(index).rollover && index < INTERVAL_TIERS.length - 1) {
    index += 1;
    value = Math.round(ms / tierAt(index).unitMs);
  }
  return `${value}${tierAt(index).unit}`;
}

/**
 * Previews the next-due interval for each of the four ratings, without
 * scheduling anything. Uses `fsrs().repeat()`, which computes all four
 * grades' resulting cards in a single call -- the same scheduler
 * construction as `applyRating` (`fsrs(generatorParameters({
 * request_retention: desiredRetention }))`), so the preview can never
 * disagree with what a subsequent real `applyRating` call actually does.
 * `state` is read-only here: `repeat()` is not `next()` and writes nothing
 * back, and `applyRating` remains the only function that produces a
 * schedule to persist.
 */
export function previewIntervals(
  state: ReviewState,
  now: Date,
  desiredRetention: number
): IntervalPreview {
  const scheduler = fsrs(generatorParameters({ request_retention: desiredRetention }));
  const recordLog = scheduler.repeat(toFsrsCard(state), now);
  const nowMs = now.getTime();
  return {
    again: formatInterval(recordLog[Rating.Again].card.due.getTime() - nowMs),
    hard: formatInterval(recordLog[Rating.Hard].card.due.getTime() - nowMs),
    good: formatInterval(recordLog[Rating.Good].card.due.getTime() - nowMs),
    easy: formatInterval(recordLog[Rating.Easy].card.due.getTime() - nowMs)
  };
}
