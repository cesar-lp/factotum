import { describe, it, expect } from 'vitest';
import { decideRoute, type DashboardState } from '../src/route.js';
import type { StoredCard } from '../src/db/schema.js';

const card = (id: string): StoredCard => ({
  id, format: 'qa', category: 'net', tags: [], prompt: id, answer: 'a',
  source: { path: 'vault/a.md', block: id }, citations: [], tombstoned: false
});

const state = (session: StoredCard[], extension: StoredCard[]): DashboardState => ({
  session,
  extension,
  newCardsSeenToday: 0
});

describe('decideRoute', () => {
  it('sends #review-extend with due cards present back to the dashboard', () => {
    // THE invariant: due cards always come first, so a non-empty session
    // must never let #review-extend through, no matter how the hash was
    // reached (stale history, reload, bookmark).
    const s = state([card('due-1')], [card('new-1')]);
    expect(decideRoute('#review-extend', s)).toBe('dashboard');
  });

  it('sends #review-extend with an empty queue and extension cards to review-extend', () => {
    const s = state([], [card('new-1')]);
    expect(decideRoute('#review-extend', s)).toBe('review-extend');
  });

  it('sends #review-extend with an empty queue and nothing to extend into back to the dashboard', () => {
    const s = state([], []);
    expect(decideRoute('#review-extend', s)).toBe('dashboard');
  });

  it('sends #review with due cards to review', () => {
    const s = state([card('due-1')], []);
    expect(decideRoute('#review', s)).toBe('review');
  });

  it('sends #review with an empty session back to the dashboard', () => {
    const s = state([], [card('new-1')]);
    expect(decideRoute('#review', s)).toBe('dashboard');
  });

  it('sends #settings to settings regardless of state', () => {
    const s = state([], []);
    expect(decideRoute('#settings', s)).toBe('settings');
  });

  it('sends an unknown hash to the dashboard', () => {
    const s = state([card('due-1')], [card('new-1')]);
    expect(decideRoute('#nonsense', s)).toBe('dashboard');
  });

  it('sends an empty hash to the dashboard', () => {
    const s = state([card('due-1')], [card('new-1')]);
    expect(decideRoute('', s)).toBe('dashboard');
  });
});
