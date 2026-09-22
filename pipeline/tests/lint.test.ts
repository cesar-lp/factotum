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

describe('lintNote — mcq-multiple-correct', () => {
  const fused = [
    '> [!card] mcq',
    '> First question?',
    '> - [x] first right',
    '> - [ ] first wrong',
    '>',
    '> Second question?',
    '> - [x] second right',
    '> - [ ] second wrong'
  ];

  it('flags two questions fused into one callout by a blank `>` line', () => {
    const problems = lintNote(note(fused));
    expect(problems).toHaveLength(1);
    expect(problems[0]?.rule).toBe('mcq-multiple-correct');
    // Points at the callout header, not the offending choice — the fix is
    // to split the block, which is an edit at the top of it.
    expect(problems[0]?.line).toBe(5);
    expect(problems[0]?.message).toContain('2 choices marked');
  });

  // The rule exists because of what the parser REALLY does with this, not
  // because the markup looks untidy: one card, both prompts concatenated,
  // all four choices pooled, two of them correct. Only one choice can ever
  // be tapped, so the card cannot be answered as written.
  it('really produces one fused, unanswerable card (verified against the real parser)', () => {
    const cards = parseCards(fused.join('\n'), 0);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.format).toBe('mcq');
    expect(cards[0]?.choices).toHaveLength(4);
    expect(cards[0]?.choices?.filter((c) => c.correct)).toHaveLength(2);
    expect(cards[0]?.prompt).toContain('First question?');
    expect(cards[0]?.prompt).toContain('Second question?');
  });

  it('does not flag the same content split into two callouts', () => {
    const split = [
      '> [!card] mcq',
      '> First question?',
      '> - [x] first right',
      '> - [ ] first wrong',
      '',
      '> [!card] mcq',
      '> Second question?',
      '> - [x] second right',
      '> - [ ] second wrong'
    ];
    expect(lintNote(note(split))).toEqual([]);
    expect(parseCards(split.join('\n'), 0)).toHaveLength(2);
  });

  it('does not flag a well-formed single-answer mcq', () => {
    expect(lintNote(note(['> [!card] mcq', '> Q?', '> - [x] a', '> - [ ] b']))).toEqual([]);
  });

  // cards.ts already warns and drops a callout with no correct choice, so
  // that case is loud enough without a lint rule; this rule owns only the
  // too-many direction.
  it('does not flag a callout with no correct choice', () => {
    expect(lintNote(note(['> [!card] mcq', '> Q?', '> - [ ] a', '> - [ ] b']))).toEqual([]);
  });

  it('does not flag a recall callout, which has no choices at all', () => {
    expect(lintNote(note(['> [!card] recall', '> Explain a thing.', '> ---', '> Because of reasons.']))).toEqual([]);
  });
});

describe('lintNote — note-filename-reference', () => {
  it('flags a backticked filename inside a qa card', () => {
    const problems = lintNote(note(['What is X? :: See `caching-and-observability.md` for more.']));
    expect(problems).toHaveLength(1);
    expect(problems[0]?.rule).toBe('note-filename-reference');
    expect(problems[0]?.message).toContain('caching-and-observability.md');
  });

  // Several of the real ones had no backticks, which is why a grep for
  // '`*.md`' would have missed them.
  it('flags an unbackticked filename', () => {
    expect(lintNote(note(['Why? :: As described in execution-model-and-lifecycle.md.']))[0]?.rule)
      .toBe('note-filename-reference');
  });

  it('flags a path-qualified reference inside a cloze', () => {
    expect(lintNote(note(['The ==quorum== reasoning from `database-internals/consensus.md` applies.']))[0]?.rule)
      .toBe('note-filename-reference');
  });

  it('flags one inside an mcq choice', () => {
    const problems = lintNote(note(['> [!card] mcq', '> Q?', '> - [x] see `policy-documents.md`', '> - [ ] no']));
    expect(problems[0]?.rule).toBe('note-filename-reference');
  });

  // THE distinction this rule exists to make. Note prose that produces no
  // card is where cross-references belong — they are live links in Obsidian.
  // A first cut of this rule flagged these and reported 24 false positives
  // against the real vault.
  it('does NOT flag a cross-reference in prose that produces no card', () => {
    expect(lintNote(note(['`queries-scans-and-access-patterns.md` establishes that modeling',
                          'starts from access patterns, not entities.']))).toEqual([]);
  });

  it('does not flag prose containing md or a dotted term', () => {
    expect(lintNote(note(['The ==MD5== digest and the .mdx format are unrelated.']))).toEqual([]);
  });
});

