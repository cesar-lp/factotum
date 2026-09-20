import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { renderNoteBlocks } from '../src/ui/note-render.js';
import type { NoteBlock, Notes } from '../../pipeline/src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const render = (blocks: NoteBlock[], masked: string[] = [], title?: string) =>
  renderNoteBlocks(blocks, new Set(masked), title);

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
    ], [], 'Consensus');
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('intro');
  });

  it('renders the H1 normally when it differs from the title', () => {
    const html = render([{ kind: 'heading', level: 1, text: 'Different heading' }], [], 'The Title');
    expect(html).toContain('<h1');
    expect(html).toContain('Different heading');
  });

  it('renders correctly when the note has no heading at all', () => {
    const html = render([{ kind: 'prose', text: 'just prose', clozes: [] }], [], 'A Title');
    expect(html).not.toContain('<h1');
    expect(html).toContain('just prose');
  });

  it('renders an unmasked cloze visibly, without the masked class', () => {
    const html = render([
      { kind: 'prose', text: 'MTU is 1500 bytes.', clozes: [{ start: 7, end: 17, cardId: 'c1', answer: '1500 bytes' }] }
    ]);
    expect(html).toContain('1500 bytes');
    expect(html).not.toContain('is-masked');
  });

  it('marks a masked cloze and keeps its text in the document', () => {
    // Blur rather than blank: the span keeps its width, so revealing it
    // reflows nothing and reading flow survives the tap.
    const html = render([
      { kind: 'prose', text: 'MTU is 1500 bytes.', clozes: [{ start: 7, end: 17, cardId: 'c1', answer: '1500 bytes' }] }
    ], ['c1']);
    expect(html).toContain('is-masked');
    expect(html).toContain('data-card="c1"');
    expect(html).toContain('1500 bytes');
  });

  it('renders multiple clozes in one block without corrupting offsets', () => {
    const html = render([
      { kind: 'prose', text: 'A one and two here.', clozes: [
        { start: 2, end: 5, cardId: 'c1', answer: 'one' },
        { start: 10, end: 13, cardId: 'c2', answer: 'two' }
      ] }
    ], ['c2']);
    // Assert the exact output: this pins down offset placement, which
    // cloze got the is-masked class, and that the connective text between
    // the two clozes survived untouched, all in one check.
    expect(html).toContain(
      '<p class="note-prose">A <span data-card="c1">one</span> and <span data-card="c2" class="is-masked">two</span> here.</p>'
    );
  });

  it('keeps cloze offsets correct when preceding text needs escaping', () => {
    // The dangerous regression: escaping before slicing shifts every
    // offset past the first `<` or `&`, silently misplacing the mask.
    // Offsets below are computed against the RAW string, as the pipeline
    // does, with both an unescaped `<` and `&` sitting before the cloze.
    const raw = 'a < b & c: answer is 42.';
    expect(raw.slice(21, 23)).toBe('42');
    const html = render([
      { kind: 'prose', text: raw, clozes: [{ start: 21, end: 23, cardId: 'c1', answer: '42' }] }
    ], ['c1']);
    expect(html).toContain(
      '<p class="note-prose">a &lt; b &amp; c: answer is <span data-card="c1" class="is-masked">42</span>.</p>'
    );
  });

  it('hides the correct-choice marking on a masked mcq', () => {
    // THE spoiler case. Obsidian renders the raw `- [x]`, so the answer key
    // is visible there today; this must not reproduce that.
    const block: NoteBlock = {
      kind: 'card', cardId: 'c1', format: 'mcq', prompt: 'Which layer?',
      choices: [{ text: 'Transport', correct: true }, { text: 'Network', correct: false }]
    };
    const masked = render([block], ['c1']);
    expect(masked).toContain('Which layer?');
    expect(masked).toContain('Transport');
    expect(masked).not.toContain('is-correct');

    const open = render([block]);
    expect(open).toContain('is-correct');
  });

  it('blurs only the choice list on a masked mcq, never the question', () => {
    // The prompt must stay readable while due -- correctness is already
    // absent from the DOM, so blurring the question protects nothing and
    // only costs the reader the ability to read what they're studying.
    const block: NoteBlock = {
      kind: 'card', cardId: 'c1', format: 'mcq', prompt: 'Which layer?',
      choices: [{ text: 'Transport', correct: true }, { text: 'Network', correct: false }]
    };
    const html = render([block], ['c1']);
    expect(html).toMatch(/<p class="note-card-prompt">Which layer\?<\/p>/);
    expect(html).toMatch(/<ul class="note-choices is-masked">/);
    // is-masked must not land on the outer card div itself.
    expect(html).not.toMatch(/<div class="note-card note-mcq is-masked"/);
  });

  it('masks a qa answer but never its prompt', () => {
    const block: NoteBlock = { kind: 'qa', cardId: 'c1', prompt: 'What is X?', answer: 'It is Y.' };
    const html = render([block], ['c1']);
    expect(html).toContain('What is X?');
    expect(html).toContain('is-masked');
  });

  it('masks a recall model answer but never its prompt', () => {
    const block: NoteBlock = { kind: 'card', cardId: 'c1', format: 'recall', prompt: 'Explain X.', answer: 'Because Y.' };
    const html = render([block], ['c1']);
    expect(html).toContain('Explain X.');
    expect(html).toContain('is-masked');
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
      const html = renderNoteBlocks(note.blocks, new Set(), note.title);
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
