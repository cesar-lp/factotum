import { describe, it, expect } from 'vitest';
import { clampSettings } from '../src/ui/settings.js';

describe('clampSettings', () => {
  it('keeps valid values', () => {
    expect(clampSettings({ desiredRetention: 0.85, newCardsPerDay: 20, theme: 'night' }))
      .toEqual({ desiredRetention: 0.85, newCardsPerDay: 20, theme: 'night' });
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
    expect(clampSettings({})).toEqual({ desiredRetention: 0.9, newCardsPerDay: 10, theme: 'auto' });
    expect(clampSettings({ theme: 'chartreuse' as never }).theme).toBe('auto');
  });
});
