import { describe, it, expect } from 'vitest';
import { summarizeTopics, hasFocusableCards } from '../src/topics.js';
import { initialState } from '../src/scheduler/fsrs.js';
import type { StoredCard, ReviewState } from '../src/db/schema.js';

const now = new Date('2026-09-19T09:00:00Z');

const card = (id: string, topic: string, category: string): StoredCard => ({
  id, format: 'qa', topic, category, tags: [], prompt: id, answer: 'a',
  source: { path: 'vault/a.md', block: id }, citations: [], tombstoned: false
});

const due = (id: string): ReviewState => ({ ...initialState(id, now), due: now.getTime() - 1000, reps: 3 });
const notYetDue = (id: string): ReviewState => ({
  ...initialState(id, now), due: now.getTime() + 86_400_000, reps: 3
});

describe('summarizeTopics', () => {
  it('groups categories under their topic, both sorted by name', () => {
    const cards = [
      card('c1', 'operating-systems', 'os-persistence'),
      card('c2', 'concurrency', 'os-concurrency'),
      card('c3', 'concurrency', 'amp'),
      card('c4', 'operating-systems', 'os-virtualization')
    ];
    const result = summarizeTopics(cards, new Map(), now);
    expect(result.map((t) => t.topic)).toEqual(['concurrency', 'operating-systems']);
    expect(result[0]?.categories.map((c) => c.category)).toEqual(['amp', 'os-concurrency']);
    expect(result[1]?.categories.map((c) => c.category)).toEqual(['os-persistence', 'os-virtualization']);
  });

  it('counts due and new cards per category', () => {
    const cards = [
      card('c-due', 'concurrency', 'amp'),
      card('c-new1', 'concurrency', 'amp'),
      card('c-new2', 'concurrency', 'amp')
    ];
    const reviews = new Map([['c-due', due('c-due')]]);
    const [topic] = summarizeTopics(cards, reviews, now);
    expect(topic?.categories[0]).toEqual({ category: 'amp', dueCount: 1, newCount: 2 });
  });

  it('counts neither not-yet-due nor suspended nor tombstoned cards', () => {
    const cards = [
      card('c-future', 'concurrency', 'amp'),
      card('c-susp', 'concurrency', 'amp'),
      { ...card('c-tomb', 'concurrency', 'amp'), tombstoned: true },
      card('c-due', 'concurrency', 'amp')
    ];
    const reviews = new Map([
      ['c-future', notYetDue('c-future')],
      ['c-susp', { ...due('c-susp'), suspended: true }],
      ['c-due', due('c-due')]
    ]);
    const [topic] = summarizeTopics(cards, reviews, now);
    expect(topic?.categories[0]).toEqual({ category: 'amp', dueCount: 1, newCount: 0 });
  });

  it('omits a category whose only cards are tombstoned', () => {
    const cards = [{ ...card('c-tomb', 'concurrency', 'amp'), tombstoned: true }];
    expect(summarizeTopics(cards, new Map(), now)).toEqual([]);
  });

  it('returns an empty list for an empty deck', () => {
    expect(summarizeTopics([], new Map(), now)).toEqual([]);
  });
});

describe('hasFocusableCards', () => {
  const topics = summarizeTopics(
    [card('c-new', 'concurrency', 'amp')],
    new Map(),
    now
  );

  it('is true for a category with cards waiting', () => {
    expect(hasFocusableCards(topics, 'amp')).toBe(true);
  });

  it('is false for a category that does not exist', () => {
    expect(hasFocusableCards(topics, 'gone')).toBe(false);
  });

  it('is false for a category with nothing due and nothing new', () => {
    const settled = summarizeTopics(
      [card('c-future', 'concurrency', 'amp')],
      new Map([['c-future', notYetDue('c-future')]]),
      now
    );
    expect(hasFocusableCards(settled, 'amp')).toBe(false);
  });
});
