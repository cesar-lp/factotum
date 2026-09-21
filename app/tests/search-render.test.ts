import { describe, it, expect } from 'vitest';
import { highlight, renderRecent, renderResults, renderSearchState } from '../src/ui/search.js';
import type { NoteResult } from '../src/search.js';
import type { NoteDoc } from '../../pipeline/src/types.js';

const result = (over: Partial<NoteResult> = {}): NoteResult => ({
  path: 'vault/a.md', title: 'DNS', topic: 'networking', category: 'networking',
  score: 10, hits: [], ...over
});

describe('highlight', () => {
  it('wraps the matched span', () => {
    expect(highlight('the needle here', [{ start: 4, end: 10 }]))
      .toBe('the <mark>needle</mark> here');
  });

  it('escapes html OUTSIDE the match', () => {
    expect(highlight('<b> needle', [{ start: 4, end: 10 }]))
      .toBe('&lt;b&gt; <mark>needle</mark>');
  });

  it('escapes html INSIDE the match', () => {
    expect(highlight('x <b>', [{ start: 2, end: 5 }]))
      .toBe('x <mark>&lt;b&gt;</mark>');
  });

  it('does not shift offsets when earlier text needs escaping -- the cloze bug', () => {
    // Escaping first would turn '&' into '&amp;', pushing every later
    // offset 4 characters right and highlighting the wrong span.
    expect(highlight('a & needle', [{ start: 4, end: 10 }]))
      .toBe('a &amp; <mark>needle</mark>');
  });

  it('handles multiple matches in order', () => {
    expect(highlight('ab cd', [{ start: 0, end: 2 }, { start: 3, end: 5 }]))
      .toBe('<mark>ab</mark> <mark>cd</mark>');
  });

  it('returns escaped text when there are no matches', () => {
    expect(highlight('a & b', [])).toBe('a &amp; b');
  });
});

describe('renderResults', () => {
  it('renders one row per note, carrying the path', () => {
    const html = renderResults([result({ path: 'vault/a.md' })], new Set());
    expect(html).toContain('data-path="vault/a.md"');
    expect(html).toContain('DNS');
  });

  it('does NOT render snippets for a collapsed row', () => {
    const html = renderResults([result({
      hits: [{ blockIndex: 2, snippet: 'secret answer', matches: [], score: 1 }]
    })], new Set());
    expect(html).not.toContain('secret answer');
  });

  it('renders snippets once the row is expanded', () => {
    const html = renderResults([result({
      hits: [{ blockIndex: 2, snippet: 'secret answer', matches: [], score: 1 }]
    })], new Set(['vault/a.md']));
    expect(html).toContain('secret answer');
    expect(html).toContain('data-block="2"');
  });

  it('escapes a title containing html', () => {
    expect(renderResults([result({ title: '<script>' })], new Set())).not.toContain('<script>');
  });

  it('shows the hit count', () => {
    const html = renderResults([result({
      hits: [
        { blockIndex: 0, snippet: 'a', matches: [], score: 1 },
        { blockIndex: 1, snippet: 'b', matches: [], score: 1 }
      ]
    })], new Set());
    expect(html).toContain('2');
  });
});

describe('renderRecent', () => {
  it('is empty when nothing has been read', () => {
    expect(renderRecent([], [])).toBe('');
  });

  it('lists a read note by title, newest first', () => {
    const notes = [
      { path: 'vault/a.md', title: 'DNS' },
      { path: 'vault/b.md', title: 'TCP' }
    ] as NoteDoc[];
    const html = renderRecent(notes, ['vault/b.md', 'vault/a.md']);
    expect(html.indexOf('TCP')).toBeLessThan(html.indexOf('DNS'));
  });

  it('skips a path no longer in the corpus rather than rendering a dead row', () => {
    const notes = [{ path: 'vault/a.md', title: 'DNS' }] as NoteDoc[];
    expect(renderRecent(notes, ['vault/gone.md'])).toBe('');
  });

  it('escapes a title containing html', () => {
    const notes = [{ path: 'vault/a.md', title: '<script>' }] as NoteDoc[];
    expect(renderRecent(notes, ['vault/a.md'])).not.toContain('<script>');
  });
});

describe('renderSearchState', () => {
  it('says notes are unavailable rather than claiming no matches', () => {
    const html = renderSearchState('unavailable', 'dns');
    expect(html).toMatch(/download|offline|unavailable/i);
    expect(html).not.toMatch(/no matches/i);
  });

  it('says no matches, naming the query', () => {
    expect(renderSearchState('no-matches', 'zebra')).toContain('zebra');
  });

  it('escapes the query in the no-matches message', () => {
    expect(renderSearchState('no-matches', '<script>')).not.toContain('<script>');
  });
});
