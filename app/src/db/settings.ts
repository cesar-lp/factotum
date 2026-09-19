import type { FactotumDb, Settings } from './schema.js';

export const DEFAULT_SETTINGS: Settings = {
  desiredRetention: 0.9,
  newCardsPerDay: 10,
  theme: 'auto'
};

export async function getSettings(db: FactotumDb): Promise<Settings> {
  const stored = (await db.get('meta', 'settings')) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(db: FactotumDb, settings: Settings): Promise<void> {
  await db.put('meta', settings, 'settings');
}
