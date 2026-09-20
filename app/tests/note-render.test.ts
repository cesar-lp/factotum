import { describe, it, expect } from 'vitest';
import { renderNoteBlocks } from '../src/ui/note-render.js';
import type { NoteBlock } from '../../pipeline/src/types.js';

const render = (blocks: NoteBlock[], masked: string[] = []) =>
  renderNoteBlocks(blocks, new Set(masked));

describe('renderNoteBlocks', () => {
  it('renders a heading at its level', () => {
    expect(render([{ kind: 'heading', level: 2, text: 'Raft' }])).toContain('<h2');
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
    // Both spans exist -- data-card no longer signals mask state -- but
    // only c2's carries is-masked.
    expect(html).toMatch(/data-card="c1"(?![^>]*is-masked)/);
    expect(html).toMatch(/data-card="c2"[^>]*class="is-masked"/);
    expect(html).toMatch(/A .*one.*and.*two.*here\./s);
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
