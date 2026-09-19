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

  describe('paragraph-aware blocks', () => {
    it('joins a two-line wrapped sentence into one cloze prompt', () => {
      const body = 'Delivered to every node in the ==group==, reliably (no message is\nlost or duplicated).';
      const cards = parseCards(body, 0);
      expect(cards).toHaveLength(1);
      expect(cards[0]?.prompt).toBe(
        'Delivered to every node in the ___, reliably (no message is lost or duplicated).'
      );
      expect(cards[0]?.answer).toBe('group');
      expect(cards[0]?.anchorLine).toBe(0);
    });

    it('produces the two documented cards for the two-line, two-highlight example, ids and anchorLine intact', () => {
      const body = [
        'Linearizability is a ==recency== guarantee on single objects; ^card-4n76',
        'serializability is an ==isolation== guarantee across transactions. ^card-lgbl'
      ].join('\n');
      const cards = parseCards(body, 0);
      expect(cards).toHaveLength(2);
      expect(cards[0]).toMatchObject({
        id: 'card-4n76',
        format: 'cloze',
        prompt:
          'Linearizability is a ___ guarantee on single objects; serializability is an isolation guarantee across transactions.',
        answer: 'recency',
        anchorLine: 0
      });
      expect(cards[1]).toMatchObject({
        id: 'card-lgbl',
        format: 'cloze',
        prompt:
          'Linearizability is a recency guarantee on single objects; serializability is an ___ guarantee across transactions.',
        answer: 'isolation',
        anchorLine: 1
      });
    });

    it('does not let a blank line leak text between two paragraphs', () => {
      const body = ['First para has a ==highlight one==.', '', 'Second para has a ==highlight two==.'].join('\n');
      const cards = parseCards(body, 0);
      expect(cards).toHaveLength(2);
      expect(cards[0]?.prompt).toBe('First para has a ___.');
      expect(cards[0]?.prompt).not.toContain('Second');
      expect(cards[1]?.prompt).toBe('Second para has a ___.');
      expect(cards[1]?.prompt).not.toContain('First');
    });

    it('does not let a list item absorb the following list item', () => {
      const body = ['- First item with ==alpha==.', '- Second item with ==beta==.'].join('\n');
      const cards = parseCards(body, 0);
      expect(cards).toHaveLength(2);
      expect(cards[0]?.prompt).toBe('- First item with ___.');
      expect(cards[0]?.prompt).not.toContain('Second');
      expect(cards[1]?.prompt).toBe('- Second item with ___.');
      expect(cards[1]?.prompt).not.toContain('First');
    });

    it('does not join a heading into the paragraph beneath it', () => {
      const body = ['## A heading', 'Paragraph text with ==term==.'].join('\n');
      const cards = parseCards(body, 0);
      expect(cards).toHaveLength(1);
      expect(cards[0]?.prompt).toBe('Paragraph text with ___.');
      expect(cards[0]?.anchorLine).toBe(1);
    });

    it('leaves existing single-line behaviour unchanged', () => {
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

    it('keeps a pre-existing qa anchor in place when it sits on a later line than the block start', () => {
      // Regression: before block-joining existed, this two-line question
      // already produced a working (if truncated) qa card because the
      // `::` and the anchor both happened to land on the second line. The
      // fix must join the full question without relocating the id to the
      // block's first line, which would abandon card-of38 and mint a new id.
      const body = [
        'What does "the network model" (a historical predecessor to relational',
        'databases) require that the relational model does not? :: The network model requires pointer-based navigation. ^card-of38'
      ].join('\n');
      const cards = parseCards(body, 0);
      expect(cards).toEqual([
        {
          id: 'card-of38',
          format: 'qa',
          prompt:
            'What does "the network model" (a historical predecessor to relational databases) require that the relational model does not?',
          answer: 'The network model requires pointer-based navigation.',
          anchorLine: 1
        }
      ]);
    });

    it('joins a wrapped Q :: A pair and anchors it to the block\'s first line', () => {
      const body = ['What guarantee does linearizability provide on single', 'objects? :: Recency.'].join('\n');
      const cards = parseCards(body, 3);
      expect(cards).toEqual([
        {
          id: null,
          format: 'qa',
          prompt: 'What guarantee does linearizability provide on single objects?',
          answer: 'Recency.',
          anchorLine: 3
        }
      ]);
    });
  });
});
