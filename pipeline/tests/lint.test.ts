import { describe, it, expect } from 'vitest';
import { lintNote } from '../src/lint.js';
import { parseCards } from '../src/cards.js';

function note(bodyLines: string[]): string {
  return ['---', 'category: networking', '---', '', ...bodyLines].join('\n');
}

describe('lintNote — padded-highlight', () => {
  it('flags a highlight padded with whitespace just inside the ==', () => {
    const text = note(['Default Ethernet MTU is == 1500 bytes ==.']);
    const problems = lintNote(text);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.rule).toBe('padded-highlight');
    expect(problems[0]?.line).toBe(5);
  });

  it('really produces no card for the padded highlight (verified against the real parser)', () => {
    const cards = parseCards('Default Ethernet MTU is == 1500 bytes ==.', 0);
    expect(cards).toEqual([]);
  });

  it('does not flag a properly hugging highlight', () => {
    const text = note(['Default Ethernet MTU is ==1500 bytes==.']);
    expect(lintNote(text)).toEqual([]);
  });

  it('does not flag inside a fenced code block', () => {
    const text = note(['```', 'x == y and == padded ==', '```']);
    expect(lintNote(text)).toEqual([]);
  });
});

describe('lintNote — qa-cloze-collision', () => {
  it('flags a line with both a valid cloze and a :: separator', () => {
    const text = note(['Is TCP ==reliable==? :: Yes, via retransmission.']);
    const problems = lintNote(text);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.rule).toBe('qa-cloze-collision');
    expect(problems[0]?.line).toBe(5);
  });

  it('really produces only a cloze card, silently dropping the qa card (verified against the real parser)', () => {
    const cards = parseCards('Is TCP ==reliable==? :: Yes, via retransmission.', 0);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.format).toBe('cloze');
  });

  it('does not flag a plain qa line with no cloze', () => {
    const text = note(['What does TIME_WAIT protect against? :: Delayed duplicates.']);
    expect(lintNote(text)).toEqual([]);
  });

  it('does not flag a plain cloze line with no ::', () => {
    const text = note(['Default Ethernet MTU is ==1500 bytes==.']);
    expect(lintNote(text)).toEqual([]);
  });
});

describe('lintNote — unbalanced-fence', () => {
  it('flags an unclosed ``` fence, pointing at the opening line', () => {
    const text = note(['Some prose.', '```python', 'unterminated code']);
    const problems = lintNote(text);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.rule).toBe('unbalanced-fence');
    expect(problems[0]?.line).toBe(6);
  });

  it('flags an unclosed ~~~ fence', () => {
    const text = note(['~~~', 'unterminated']);
    const problems = lintNote(text);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.rule).toBe('unbalanced-fence');
  });

  it('does not flag a properly closed fence', () => {
    const text = note(['```python', 'a == b', '```', 'After, TCP is ==reliable==.']);
    expect(lintNote(text)).toEqual([]);
  });
});

describe('lintNote — missing-category', () => {
  it('flags a note with no category key at all', () => {
    const text = ['---', 'tags: [x]', '---', '', 'Some body.'].join('\n');
    const problems = lintNote(text);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.rule).toBe('missing-category');
    expect(problems[0]?.line).toBe(0);
  });

  it('flags a note with a blank category', () => {
    const text = ['---', 'category: "   "', '---', '', 'Some body.'].join('\n');
    const problems = lintNote(text);
    expect(problems.map((p) => p.rule)).toContain('missing-category');
  });

  it('flags a note with no frontmatter at all', () => {
    const text = '# Just a draft\n\nSome body.';
    const problems = lintNote(text);
    expect(problems.map((p) => p.rule)).toContain('missing-category');
  });

  it('does not flag a note that has category but no topic', () => {
    const text = ['---', 'category: networking', '---', '', 'Some body.'].join('\n');
    expect(lintNote(text)).toEqual([]);
  });
});
