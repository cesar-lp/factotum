import { describe, it, expect } from 'vitest';
import { buildExtension, buildSession, dayKey } from '../src/scheduler/queue.js';
import { initialState } from '../src/scheduler/fsrs.js';
import type { StoredCard, ReviewState } from '../src/db/schema.js';

const now = new Date('2026-09-18T09:00:00Z');

const card = (id: string, category: string): StoredCard => ({
  id, format: 'qa', category, tags: [], prompt: id, answer: 'a',
  source: { path: 'vault/a.md', block: id }, citations: [], tombstoned: false
});

const due = (id: string): ReviewState => ({ ...initialState(id, now), due: now.getTime() - 1000, reps: 3 });

describe('dayKey', () => {
  it('assigns 03:00 local to the previous day', () => {
    const late = new Date('2026-09-18T03:00:00');
    const early = new Date('2026-09-18T05:00:00');
    expect(dayKey(late)).toBe('2026-09-17');
    expect(dayKey(early)).toBe('2026-09-18');
  });
});

describe('buildSession', () => {
  it('puts due cards before new cards', () => {
    const cards = [card('card-new1', 'net'), card('card-due1', 'net')];
    const reviews = new Map([['card-due1', due('card-due1')]]);
    const session = buildSession({ cards, reviews, now, newCardsPerDay: 10, newCardsSeenToday: 0 });
    expect(session.map((c) => c.id)).toEqual(['card-due1', 'card-new1']);
  });

  it('interleaves categories instead of blocking them', () => {
    const cards = [
      card('card-a1', 'algo'), card('card-a2', 'algo'),
      card('card-n1', 'net'), card('card-n2', 'net')
    ];
    const reviews = new Map(cards.map((c) => [c.id, due(c.id)]));
    const session = buildSession({ cards, reviews, now, newCardsPerDay: 0, newCardsSeenToday: 0 });
    const categories = session.map((c) => c.category);
    expect(categories[0]).not.toBe(categories[1]);
    expect(categories[2]).not.toBe(categories[3]);
  });

  it('caps new cards by the remaining daily allowance', () => {
    const cards = Array.from({ length: 10 }, (_, i) => card(`card-n${i}`, 'net'));
    const session = buildSession({
      cards, reviews: new Map(), now, newCardsPerDay: 10, newCardsSeenToday: 7
    });
    expect(session).toHaveLength(3);
  });

  it('excludes suspended and tombstoned cards', () => {
    const cards = [
      { ...card('card-tomb', 'net'), tombstoned: true },
      card('card-susp', 'net'),
      card('card-ok', 'net')
    ];
    const reviews = new Map([
      ['card-susp', { ...due('card-susp'), suspended: true }],
      ['card-ok', due('card-ok')]
    ]);
    const session = buildSession({ cards, reviews, now, newCardsPerDay: 10, newCardsSeenToday: 0 });
    expect(session.map((c) => c.id)).toEqual(['card-ok']);
  });
});

describe('buildExtension', () => {
  it('returns all remaining new cards, not a capped slice', () => {
    const cards = Array.from({ length: 25 }, (_, i) => card(`card-n${i}`, 'net'));
    const extension = buildExtension({ cards, reviews: new Map() });
    expect(extension).toHaveLength(25);
  });

  it('excludes suspended and tombstoned cards', () => {
    const cards = [
      { ...card('card-tomb', 'net'), tombstoned: true },
      card('card-susp', 'net'),
      card('card-new', 'net')
    ];
    const reviews = new Map([['card-susp', { ...due('card-susp'), suspended: true }]]);
    const extension = buildExtension({ cards, reviews });
    expect(extension.map((c) => c.id)).toEqual(['card-new']);
  });

  it('excludes cards already seen today (no double-serving within a day)', () => {
    const cards = [card('card-seen', 'net'), card('card-unseen', 'net')];
    // A card reviewed earlier today already has a review-state entry,
    // regardless of whether it was due again yet — that's what keeps it
    // out of the extension.
    const reviews = new Map([['card-seen', due('card-seen')]]);
    const extension = buildExtension({ cards, reviews });
    expect(extension.map((c) => c.id)).toEqual(['card-unseen']);
  });

  it('returns empty when no new cards remain', () => {
    const cards = [card('card-a', 'net')];
    const reviews = new Map([['card-a', due('card-a')]]);
    expect(buildExtension({ cards, reviews })).toEqual([]);
  });

  it('interleaves categories instead of blocking them', () => {
    const cards = [
      card('card-a1', 'algo'), card('card-a2', 'algo'),
      card('card-n1', 'net'), card('card-n2', 'net')
    ];
    const extension = buildExtension({ cards, reviews: new Map() });
    const categories = extension.map((c) => c.category);
    expect(categories[0]).not.toBe(categories[1]);
    expect(categories[2]).not.toBe(categories[3]);
  });
});
