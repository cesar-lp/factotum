import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/db/schema.js';
import { getSettings, saveSettings, sanitizeSettings, DEFAULT_SETTINGS } from '../src/db/settings.js';
import { clampSettings } from '../src/ui/settings.js';

beforeEach(async () => {
  indexedDB = new IDBFactory();
});

describe('sanitizeSettings', () => {
  it('coerces a corrupt stored record to defaults/clamps', () => {
    const result = sanitizeSettings({ newCardsPerDay: 'ten', desiredRetention: 99, theme: 'chartreuse' });
    expect(result).toEqual({ desiredRetention: 0.97, newCardsPerDay: 10, theme: 'auto', disabledCategories: [] });
  });

  it('round-trips a valid record unchanged', () => {
    const valid = { desiredRetention: 0.85, newCardsPerDay: 20, theme: 'night' as const, disabledCategories: [] };
    expect(sanitizeSettings(valid)).toEqual(valid);
  });

  it('yields defaults for an absent record', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('sanitizeSettings — disabledCategories', () => {
  it('defaults to an empty list', () => {
    expect(sanitizeSettings({}).disabledCategories).toEqual([]);
  });

  it('coerces a non-array to an empty list', () => {
    expect(sanitizeSettings({ disabledCategories: 'aws' }).disabledCategories).toEqual([]);
  });

  it('drops non-string and blank entries and trims the rest', () => {
    const result = sanitizeSettings({ disabledCategories: ['  aws-s3  ', 7, '', '   ', 'amp'] });
    expect(result.disabledCategories).toEqual(['aws-s3', 'amp']);
  });

  it('removes duplicates, including ones that differ only by padding', () => {
    const result = sanitizeSettings({ disabledCategories: ['amp', 'amp', ' amp '] });
    expect(result.disabledCategories).toEqual(['amp']);
  });

  it('caps a corrupt oversized list', () => {
    const many = Array.from({ length: 500 }, (_, i) => `cat-${i}`);
    expect(sanitizeSettings({ disabledCategories: many }).disabledCategories).toHaveLength(200);
  });

  it('reads back the default for a settings record written before this field existed', () => {
    const legacy = { desiredRetention: 0.85, newCardsPerDay: 20, theme: 'night' };
    expect(sanitizeSettings(legacy).disabledCategories).toEqual([]);
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
    expect(await getSettings(db)).toEqual({ desiredRetention: 0.97, newCardsPerDay: 10, theme: 'auto', disabledCategories: [] });
  });

  it('saveSettings sanitizes before writing so a bad value never lands in the store', async () => {
    const db = await openDb();
    await saveSettings(db, { desiredRetention: 99 as unknown as number, newCardsPerDay: -5, theme: 'auto', disabledCategories: [] });
    const stored = await db.get('meta', 'settings');
    expect(stored).toEqual({ desiredRetention: 0.97, newCardsPerDay: 0, theme: 'auto', disabledCategories: [] });
  });
});

describe('clampSettings', () => {
  it('keeps valid values', () => {
    expect(clampSettings({ desiredRetention: 0.85, newCardsPerDay: 20, theme: 'night' }))
      .toEqual({ desiredRetention: 0.85, newCardsPerDay: 20, theme: 'night', disabledCategories: [] });
  });

  it('clamps retention into 0.70–0.97', () => {
    expect(clampSettings({ desiredRetention: 0.99 }).desiredRetention).toBe(0.97);
    expect(clampSettings({ desiredRetention: 0.1 }).desiredRetention).toBe(0.7);
  });

  it('clamps new cards into 0–100 and rounds', () => {
    expect(clampSettings({ newCardsPerDay: 500 }).newCardsPerDay).toBe(100);
    expect(clampSettings({ newCardsPerDay: 7.6 }).newCardsPerDay).toBe(8);
  });

  it('falls back to defaults for missing or invalid fields', () => {
    expect(clampSettings({})).toEqual({ desiredRetention: 0.9, newCardsPerDay: 10, theme: 'auto', disabledCategories: [] });
    expect(clampSettings({ theme: 'chartreuse' as never }).theme).toBe('auto');
  });

  it('clampSettings preserves disabledCategories it was handed', () => {
    const result = clampSettings({
      desiredRetention: 0.9,
      newCardsPerDay: 10,
      theme: 'auto',
      disabledCategories: ['amp']
    });
    expect(result.disabledCategories).toEqual(['amp']);
  });
});
