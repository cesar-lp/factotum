import { describe, it, expect } from 'vitest';
import { parseNote, buildDeck } from '../src/build.js';

const raw = [
  '---',
  'category: networking',
  'tags: [tcp]',
  'citations: ["RFC 793 §1.4"]',
  '---',
  '',
  'Default Ethernet MTU is ==1500 bytes==.'
].join('\n');

describe('parseNote', () => {
  it('returns a note with ids assigned and source updated', () => {
    const { note, updatedSource } = parseNote('vault/networking/tcp.md', raw, new Set());
    expect(note?.category).toBe('networking');
    expect(note?.cards).toHaveLength(1);
    expect(note?.cards[0]?.id).toMatch(/^card-[a-z0-9]{4}$/);
    expect(updatedSource).toContain(`^${note?.cards[0]?.id}`);
  });

  it('skips notes without a category and leaves the source untouched', () => {
    const { note, updatedSource } = parseNote('vault/daily.md', '# Draft ==x==', new Set());
    expect(note).toBeNull();
    expect(updatedSource).toBe('# Draft ==x==');
  });
});

describe('buildDeck', () => {
  it('flattens notes into deck cards carrying category, tags, citations and source', () => {
    const { note } = parseNote('vault/networking/tcp.md', raw, new Set());
    const deck = buildDeck(note ? [note] : [], new Date('2026-09-18T10:00:00Z'));

    expect(deck.generatedAt).toBe('2026-09-18T10:00:00.000Z');
    expect(deck.cards).toHaveLength(1);
    const card = deck.cards[0];
    expect(card?.category).toBe('networking');
    expect(card?.tags).toEqual(['tcp']);
    expect(card?.citations).toEqual(['RFC 793 §1.4']);
    expect(card?.prompt).toBe('Default Ethernet MTU is ___.');
    expect(card?.answer).toBe('1500 bytes');
    expect(card?.source.path).toBe('vault/networking/tcp.md');
    expect(card?.source.block).toBe(card?.id);
  });

  it('omits choices for non-mcq cards and answer for recall cards', () => {
    const recallRaw = ['---', 'category: networking', '---', '> [!card] recall', '> Explain ARQ.'].join('\n');
    const { note } = parseNote('vault/networking/arq.md', recallRaw, new Set());
    const card = buildDeck(note ? [note] : [], new Date()).cards[0];
    expect(card && 'choices' in card).toBe(false);
    expect(card && 'answer' in card).toBe(false);
  });

  it('throws on duplicate ids across notes', () => {
    const a = parseNote('a.md', '---\ncategory: x\n---\nA ==b==. ^card-dupe', new Set()).note;
    const b = parseNote('b.md', '---\ncategory: x\n---\nC ==d==. ^card-dupe', new Set()).note;
    expect(() => buildDeck([a!, b!], new Date())).toThrow(/card-dupe/);
  });
});
