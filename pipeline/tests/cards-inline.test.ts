import { describe, it, expect, vi } from 'vitest';
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

  it('does not parse == comparisons in code as a cloze', () => {
    expect(parseCards('a == b and c == d', 0)).toEqual([]);
  });

  it('still parses a real highlight after tightening the highlight regex', () => {
    const cards = parseCards('Default MTU is ==1500 bytes==.', 0);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.format).toBe('cloze');
    expect(cards[0]?.answer).toBe('1500 bytes');
  });

  it('ignores == and :: constructs inside fenced code blocks', () => {
    const body = [
      'Some prose before.',
      '```python',
      'if (a == b && c == d):',
      '    result :: value',
      '```',
      'After the fence, TCP is ==reliable==.'
    ].join('\n');
    const cards = parseCards(body, 0);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.format).toBe('cloze');
    expect(cards[0]?.answer).toBe('reliable');
  });

  it('prefers cloze over qa when a line has both constructs', () => {
    const cards = parseCards('Is TCP ==reliable==? :: Yes, via retransmission.', 0);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.format).toBe('cloze');
    expect(cards[0]?.answer).toBe('reliable');
  });

  it('warns and assigns null ids when bare anchors follow a line with no anchor of its own', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const body = 'TCP is ==reliable==.\n^card-aaaa';
      const cards = parseCards(body, 0);
      expect(cards).toHaveLength(1);
      expect(cards[0]?.id).toBeNull();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0]?.[0]).toContain('card-aaaa');
    } finally {
      warnSpy.mockRestore();
    }
  });
});
