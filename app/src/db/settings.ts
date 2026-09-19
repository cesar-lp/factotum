import type { FactotumDb, Settings } from './schema.js';

export const DEFAULT_SETTINGS: Settings = {
  desiredRetention: 0.9,
  newCardsPerDay: 10,
  theme: 'auto',
  disabledCategories: []
};

/** Bounds a corrupt or malicious write; far above any plausible real vault. */
const MAX_DISABLED_CATEGORIES = 200;

function isTheme(value: unknown): value is Settings['theme'] {
  return value === 'auto' || value === 'day' || value === 'night';
}

function clampFinite(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function toCategoryList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (trimmed === '' || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= MAX_DISABLED_CATEGORIES) break;
  }
  return out;
}

/**
 * Coerces an arbitrary (possibly corrupt or partially-written) value into a
 * valid Settings object, falling back to defaults field-by-field so a bad
 * or missing value never propagates as a wrongly-typed value (e.g. NaN
 * arithmetic downstream in the scheduler).
 */
export function sanitizeSettings(input: unknown): Settings {
  const record = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

  const desiredRetention = clampFinite(record['desiredRetention'], 0.7, 0.97, DEFAULT_SETTINGS.desiredRetention);
  const newCardsPerDayRaw = clampFinite(record['newCardsPerDay'], 0, 100, DEFAULT_SETTINGS.newCardsPerDay);
  const newCardsPerDay = Math.round(newCardsPerDayRaw);
  const theme = isTheme(record['theme']) ? record['theme'] : DEFAULT_SETTINGS.theme;

  return {
    desiredRetention,
    newCardsPerDay,
    theme,
    disabledCategories: toCategoryList(record['disabledCategories'])
  };
}

export async function getSettings(db: FactotumDb): Promise<Settings> {
  const stored = await db.get('meta', 'settings');
  return sanitizeSettings(stored);
}

export async function saveSettings(db: FactotumDb, settings: Settings): Promise<void> {
  await db.put('meta', sanitizeSettings(settings), 'settings');
}