describe('math lint rules', () => {
  const note = (body: string) => `---\ncategory: math\n---\n\n${body}\n`;
  const rules = (body: string) => lintNote(note(body)).map((p) => p.rule);

  it('flags an unpaired dollar in prose', () => {
    expect(rules('A transfer of $100 between accounts.')).toContain('unpaired-dollar');
  });

  it('accepts an escaped dollar', () => {
    expect(rules('A transfer of \\$100 between accounts.')).not.toContain('unpaired-dollar');
  });

  it('accepts a balanced inline math span', () => {
    expect(rules('The residual $b - Ax$ is orthogonal.')).not.toContain('unpaired-dollar');
  });

  it('ignores dollars inside a code span', () => {
    expect(rules('Reserved routes (`$connect`, `$disconnect`).')).not.toContain('unpaired-dollar');
  });

  it('ignores dollars inside a code fence', () => {
    expect(rules('```\nadd $1, %eax\n```')).not.toContain('unpaired-dollar');
  });

  it('flags math inside a cloze answer', () => {
    // Not "==$P^2 = P$==": HIGHLIGHT (cards.ts) excludes "=" from cloze
    // content entirely, as a pre-existing, unrelated limitation, so a
    // cloze answer containing a literal "=" never matches HIGHLIGHT at
    // all and this rule (which only inspects text HIGHLIGHT itself
    // matched) has nothing to see. "$P^2$" still exercises "math inside
    // a cloze" without tripping that separate limitation.
    expect(rules('A projection satisfies ==$P^2$==.')).toContain('math-in-cloze');
  });

  it('flags a math span straddling a cloze boundary', () => {
    expect(rules('A projection is ==idempotent$== so $P^2 = P$.')).toContain('math-in-cloze');
  });

  it('accepts math in the prompt with a prose cloze answer', () => {
    expect(rules('The matrix $P$ with $P^2 = P$ is called ==idempotent==.')).not.toContain('math-in-cloze');
  });

  it('flags LaTeX KaTeX cannot parse', () => {
    expect(rules('The gradient $\\frac{$ vanishes.')).toContain('invalid-math');
  });

  it('flags a cloze inside a display block', () => {
    expect(rules('$$\nP^2 = ==P==\n$$')).toContain('display-math-block');
  });

  it('flags a display block not separated from prose by a blank line', () => {
    expect(rules('The equation is:\n$$\nP^2 = P\n$$')).toContain('display-math-block');
  });

  it('accepts a well-formed display block', () => {
    expect(rules('The equation is:\n\n$$\nP^2 = P\n$$\n\nwhich is idempotence.')).toEqual([]);
  });

  it('validates a multi-line block as one equation, not line by line', () => {
    // A bare "\\begin{aligned}" is not valid LaTeX on its own. If this rule
    // ever regresses to a per-line check, this is the test that catches it.
    const body = ['$$', '\\begin{aligned}', 'A^\\top A x &= A^\\top b', '\\end{aligned}', '$$'].join('\n');
    expect(rules(body)).toEqual([]);
  });

  it('still reports a genuinely broken multi-line block, at its opening line', () => {
    const body = ['$$', '\\begin{aligned}', 'x &= 1', '$$'].join('\n');
    expect(rules(body)).toContain('invalid-math');
  });
});
