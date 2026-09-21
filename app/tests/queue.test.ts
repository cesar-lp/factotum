import { describe, it, expect } from 'vitest';
import {
  buildExtension,
  buildFocusSession,
  buildSession,
  countSuppressed,
  dayKey,
  selectEnabled,
  selectNotRecentlyRead
} from '../src/scheduler/queue.js';
import { initialState } from '../src/scheduler/fsrs.js';
import type { StoredCard, ReviewState } from '../src/db/schema.js';

const now = new Date('2026-09-18T09:00:00Z');

const card = (id: string, category: string): StoredCard => ({
  id, format: 'qa', topic: category, category, tags: [], prompt: id, answer: 'a',
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

describe('selectEnabled', () => {
  it('is a no-op for an empty disabled set', () => {
    const cards = [card('card-a', 'algo'), card('card-n', 'net')];
    expect(selectEnabled(cards, new Set())).toEqual(cards);
  });

  it('removes cards in disabled categories and preserves order', () => {
    const cards = [card('card-a', 'algo'), card('card-n', 'net'), card('card-a2', 'algo')];
    expect(selectEnabled(cards, new Set(['net'])).map((c) => c.id))
      .toEqual(['card-a', 'card-a2']);
  });

  it('keeps a disabled name that matches nothing harmless', () => {
    const cards = [card('card-a', 'algo')];
    expect(selectEnabled(cards, new Set(['gone']))).toEqual(cards);
  });
});

describe('disabled categories and the daily queue', () => {
  it('keeps a disabled category out of both the session and the extension', () => {
    const cards = [
      card('card-due-net', 'net'), card('card-new-net', 'net'),
      card('card-due-algo', 'algo'), card('card-new-algo', 'algo')
    ];
    const reviews = new Map([
      ['card-due-net', due('card-due-net')],
      ['card-due-algo', due('card-due-algo')]
    ]);
    const enabled = selectEnabled(cards, new Set(['net']));

    const session = buildSession({
      cards: enabled, reviews, now, newCardsPerDay: 10, newCardsSeenToday: 0
    });
    const extension = buildExtension({ cards: enabled, reviews });

    expect(session.map((c) => c.id)).toEqual(['card-due-algo', 'card-new-algo']);
    expect(extension.map((c) => c.id)).toEqual(['card-new-algo']);
  });
});

describe('buildFocusSession', () => {
  it('serves the category\'s due cards before its new cards', () => {
    const cards = [card('card-new', 'algo'), card('card-due', 'algo')];
    const reviews = new Map([['card-due', due('card-due')]]);
    const focus = buildFocusSession({ cards, reviews, now, category: 'algo' });
    expect(focus.map((c) => c.id)).toEqual(['card-due', 'card-new']);
  });

  it('ignores other categories entirely', () => {
    const cards = [card('card-algo', 'algo'), card('card-net', 'net')];
    const focus = buildFocusSession({ cards, reviews: new Map(), now, category: 'algo' });
    expect(focus.map((c) => c.id)).toEqual(['card-algo']);
  });

  it('is uncapped — every new card in the category, past any daily allowance', () => {
    const cards = Array.from({ length: 25 }, (_, i) => card(`card-n${i}`, 'algo'));
    const focus = buildFocusSession({ cards, reviews: new Map(), now, category: 'algo' });
    expect(focus).toHaveLength(25);
  });

  it('excludes cards that are not yet due, so it cannot pull a schedule forward', () => {
    const cards = [card('card-future', 'algo'), card('card-due', 'algo')];
    const reviews = new Map([
      ['card-future', { ...due('card-future'), due: now.getTime() + 86_400_000 }],
      ['card-due', due('card-due')]
    ]);
    const focus = buildFocusSession({ cards, reviews, now, category: 'algo' });
    expect(focus.map((c) => c.id)).toEqual(['card-due']);
  });

  it('excludes suspended and tombstoned cards', () => {
    const cards = [
      { ...card('card-tomb', 'algo'), tombstoned: true },
      card('card-susp', 'algo'),
      card('card-ok', 'algo')
    ];
    const reviews = new Map([
      ['card-susp', { ...due('card-susp'), suspended: true }],
      ['card-ok', due('card-ok')]
    ]);
    const focus = buildFocusSession({ cards, reviews, now, category: 'algo' });
    expect(focus.map((c) => c.id)).toEqual(['card-ok']);
  });

  it('returns nothing for a category that does not exist', () => {
    const cards = [card('card-algo', 'algo')];
    expect(buildFocusSession({ cards, reviews: new Map(), now, category: 'gone' })).toEqual([]);
  });
});

describe('selectNotRecentlyRead', () => {
  const read = (hoursAgo: number) => ({ 'vault/a.md': now.getTime() - hoursAgo * 3600_000 });

  it('drops a due card whose note was just read', () => {
    const cards = [card('card-due1', 'net')];
    const reviews = new Map([['card-due1', due('card-due1')]]);
    expect(selectNotRecentlyRead(cards, reviews, read(1), now, 24)).toEqual([]);
  });

  it('keeps a due card whose note was read outside the window', () => {
    const cards = [card('card-due1', 'net')];
    const reviews = new Map([['card-due1', due('card-due1')]]);
    expect(selectNotRecentlyRead(cards, reviews, read(30), now, 24).map((c) => c.id)).toEqual(['card-due1']);
  });

  it('NEVER suppresses a new card -- reading a note is how you meet it', () => {
    const cards = [card('card-new1', 'net')];
    expect(selectNotRecentlyRead(cards, new Map(), read(1), now, 24).map((c) => c.id)).toEqual(['card-new1']);
  });

  it('keeps a due card from a different note in the same category', () => {
    const other = { ...card('card-due2', 'net'), source: { path: 'vault/b.md', block: 'card-due2' } };
    const reviews = new Map([['card-due2', due('card-due2')]]);
    expect(selectNotRecentlyRead([other], reviews, read(1), now, 24).map((c) => c.id)).toEqual(['card-due2']);
  });

  it('is a no-op when the window is 0', () => {
    const cards = [card('card-due1', 'net')];
    const reviews = new Map([['card-due1', due('card-due1')]]);
    expect(selectNotRecentlyRead(cards, reviews, read(1), now, 0).map((c) => c.id)).toEqual(['card-due1']);
  });

  it('preserves order', () => {
    const a = card('card-a', 'net');
    const b = { ...card('card-b', 'net'), source: { path: 'vault/b.md', block: 'card-b' } };
    const c = card('card-c', 'net');
    const reviews = new Map([['card-a', due('card-a')], ['card-c', due('card-c')]]);
    expect(selectNotRecentlyRead([a, b, c], reviews, read(1), now, 24).map((x) => x.id)).toEqual(['card-b']);
  });
});

describe('countSuppressed', () => {
  it('counts exactly what selectNotRecentlyRead removed', () => {
    const cards = [card('card-due1', 'net'), card('card-new1', 'net')];
    const reviews = new Map([['card-due1', due('card-due1')]]);
    const reads = { 'vault/a.md': now.getTime() };
    expect(countSuppressed(cards, reviews, reads, now, 24)).toBe(1);
    expect(selectNotRecentlyRead(cards, reviews, reads, now, 24)).toHaveLength(1);
  });

  it('is 0 when nothing was read', () => {
    const cards = [card('card-due1', 'net')];
    const reviews = new Map([['card-due1', due('card-due1')]]);
    expect(countSuppressed(cards, reviews, {}, now, 24)).toBe(0);
  });
});
