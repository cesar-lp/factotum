import { describe, it, expect } from 'vitest';
import { parseBlocks } from '../src/cards.js';

describe('parseBlocks', () => {
  it('emits a heading with its level', () => {
    expect(parseBlocks('# Consensus')).toEqual([
      { kind: 'heading', level: 1, text: 'Consensus' }
    ]);
  });

  it('emits a fenced code block verbatim, without parsing card syntax inside it', () => {
    // FENCE content must never be scanned: `==x==` and `::` inside a fence
    // are code, not cards. parseCards already skips fences; parseBlocks
    // must keep the text instead of dropping it.
    const body = '```ts\nconst a = b == c;\n```';
    expect(parseBlocks(body)).toEqual([
      { kind: 'code', lang: 'ts', text: 'const a = b == c;' }
    ]);
  });

  it('emits plain prose with no clozes', () => {
    expect(parseBlocks('Just a sentence.')).toEqual([
      { kind: 'prose', text: 'Just a sentence.', clozes: [] }
    ]);
  });

  it('joins wrapped prose into one block and offsets clozes into the joined text', () => {
    // THE case that makes offsets non-trivial: buildBlock joins the two
    // source lines with a single space, so the cloze's start/end index the
    // joined string, not either source line.
    const body = 'Default Ethernet MTU\nis ==1500 bytes== today.';
    const blocks = parseBlocks(body);
    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    if (block?.kind !== 'prose') throw new Error('expected a prose block');
    expect(block.text).toBe('Default Ethernet MTU is 1500 bytes today.');
    expect(block.clozes).toEqual([
      { start: 24, end: 34, cardIndex: 0, answer: '1500 bytes' }
    ]);
    expect(block.text.slice(24, 34)).toBe('1500 bytes');
  });

  it('numbers multiple clozes in one block by match order', () => {
    const blocks = parseBlocks('A ==one== and ==two== here.');
    const block = blocks[0];
    if (block?.kind !== 'prose') throw new Error('expected a prose block');
    expect(block.clozes.map((c) => c.cardIndex)).toEqual([0, 1]);
    expect(block.clozes.map((c) => c.answer)).toEqual(['one', 'two']);
  });

  it('emits a qa block with prompt and answer split', () => {
    expect(parseBlocks('What is X? :: It is Y.')).toEqual([
      { kind: 'qa', cardIndex: 0, prompt: 'What is X?', answer: 'It is Y.' }
    ]);
  });

  it('emits an mcq callout with its choices and correctness', () => {
    const body = [
      '> [!card] mcq',
      '> At which OSI layer does TCP operate?',
      '> - [x] Transport (4)',
      '> - [ ] Network (3)'
    ].join('\n');
    expect(parseBlocks(body)).toEqual([
      {
        kind: 'card', cardIndex: 0, format: 'mcq',
        prompt: 'At which OSI layer does TCP operate?',
        choices: [
          { text: 'Transport (4)', correct: true },
          { text: 'Network (3)', correct: false }
        ]
      }
    ]);
  });

  it('splits a recall callout on its > --- separator', () => {
    const body = ['> [!card] recall', '> Explain X.', '> ---', '> Because Y.'].join('\n');
    expect(parseBlocks(body)).toEqual([
      { kind: 'card', cardIndex: 0, format: 'recall', prompt: 'Explain X.', answer: 'Because Y.' }
    ]);
  });

  it('omits answer for a recall callout with no separator', () => {
    const body = ['> [!card] recall', '> Explain X.'].join('\n');
    expect(parseBlocks(body)).toEqual([
      { kind: 'card', cardIndex: 0, format: 'recall', prompt: 'Explain X.' }
    ]);
  });

  it('strips ^card-xxxx anchors from emitted text', () => {
    // Anchors are build metadata, never reading material.
    const blocks = parseBlocks('A ==term== here. ^card-abcd');
    const block = blocks[0];
    if (block?.kind !== 'prose') throw new Error('expected a prose block');
    expect(block.text).toBe('A term here.');
  });

  it('emits a list block', () => {
    expect(parseBlocks('- first\n- second')).toEqual([
      { kind: 'list', items: ['first', 'second'] }
    ]);
  });

  it('numbers cardIndex across the whole body in walk order', () => {
    const body = [
      'A ==one== here.',
      '',
      'Q? :: A.',
      '',
      '> [!card] recall',
      '> Explain.'
    ].join('\n');
    const indices = parseBlocks(body).flatMap((b) =>
      b.kind === 'prose' ? b.clozes.map((c) => c.cardIndex)
      : b.kind === 'qa' || b.kind === 'card' ? [b.cardIndex]
      : []
    );
    expect(indices).toEqual([0, 1, 2]);
  });
});
