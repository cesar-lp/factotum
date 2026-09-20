import type { FactotumDb } from './schema.js';
import { dayKey, DAY_START_HOUR } from '../scheduler/queue.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The real-time [start, end) window a `dayKey` bucket spans, computed from
 * any Date that falls inside it. Built the same way `dayKey` derives the
 * bucket itself (shift back by the day-start hour, floor to midnight, shift
 * forward again) so the two never disagree about where a day begins.
 */
function dayWindow(at: Date): { start: number; end: number } {
  const shifted = new Date(at.getTime());
  shifted.setHours(shifted.getHours() - DAY_START_HOUR);
  const startOfShifted = new Date(shifted.getFullYear(), shifted.getMonth(), shifted.getDate(), 0, 0, 0, 0);
  const start = new Date(startOfShifted.getTime());
  start.setHours(start.getHours() + DAY_START_HOUR);
  return { start: start.getTime(), end: start.getTime() + DAY_MS };
}

/** A minimal view of a `ReviewLogEntry` -- only the field the stats below
 * actually need, so the pure functions can be tested with plain objects
 * instead of full log entries or a database. */
export interface StatsEntry {
  ts: number;
}

/**
 * How far back `getStreak` will look before giving up. A review-log entry
 * costs a few dozen bytes, so even a multi-year daily streak is a small,
 * boundedly-sized query -- comfortably short of a full-table scan, but
 * generous enough that no realistic streak is ever truncated.
 */
const STREAK_LOOKBACK_DAYS = 3650;

/**
 * Consecutive days with at least one review, counted back from `now`,
 * using the same day boundary as `dayKey` (a review just after midnight
 * still belongs to "yesterday" until the day-start hour).
 *
 * Two edge cases worth being explicit about:
 *
 * - A day with zero reviews breaks the chain immediately at that day --
 *   activity further back does not "reach through" the gap. Reviewing
 *   today and the day before yesterday, with nothing yesterday, is a
 *   streak of 1 (today alone), not 3.
 *
 * - Today does NOT need a review yet for the streak to reflect yesterday's
 *   count. If today has no review, counting starts at yesterday instead of
 *   today, so the display doesn't drop to 0 every morning before the day's
 *   first review -- which would read as the app forgetting a streak the
 *   user actually has. The instant a day is skipped entirely (i.e. this
 *   function is evaluated the following day with still nothing recorded
 *   for the skipped day), the chain breaks as above.
 */
export function computeStreak(entries: StatsEntry[], now: Date): number {
  const days = new Set(entries.map((e) => dayKey(new Date(e.ts))));

  const todayKey = dayKey(now);
  const startOffset = days.has(todayKey) ? 0 : 1;

  let streak = 0;
  for (let offset = startOffset; offset < STREAK_LOOKBACK_DAYS; offset++) {
    const at = new Date(now.getTime() - offset * DAY_MS);
    if (!days.has(dayKey(at))) break;
    streak++;
  }
  return streak;
}

export interface DayCount {
  dayKey: string;
  count: number;
}

/**
 * Per-day review counts for the last 7 days (today inclusive), oldest
 * first, so callers can render them left-to-right as a bar row.
 */
export function computeLastSevenDays(entries: StatsEntry[], now: Date): DayCount[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const key = dayKey(new Date(e.ts));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const result: DayCount[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const at = new Date(now.getTime() - offset * DAY_MS);
    const key = dayKey(at);
    result.push({ dayKey: key, count: counts.get(key) ?? 0 });
  }
  return result;
}

/**
 * Reads just enough of `reviewLog` via its `ts` index to compute the
 * streak -- a bounded range query, not `getAll()` over the whole store.
 * `STREAK_LOOKBACK_DAYS` bounds the range to a few years back at most,
 * which is a small fraction of a log that can otherwise grow forever.
 */
export async function getStreak(db: FactotumDb, now: Date): Promise<number> {
  const rangeStart = now.getTime() - STREAK_LOOKBACK_DAYS * DAY_MS;
  const { end } = dayWindow(now);
  const range = IDBKeyRange.bound(rangeStart, end, false, true);
  const entries = await db.getAllFromIndex('reviewLog', 'ts', range);
  return computeStreak(entries, now);
}

/**
 * Reads just the last 7 days of `reviewLog` via its `ts` index -- again a
 * bounded range, not a full scan -- and buckets them by day.
 */
export async function getLastSevenDays(db: FactotumDb, now: Date): Promise<DayCount[]> {
  const { end } = dayWindow(now);
  const { start } = dayWindow(new Date(now.getTime() - 6 * DAY_MS));
  const range = IDBKeyRange.bound(start, end, false, true);
  const entries = await db.getAllFromIndex('reviewLog', 'ts', range);
  return computeLastSevenDays(entries, now);
}
