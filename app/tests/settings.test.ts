import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/db/schema.js';
import { getSettings, saveSettings, sanitizeSettings, DEFAULT_SETTINGS } from '../src/db/settings.js';

beforeEach(async () => {
  indexedDB = new IDBFactory();
});

describe('sanitizeSettings', () => {
  it('coerces a corrupt stored record to defaults/clamps', () => {
    const result = sanitizeSettings({ newCardsPerDay: 'ten', desiredRetention: 99, theme: 'chartreuse' });
    expect(result).toEqual({ desiredRetention: 0.97, newCardsPerDay: 10, theme: 'auto' });
  });

  it('round-trips a valid record unchanged', () => {
    const valid = { desiredRetention: 0.85, newCardsPerDay: 20, theme: 'night' as const };
    expect(sanitizeSettings(valid)).toEqual(valid);
  });

  it('yields defaults for an absent record', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('getSettings / saveSettings', () => {
  it('getSettings returns defaults when nothing is stored', async () => {
    const db = await openDb();
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
  });

  it('getSettings sanitizes a corrupt record already in the store', async () => {
    const db = await openDb();
    await db.put('meta', { newCardsPerDay: 'ten', desiredRetention: 99, theme: 'chartreuse' }, 'settings');
    expect(await getSettings(db)).toEqual({ desiredRetention: 0.97, newCardsPerDay: 10, theme: 'auto' });
  });

  it('saveSettings sanitizes before writing so a bad value never lands in the store', async () => {
    const db = await openDb();
    await saveSettings(db, { desiredRetention: 99 as unknown as number, newCardsPerDay: -5, theme: 'auto' });
    const stored = await db.get('meta', 'settings');
    expect(stored).toEqual({ desiredRetention: 0.97, newCardsPerDay: 0, theme: 'auto' });
  });
});
