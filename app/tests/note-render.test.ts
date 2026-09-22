import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { renderNoteBlocks } from '../src/ui/note-render.js';
import type { NoteBlock, Notes } from '../../pipeline/src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const render = (blocks: NoteBlock[], title?: string) =>
  renderNoteBlocks(blocks, title);

describe('renderNoteBlocks', () => {
  // level: 1 because that's the only heading level anywhere in this vault
  // (185 headings, all H1) -- a test pinned to level: 2 would never have
  // caught a bug that only manifests on real level-1 headings, such as the
  // H1-duplicates-the-title defect this file also guards against below.
  it('renders a heading at its level', () => {
    expect(render([{ kind: 'heading', level: 1, text: 'Raft' }])).toContain('<h1');
  });

  it('does not suppress a heading when no title is given', () => {
    expect(render([{ kind: 'heading', level: 1, text: 'Raft' }])).toContain('Raft');
  });

  it('suppresses only the first heading matching the title, keeping later ones', () => {
    const html = render([
      { kind: 'heading', level: 1, text: 'Consensus' },
      { kind: 'prose', text: 'intro', clozes: [] },
      { kind: 'heading', level: 1, text: 'Consensus' }
    ], 'Consensus');
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('intro');
  });

  it('renders the H1 normally when it differs from the title', () => {
    const html = render([{ kind: 'heading', level: 1, text: 'Different heading' }], 'The Title');
    expect(html).toContain('<h1');
    expect(html).toContain('Different heading');
  });

  it('renders correctly when the note has no heading at all', () => {
    const html = render([{ kind: 'prose', text: 'just prose', clozes: [] }], 'A Title');
    expect(html).not.toContain('<h1');
    expect(html).toContain('just prose');
  });

  it('renders a cloze span with its data-card attribute', () => {
    const html = render([
      { kind: 'prose', text: 'MTU is 1500 bytes.', clozes: [{ start: 7, end: 17, cardId: 'c1', answer: '1500 bytes' }] }
    ]);
    expect(html).toContain('1500 bytes');
    expect(html).toContain('data-card="c1"');
  });

  it('renders multiple clozes in one block without corrupting offsets', () => {
    const html = render([
      { kind: 'prose', text: 'A one and two here.', clozes: [
        { start: 2, end: 5, cardId: 'c1', answer: 'one' },
        { start: 10, end: 13, cardId: 'c2', answer: 'two' }
      ] }
    ]);
    // Assert the exact output: this pins down offset placement and that the
    // connective text between the two clozes survived untouched.
    expect(html).toContain(
      '<p class="note-prose" data-block="0">A <span data-card="c1">one</span> and <span data-card="c2">two</span> here.</p>'
    );
  });

  it('keeps cloze offsets correct when preceding text needs escaping', () => {
    // The dangerous regression: escaping before slicing shifts every
    // offset past the first `<` or `&`, silently misplacing the cloze span.
    // Offsets below are computed against the RAW string, as the pipeline
    // does, with both an unescaped `<` and `&` sitting before the cloze.
    const raw = 'a < b & c: answer is 42.';
    expect(raw.slice(21, 23)).toBe('42');
    const html = render([
      { kind: 'prose', text: raw, clozes: [{ start: 21, end: 23, cardId: 'c1', answer: '42' }] }
    ]);
    expect(html).toContain(
      '<p class="note-prose" data-block="0">a &lt; b &amp; c: answer is <span data-card="c1">42</span>.</p>'
    );
  });

  it('emits data-card for an answerless recall card', () => {
    // The `> ---` separator that introduces a model answer is optional and
    // unused by every recall card in this vault (177/177 answerless).
    // Task 8 finds the arrived-from card via [data-card="<id>"], so this
    // block must still carry it even with nothing to blur.
    const html = render([{ kind: 'card', cardId: 'c1', format: 'recall', prompt: 'Explain X.' }]);
    expect(html).toContain('data-card="c1"');
    expect(html).toContain('Explain X.');
  });

  it('escapes html in prose', () => {
    const html = render([{ kind: 'prose', text: 'a <script>alert(1)</script> b', clozes: [] }]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes html in code fences', () => {
    // The sharpest escaping case: fence content is dense in < and &, and it
    // must never pass through the inline markup layer either -- backticks
    // and asterisks inside code are code.
    const html = render([{ kind: 'code', lang: 'ts', text: 'if (a < b && c) { x("**y**") }' }]);
    expect(html).not.toContain('<b');
    expect(html).toContain('&lt; b &amp;&amp; c');
    expect(html).toContain('**y**');
    expect(html).not.toContain('<strong>');
  });

  it('escapes html in choices and headings', () => {
    const html = render([
      { kind: 'heading', level: 1, text: '<img onerror=x>' },
      { kind: 'card', cardId: 'c1', format: 'mcq', prompt: 'p', choices: [{ text: '<b>', correct: true }] }
    ]);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
  });

  it('applies inline markup to prose', () => {
    const html = render([{ kind: 'prose', text: 'a `code` and **bold**', clozes: [] }]);
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('always marks the correct mcq choice now that masking is gone', () => {
    const html = renderNoteBlocks([{
      kind: 'card', cardId: 'card-aaaa', format: 'mcq', prompt: 'Which?',
      choices: [{ text: 'right', correct: true }, { text: 'wrong', correct: false }]
    }]);
    expect(html).toContain('is-correct');
    expect(html).not.toContain('is-masked');
  });

  it('tags every block with its index so search can scroll to one', () => {
    const html = renderNoteBlocks([
      { kind: 'heading', level: 2, text: 'A' },
      { kind: 'prose', text: 'B', clozes: [] }
    ]);
    expect(html).toContain('data-block="0"');
    expect(html).toContain('data-block="1"');
  });
});

// The real, built notes.json -- not a fixture. 477 hand-written tests missed
// a defect (every note's H1 rendered a second time, duplicating the screen
// title) that affected 201/201 notes, because nothing actually rendered a
// real note body and inspected the result. This closes that gap.
const NOTES_PATH = resolve(__dirname, '../../deck/notes.json');

describe('renderNoteBlocks over the real notes corpus', () => {
  let notes: Notes;

  beforeAll(() => {
    notes = JSON.parse(readFileSync(NOTES_PATH, 'utf8')) as Notes;
  });

  it('loaded a real, substantial notes.json (sanity guard against a broken path)', () => {
    expect(notes.notes.length).toBeGreaterThan(100);
  });

  it("never repeats a note's own title as a rendered heading", () => {
    const violations: string[] = [];
    for (const note of notes.notes) {
      const html = renderNoteBlocks(note.blocks, note.title);
      const headingRe = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g;
      let match: RegExpExecArray | null;
      while ((match = headingRe.exec(html))) {
        if (match[1] === note.title) {
          violations.push(`${note.path}: heading repeats title "${note.title}"`);
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });
});

describe('inline math in notes', () => {
  it('typesets math in prose', () => {
    const html = renderNoteBlocks([{ kind: 'prose', text: 'The residual $b - Ax$ is orthogonal.', clozes: [] }]);
    expect(html).toContain('class="katex"');
  });

  it('typesets math in a heading', () => {
    expect(renderNoteBlocks([{ kind: 'heading', level: 2, text: 'Projections onto $R^n$' }])).toContain('katex');
  });

  it('leaves a code fence completely alone', () => {
    const html = renderNoteBlocks([{ kind: 'code', lang: 'bash', text: 'echo $HOME && echo $PATH' }]);
    expect(html).toContain('echo $HOME &amp;&amp; echo $PATH');
    expect(html).not.toContain('katex');
  });

  it('keeps cloze offsets correct when the same block contains math', () => {
    const html = renderNoteBlocks([{
      kind: 'prose',
      text: 'A projection $P$ satisfies idempotence exactly.',
      clozes: [{ start: 27, end: 38, cardId: 'card-abcd', answer: 'idempotence' }]
    }]);
    expect(html).toContain('data-card="card-abcd"');
    expect(html).toContain('>idempotence<');
  });
});

describe('display math blocks', () => {
  it('renders a math block as display-mode KaTeX', () => {
    const html = renderNoteBlocks([{ kind: 'math', text: 'A^\\top A x = A^\\top b' }]);
    expect(html).toContain('note-math');
    expect(html).toContain('katex-display');
  });

  it('never applies inline markup to a math block', () => {
    // `*` and `_` are LaTeX operators here, not emphasis markers.
    const html = renderNoteBlocks([{ kind: 'math', text: 'a_1 * b_2 * c_3' }]);
    expect(html).not.toContain('<em>');
    expect(html).not.toContain('<strong>');
  });

  it('carries the block index like every other block', () => {
    const html = renderNoteBlocks([{ kind: 'prose', text: 'x', clozes: [] }, { kind: 'math', text: 'y' }]);
    expect(html).toContain('data-block="1"');
  });
});
