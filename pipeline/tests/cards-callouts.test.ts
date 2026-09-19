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
});
