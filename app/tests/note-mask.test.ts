import { describe, it, expect } from 'vitest';
import { maskedCardIds } from '../src/ui/note-mask.js';
import type { ReviewState } from '../src/db/schema.js';
import type { NoteDoc } from '../../pipeline/src/types.js';

const state = (cardId: string, due: number, extra: Partial<ReviewState> = {}): ReviewState => ({
  cardId, due, stability: 1, difficulty: 5, elapsedDays: 0, scheduledDays: 1,
  reps: 1, lapses: 0, state: 2, lastReview: due - 86_400_000,
  suspended: false, flagged: false, ...extra
});

const NOW = new Date('2026-09-20T12:00:00Z');
const PAST = NOW.getTime() - 86_400_000;
const FUTURE = NOW.getTime() + 86_400_000;

const note: NoteDoc = {
  path: 'vault/a.md', title: 'A', topic: 't', category: 'c', citations: [],
  blocks: [
    { kind: 'prose', text: 'x', clozes: [{ start: 0, end: 1, cardId: 'card-due', answer: 'x' }] },
    { kind: 'qa', cardId: 'card-new', prompt: 'Q', answer: 'A' },
    { kind: 'card', cardId: 'card-fresh', format: 'recall', prompt: 'P' }
  ]
};

describe('maskedCardIds', () => {
  it('masks a card that is due', () => {
    const reviews = new Map([['card-due', state('card-due', PAST)]]);
    expect(maskedCardIds(note, reviews, NOW, null).has('card-due')).toBe(true);
  });

  it('does not mask a new card', () => {
    // THE decision. Masking protects a pending test; a card never asked has
    // none, and the note is the material you would learn it from. Masking
    // new cards would leave a freshly written note 100% blurred on exactly
    // the day you most want to read it.
    expect(maskedCardIds(note, new Map(), NOW, null).has('card-new')).toBe(false);
  });

  it('does not mask a card inside its retention window', () => {
    const reviews = new Map([['card-fresh', state('card-fresh', FUTURE)]]);
    expect(maskedCardIds(note, reviews, NOW, null).has('card-fresh')).toBe(false);
  });

  it('never masks the card you arrived from, though it is due', () => {
    // You just answered it in review. There is nothing left to protect.
    const reviews = new Map([['card-due', state('card-due', PAST)]]);
    expect(maskedCardIds(note, reviews, NOW, 'card-due').has('card-due')).toBe(false);
  });

  it('still masks other due cards when arriving from one of them', () => {
    const reviews = new Map([
      ['card-due', state('card-due', PAST)],
      ['card-fresh', state('card-fresh', PAST)]
    ]);
    const masked = maskedCardIds(note, reviews, NOW, 'card-due');
    expect(masked.has('card-due')).toBe(false);
    expect(masked.has('card-fresh')).toBe(true);
  });

  it('does not mask a suspended card', () => {
    // A suspended card is not going to be asked, so there is no test to
    // protect -- matching how summarizeTopics skips them.
    const reviews = new Map([['card-due', state('card-due', PAST, { suspended: true })]]);
    expect(maskedCardIds(note, reviews, NOW, null).has('card-due')).toBe(false);
  });

  it('ignores an arrivedFrom id that is not in this note', () => {
    const reviews = new Map([['card-due', state('card-due', PAST)]]);
    expect(maskedCardIds(note, reviews, NOW, 'card-elsewhere').has('card-due')).toBe(true);
  });
});
