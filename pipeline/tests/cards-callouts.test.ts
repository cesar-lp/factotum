import { describe, it, expect, vi } from 'vitest';
import { parseCards } from '../src/cards.js';

const mcq = [
  '> [!card] mcq',
  '> At which OSI layer does TCP operate?',
  '> - [x] Transport (4)',
  '> - [ ] Network (3)',
  '> - [ ] Session (5)',
  '> ^card-m8q4'
].join('\n');

describe('parseCards — callouts', () => {
  it('parses an mcq callout with choices and anchor', () => {
    const cards = parseCards(mcq, 0);
    expect(cards).toEqual([
      {
        id: 'card-m8q4',
        format: 'mcq',
        prompt: 'At which OSI layer does TCP operate?',
        choices: [
          { text: 'Transport (4)', correct: true },
          { text: 'Network (3)', correct: false },
          { text: 'Session (5)', correct: false }
        ],
        anchorLine: 5
      }
    ]);
  });

  it('parses a recall callout with no answer key', () => {
    const body = ['> [!card] recall', '> Explain why TCP suits bulk transfer', '> and not live video.'].join('\n');
    const cards = parseCards(body, 0);
    expect(cards).toEqual([
      {
        id: null,
        format: 'recall',
        prompt: 'Explain why TCP suits bulk transfer and not live video.',
        anchorLine: 2
      }
    ]);
  });

  it('skips an mcq with no correct choice and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const body = ['> [!card] mcq', '> Broken?', '> - [ ] a', '> - [ ] b'].join('\n');
    expect(parseCards(body, 0)).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not let callout text leak into cloze or qa parsing', () => {
    const body = ['> [!card] recall', '> Compare ==A== :: ==B=='].join('\n');
    const cards = parseCards(body, 0);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.format).toBe('recall');
  });

  it('resumes normal parsing after the callout ends', () => {
    const body = [mcq, '', 'MTU is ==1500 bytes==.'].join('\n');
    const cards = parseCards(body, 0);
    expect(cards.map((c) => c.format)).toEqual(['mcq', 'cloze']);
  });

  it('splits a recall callout into prompt and answer on a --- separator', () => {
    const body = [
      '> [!card] recall',
      '> Explain why wait-free implies lock-free, but not the reverse.',
      '> ---',
      '> Wait-free bounds every thread; lock-free only guarantees some progress.'
    ].join('\n');
    const cards = parseCards(body, 0);
    expect(cards).toEqual([
      {
        id: null,
        format: 'recall',
        prompt: 'Explain why wait-free implies lock-free, but not the reverse.',
        answer: 'Wait-free bounds every thread; lock-free only guarantees some progress.',
        anchorLine: 3
      }
    ]);
  });

  it('leaves a recall callout with no separator without an answer field', () => {
    const body = ['> [!card] recall', '> Explain why TCP suits bulk transfer.'].join('\n');
    const cards = parseCards(body, 0);
    expect(cards[0]?.answer).toBeUndefined();
    expect(Object.keys(cards[0] ?? {})).not.toContain('answer');
  });

  it('joins a multi-line answer after the separator', () => {
    const body = [
      '> [!card] recall',
      '> Explain the thing.',
      '> ---',
      '> First line of the answer',
      '> and a second line.'
    ].join('\n');
    const cards = parseCards(body, 0);
    expect(cards[0]?.answer).toBe('First line of the answer and a second line.');
  });

  it('keeps a second --- inside the answer text', () => {
    const body = [
      '> [!card] recall',
      '> Explain the thing.',
      '> ---',
      '> The answer has a divider below',
      '> ---',
      '> and this trailing bit too.'
    ].join('\n');
    const cards = parseCards(body, 0);
    expect(cards[0]?.answer).toBe('The answer has a divider below --- and this trailing bit too.');
  });

  it('yields no answer when the separator is followed only by blank lines', () => {
    const body = ['> [!card] recall', '> Explain the thing.', '> ---', '>', '>   '].join('\n');
    const cards = parseCards(body, 0);
    expect(cards[0]?.answer).toBeUndefined();
  });

  it('skips a recall card whose separator is the first line, and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const body = ['> [!card] recall', '> ---', '> Only an answer, no prompt.'].join('\n');
    expect(parseCards(body, 0)).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not treat --- as a separator inside an mcq callout', () => {
    const body = ['> [!card] mcq', '> Broken?', '> ---', '> - [x] a', '> - [ ] b'].join('\n');
    const cards = parseCards(body, 0);
    expect(cards).toEqual([
      {
        id: null,
        format: 'mcq',
        prompt: 'Broken? ---',
        choices: [
          { text: 'a', correct: true },
          { text: 'b', correct: false }
        ],
        anchorLine: 4
      }
    ]);
  });
});
