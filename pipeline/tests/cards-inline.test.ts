import { describe, it, expect } from 'vitest';
import { parseCards } from '../src/cards.js';

describe('parseCards — inline constructs', () => {
  it('parses a cloze into prompt with a blank and the answer', () => {
    const cards = parseCards('Default Ethernet MTU is ==1500 bytes==.', 0);
    expect(cards).toEqual([
      {
        id: null,
        format: 'cloze',
        prompt: 'Default Ethernet MTU is ___.',
        answer: '1500 bytes',
        anchorLine: 0
      }
    ]);
  });

  it('captures an existing anchor and strips it from the prompt', () => {
    const cards = parseCards('MTU is ==1500 bytes==. ^card-k3n9', 4);
    expect(cards[0]?.id).toBe('card-k3n9');
    expect(cards[0]?.prompt).toBe('MTU is ___.');
    expect(cards[0]?.anchorLine).toBe(4);
  });

  it('yields one card per highlight, blanking one at a time', () => {
    const cards = parseCards('TCP is ==reliable== and ==ordered==.', 0);
    expect(cards).toHaveLength(2);
    expect(cards[0]?.prompt).toBe('TCP is ___ and ordered.');
    expect(cards[0]?.answer).toBe('reliable');
    expect(cards[1]?.prompt).toBe('TCP is reliable and ___.');
    expect(cards[1]?.answer).toBe('ordered');
  });

  it('parses a Q :: A line as a qa card', () => {
    const cards = parseCards('What does TIME_WAIT protect against? :: Delayed duplicates.', 2);
    expect(cards).toEqual([
      {
        id: null,
        format: 'qa',
        prompt: 'What does TIME_WAIT protect against?',
        answer: 'Delayed duplicates.',
        anchorLine: 2
      }
    ]);
  });

  it('ignores prose with no constructs', () => {
    expect(parseCards('Just an explanatory sentence.', 0)).toEqual([]);
  });

  it('offsets anchorLine by bodyStartLine', () => {
    const cards = parseCards('A ==b==.', 5);
    expect(cards[0]?.anchorLine).toBe(5);
  });

  it('claims bare anchor lines beneath a multi-cloze line, in order', () => {
    const body = 'TCP is ==reliable== and ==ordered==. ^card-aaaa\n^card-bbbb';
    const cards = parseCards(body, 0);
    expect(cards).toHaveLength(2);
    expect(cards[0]?.id).toBe('card-aaaa');
    expect(cards[1]?.id).toBe('card-bbbb');
  });

  it('does not parse a bare anchor line as a card', () => {
    expect(parseCards('^card-aaaa', 0)).toEqual([]);
  });
});
