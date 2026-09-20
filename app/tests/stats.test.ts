import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/db/schema.js';
import { computeStreak, computeLastSevenDays, getStreak, getLastSevenDays } from '../src/db/stats.js';

beforeEach(() => { indexedDB = new IDBFactory(); });

// A fixed "now" that lands well after the 04:00 day-start cutoff, so it maps
// cleanly onto its own calendar day per `dayKey`.
const now = new Date('2026-09-20T12:00:00');

function entryAt(iso: string) {
  return { ts: new Date(iso).getTime() };
}

describe('computeStreak (pure)', () => {
  it('is 0 with no reviews at all', () => {
    expect(computeStreak([], now)).toBe(0);
  });

  it('is 1 with a review today only', () => {
    expect(computeStreak([entryAt('2026-09-20T09:00:00')], now)).toBe(1);
  });

  it('does not require a review today to report yesterday\'s streak', () => {
    // Reviewed the past 3 days, nothing yet today. A streak of 0 here would
    // be demoralising and wrong -- the streak the user built is still
    // intact until a day is actually skipped, so today not having a review
    // YET must not zero it out.
    const entries = [
      entryAt('2026-09-19T09:00:00'),
      entryAt('2026-09-18T09:00:00'),
      entryAt('2026-09-17T09:00:00')
    ];
    expect(computeStreak(entries, now)).toBe(3);
  });

  it('breaks immediately on a gap, even with older activity beyond it', () => {
    // Gap yesterday, but reviews the day before -- the chain is already
    // broken at yesterday, so this is 0, not 1 or some count that reaches
    // through the gap to the older streak.
    const entries = [entryAt('2026-09-18T09:00:00')];
    expect(computeStreak(entries, now)).toBe(0);
  });

  it('counts today plus a preceding run with no gap', () => {
    const entries = [
      entryAt('2026-09-20T08:00:00'),
      entryAt('2026-09-19T08:00:00'),
      entryAt('2026-09-18T08:00:00')
    ];
    expect(computeStreak(entries, now)).toBe(3);
  });

  it('spans a month boundary', () => {
    const at = new Date('2026-10-01T12:00:00');
    const entries = [entryAt('2026-10-01T08:00:00'), entryAt('2026-09-30T08:00:00'), entryAt('2026-09-29T08:00:00')];
    expect(computeStreak(entries, at)).toBe(3);
  });

  it('spans a year boundary', () => {
    const at = new Date('2027-01-01T12:00:00');
    const entries = [entryAt('2027-01-01T08:00:00'), entryAt('2026-12-31T08:00:00'), entryAt('2026-12-30T08:00:00')];
    expect(computeStreak(entries, at)).toBe(3);
  });

  it('honours the 04:00 day-start cutoff, matching dayKey', () => {
    // A review at 02:00 on the 20th belongs to the 19th's day bucket.
    const at = new Date('2026-09-20T02:30:00');
    const entries = [entryAt('2026-09-20T02:00:00'), entryAt('2026-09-19T20:00:00')];
    // Both entries fall in the "2026-09-19" bucket, so this is a 1-day streak
    // as of "now" (which is itself still within the 09-19 day).
    expect(computeStreak(entries, at)).toBe(1);
  });

  it('multiple reviews on the same day only count once', () => {
    const entries = [
      entryAt('2026-09-20T08:00:00'),
      entryAt('2026-09-20T09:00:00'),
      entryAt('2026-09-20T10:00:00')
    ];
    expect(computeStreak(entries, now)).toBe(1);
  });
});

describe('computeLastSevenDays (pure)', () => {
  it('returns 7 buckets, oldest first, ending today, all zero with no reviews', () => {
    const days = computeLastSevenDays([], now);
    expect(days).toHaveLength(7);
    expect(days.every((d) => d.count === 0)).toBe(true);
    expect(days[6]?.dayKey).toBe('2026-09-20');
    expect(days[0]?.dayKey).toBe('2026-09-14');
  });

  it('buckets reviews by day and counts multiples', () => {
    const entries = [
      entryAt('2026-09-20T08:00:00'),
      entryAt('2026-09-20T09:00:00'),
      entryAt('2026-09-18T08:00:00')
    ];
    const days = computeLastSevenDays(entries, now);
    const byKey = new Map(days.map((d) => [d.dayKey, d.count]));
    expect(byKey.get('2026-09-20')).toBe(2);
    expect(byKey.get('2026-09-18')).toBe(1);
    expect(byKey.get('2026-09-17')).toBe(0);
  });

  it('ignores reviews older than 7 days', () => {
    const entries = [entryAt('2026-09-01T08:00:00')];
    const days = computeLastSevenDays(entries, now);
    expect(days.every((d) => d.count === 0)).toBe(true);
  });
});

describe('getStreak (db-backed)', () => {
  async function seed(db: Awaited<ReturnType<typeof openDb>>, isoDates: string[]) {
    const tx = db.transaction('reviewLog', 'readwrite');
    for (const iso of isoDates) {
      await tx.store.add({ cardId: 'card-x', ts: new Date(iso).getTime(), rating: 3, durationMs: 100 });
    }
    await tx.done;
  }

  it('queries the ts index rather than reading every row, and matches the pure calculation', async () => {
    const db = await openDb();
    await seed(db, ['2026-09-20T08:00:00', '2026-09-19T08:00:00', '2026-09-17T08:00:00']);
    expect(await getStreak(db, now)).toBe(2);
  });

  it('is 0 for a fresh db with no reviews', async () => {
    const db = await openDb();
    expect(await getStreak(db, now)).toBe(0);
  });
});

describe('getLastSevenDays (db-backed)', () => {
  it('matches the pure calculation over seeded data', async () => {
    const db = await openDb();
    const tx = db.transaction('reviewLog', 'readwrite');
    await tx.store.add({ cardId: 'card-x', ts: new Date('2026-09-20T08:00:00').getTime(), rating: 3, durationMs: 100 });
    await tx.store.add({ cardId: 'card-x', ts: new Date('2026-09-15T08:00:00').getTime(), rating: 3, durationMs: 100 });
    await tx.done;

    const days = await getLastSevenDays(db, now);
    const byKey = new Map(days.map((d) => [d.dayKey, d.count]));
    expect(byKey.get('2026-09-20')).toBe(1);
    expect(byKey.get('2026-09-14')).toBe(0);
  });
});
