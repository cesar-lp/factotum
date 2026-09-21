import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/db/schema.js';
import { getSettings, saveSettings, sanitizeSettings, DEFAULT_SETTINGS } from '../src/db/settings.js';
import { clampSettings, retentionPercentBounds } from '../src/ui/settings.js';

beforeEach(async () => {
  indexedDB = new IDBFactory();
});

describe('sanitizeSettings', () => {
  it('coerces a corrupt stored record to defaults/clamps', () => {
    const result = sanitizeSettings({ newCardsPerDay: 'ten', desiredRetention: 99, theme: 'chartreuse' });
    expect(result).toEqual({
      desiredRetention: 0.97, newCardsPerDay: 10, theme: 'auto', disabledCategories: [], obsidianVault: 'vault',
      readSuppressionHours: 24
    });
  });

  it('round-trips a valid record unchanged', () => {
    const valid = {
      desiredRetention: 0.85, newCardsPerDay: 20, theme: 'night' as const, disabledCategories: [],
      obsidianVault: 'second-brain', readSuppressionHours: 24
    };
    expect(sanitizeSettings(valid)).toEqual(valid);
  });

  it('yields defaults for an absent record', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('sanitizeSettings — obsidianVault', () => {
  it('defaults to "vault"', () => {
    expect(sanitizeSettings({}).obsidianVault).toBe('vault');
  });

  it('keeps a valid custom name', () => {
    expect(sanitizeSettings({ obsidianVault: 'My Notes' }).obsidianVault).toBe('My Notes');
  });

  it('falls back to the default for a non-string', () => {
    expect(sanitizeSettings({ obsidianVault: 42 }).obsidianVault).toBe('vault');
  });

  it('falls back to the default for a blank (whitespace-only) string', () => {
    expect(sanitizeSettings({ obsidianVault: '   ' }).obsidianVault).toBe('vault');
  });

  it('trims surrounding whitespace from an otherwise valid name', () => {
    expect(sanitizeSettings({ obsidianVault: '  my-vault  ' }).obsidianVault).toBe('my-vault');
  });

  it('caps an over-long name', () => {
    const long = 'a'.repeat(500);
    const result = sanitizeSettings({ obsidianVault: long }).obsidianVault;
    expect(result.length).toBeLessThan(500);
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
    expect(await getSettings(db)).toEqual({
      desiredRetention: 0.97, newCardsPerDay: 10, theme: 'auto', disabledCategories: [], obsidianVault: 'vault',
      readSuppressionHours: 24
    });
  });

  it('saveSettings sanitizes before writing so a bad value never lands in the store', async () => {
    const db = await openDb();
    await saveSettings(db, {
      desiredRetention: 99 as unknown as number, newCardsPerDay: -5, theme: 'auto', disabledCategories: [],
      obsidianVault: 'vault', readSuppressionHours: 24
    });
    const stored = await db.get('meta', 'settings');
    expect(stored).toEqual({
      desiredRetention: 0.97, newCardsPerDay: 0, theme: 'auto', disabledCategories: [], obsidianVault: 'vault',
      readSuppressionHours: 24
    });
  });
});

describe('clampSettings', () => {
  it('keeps valid values', () => {
    expect(clampSettings({ desiredRetention: 0.85, newCardsPerDay: 20, theme: 'night' }))
      .toEqual({
        desiredRetention: 0.85, newCardsPerDay: 20, theme: 'night', disabledCategories: [], obsidianVault: 'vault',
        readSuppressionHours: 24
      });
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
    expect(clampSettings({})).toEqual({
      desiredRetention: 0.9, newCardsPerDay: 10, theme: 'auto', disabledCategories: [], obsidianVault: 'vault',
      readSuppressionHours: 24
    });
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

describe('retentionPercentBounds', () => {
  it('derives the slider bounds from sanitizeSettings’s own clamp, not a second copy', () => {
    expect(retentionPercentBounds()).toEqual({ min: 70, max: 97 });
  });
});

describe('readSuppressionHours', () => {
  it('defaults to 24 when absent', () => {
    expect(sanitizeSettings({}).readSuppressionHours).toBe(24);
  });

  it('accepts 0, which disables suppression entirely', () => {
    expect(sanitizeSettings({ readSuppressionHours: 0 }).readSuppressionHours).toBe(0);
  });

  it('clamps a negative value to 0 rather than scheduling into the past', () => {
    expect(sanitizeSettings({ readSuppressionHours: -5 }).readSuppressionHours).toBe(0);
  });

  it('clamps an absurd value to one week', () => {
    expect(sanitizeSettings({ readSuppressionHours: 10000 }).readSuppressionHours).toBe(168);
  });

  it('falls back to the default for a non-finite value', () => {
    expect(sanitizeSettings({ readSuppressionHours: Number.NaN }).readSuppressionHours).toBe(24);
  });
});
