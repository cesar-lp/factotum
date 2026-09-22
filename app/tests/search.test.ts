import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { blockText, parseQuery, search, snippetAround } from '../src/search.js';
import type { NoteDoc, Notes } from '../../pipeline/src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const note = (over: Partial<NoteDoc> = {}): NoteDoc => ({
  path: 'vault/a.md', title: 'DNS', topic: 'networking', category: 'networking',
  tags: [], citations: [], blocks: [], ...over
});
const corpus = (...notes: NoteDoc[]): Notes => ({ generatedAt: '2026-09-20T00:00:00Z', notes });

describe('parseQuery', () => {
  it('lowercases and splits on whitespace', () => {
    expect(parseQuery('  Consistent   Hashing ')).toEqual(['consistent', 'hashing']);
  });

  it('returns an empty list for a blank query', () => {
    expect(parseQuery('   ')).toEqual([]);
  });

  it('dedupes a repeated term', () => {
    expect(parseQuery('hash hash')).toEqual(['hash']);
  });
});

describe('blockText', () => {
  it('joins a qa prompt and its answer', () => {
    const out = blockText({ kind: 'qa', cardId: 'card-aaaa', prompt: 'What is X?', answer: 'A thing.' });
    expect(out.text).toContain('What is X?');
    expect(out.text).toContain('A thing.');
  });

  it('includes mcq choice texts', () => {
    const out = blockText({
      kind: 'card', cardId: 'card-aaaa', format: 'mcq', prompt: 'Which layer?',
      choices: [{ text: 'Transport', correct: true }, { text: 'Network', correct: false }]
    });
    expect(out.text).toContain('Transport');
    expect(out.text).toContain('Network');
  });

  it('includes code fences -- syntax lookup is a stated purpose of this app', () => {
    expect(blockText({ kind: 'code', lang: 'sql', text: 'SELECT 1' }).text).toBe('SELECT 1');
  });
});

describe('search', () => {
  it('returns nothing for a query below the minimum length', () => {
    expect(search(corpus(note({ title: 'DNS' })), 'a')).toEqual([]);
  });

  it('matches a note title', () => {
    const results = search(corpus(note({ title: 'DNS' })), 'dns');
    expect(results.map((r) => r.path)).toEqual(['vault/a.md']);
  });

  it('matches a tag the prose never spells', () => {
    const results = search(corpus(note({ title: 'Transport', tags: ['tcp'] })), 'tcp');
    expect(results).toHaveLength(1);
  });

  it('requires EVERY term to match somewhere in the note', () => {
    const n = note({ blocks: [{ kind: 'prose', text: 'consistent hashing is useful', clozes: [] }] });
    expect(search(corpus(n), 'consistent hashing')).toHaveLength(1);
    expect(search(corpus(n), 'consistent zebra')).toHaveLength(0);
  });

  it('matches a word prefix, so hash finds hashing', () => {
    const n = note({ blocks: [{ kind: 'prose', text: 'consistent hashing', clozes: [] }] });
    expect(search(corpus(n), 'hash')).toHaveLength(1);
  });

  it('does not match mid-word, so ip does not find multiple', () => {
    const n = note({ title: 'x', blocks: [{ kind: 'prose', text: 'multiple things', clozes: [] }] });
    expect(search(corpus(n), 'ip')).toHaveLength(0);
  });

  it('does not throw on regex metacharacters in the query', () => {
    const n = note({ blocks: [{ kind: 'code', lang: 'cpp', text: 'c++ vector' }] });
    expect(() => search(corpus(n), 'c++')).not.toThrow();
    expect(search(corpus(n), 'c++')).toHaveLength(1);
  });

  it('ranks a title match above a body-only match', () => {
    const titled = note({ path: 'vault/t.md', title: 'Consistent hashing' });
    const bodied = note({
      path: 'vault/b.md', title: 'Other',
      blocks: [{ kind: 'prose', text: 'consistent hashing appears here', clozes: [] }]
    });
    const results = search(corpus(bodied, titled), 'consistent hashing');
    expect(results[0]?.path).toBe('vault/t.md');
  });

  it('ranks all-terms-in-one-block above terms scattered across blocks', () => {
    const together = note({
      path: 'vault/1.md', title: 'x',
      blocks: [{ kind: 'prose', text: 'alpha and beta together', clozes: [] }]
    });
    const apart = note({
      path: 'vault/2.md', title: 'x',
      blocks: [
        { kind: 'prose', text: 'alpha alone', clozes: [] },
        { kind: 'prose', text: 'beta alone', clozes: [] }
      ]
    });
    const results = search(corpus(apart, together), 'alpha beta');
    expect(results[0]?.path).toBe('vault/1.md');
  });

  it('carries hits with the block index they came from', () => {
    const n = note({
      blocks: [
        { kind: 'heading', level: 1, text: 'DNS' },
        { kind: 'prose', text: 'records carry a ttl', clozes: [] }
      ]
    });
    expect(search(corpus(n), 'ttl')[0]?.hits[0]?.blockIndex).toBe(1);
  });

  it('finds a cloze answer, which lives inside the prose text', () => {
    const n = note({
      title: 'x',
      blocks: [{
        kind: 'prose', text: 'Default MTU is 1500 bytes.',
        clozes: [{ start: 18, end: 28, cardId: 'card-aaaa', answer: '1500 bytes' }]
      }]
    });
    expect(search(corpus(n), '1500')).toHaveLength(1);
  });

  it('caps the number of notes returned', () => {
    const many = Array.from({ length: 50 }, (_, i) => note({ path: `vault/${i}.md`, title: 'DNS' }));
    expect(search(corpus(...many), 'dns').length).toBeLessThanOrEqual(30);
  });

  it('a doubled query term returns the same notes as the single term, not zero', () => {
    // Before parseQuery deduped, `found.size` (from a Set, so capped at 1
    // distinct term) could never equal `terms.length` (2, undeduped),
    // failing the AND check and returning nothing for every note.
    const n = note({ blocks: [{ kind: 'prose', text: 'consistent hashing is useful', clozes: [] }] });
    const single = search(corpus(n), 'hash');
    const doubled = search(corpus(n), 'hash hash');
    expect(doubled).toHaveLength(1);
    expect(doubled.map((r) => r.path)).toEqual(single.map((r) => r.path));
  });

  it('does not throw on a note from a previous deploy missing the `tags` field', () => {
    // Models a stale `notes.json` served from the cache-fallback path before
    // this branch's `tags` field existed. The cast is deliberate: the real
    // bug is a runtime payload shape that predates the current type (a
    // previous deploy's JSON), not a hole in this test's own typing.
    const { tags: _tags, ...withoutTags } = note({ title: 'DNS' });
    const stale = withoutTags as NoteDoc;
    expect(() => search(corpus(stale), 'dns')).not.toThrow();
    expect(search(corpus(stale), 'dns')).toHaveLength(1);
  });
});

describe('snippetAround', () => {
  it('returns the whole text when it is shorter than the window', () => {
    const out = snippetAround('short text', [{ start: 0, end: 5 }], 80);
    expect(out.snippet).toBe('short text');
    expect(out.matches).toEqual([{ start: 0, end: 5 }]);
  });

  it('ellipsises and re-bases offsets when it trims the front', () => {
    const text = 'x'.repeat(200) + ' needle tail';
    const start = text.indexOf('needle');
    const out = snippetAround(text, [{ start, end: start + 6 }], 20);
    expect(out.snippet.startsWith('…')).toBe(true);
    expect(out.snippet.slice(out.matches[0]!.start, out.matches[0]!.end)).toBe('needle');
  });

  it('keeps offsets pointing at the matched text when nothing is trimmed', () => {
    const text = 'the needle here';
    const out = snippetAround(text, [{ start: 4, end: 10 }], 80);
    expect(out.snippet.slice(out.matches[0]!.start, out.matches[0]!.end)).toBe('needle');
  });
});

// The real, built notes.json -- not a fixture. Same idiom as
// note-render.test.ts's corpus block.
const NOTES_PATH = resolve(__dirname, '../../deck/notes.json');

describe('search over the real notes corpus', () => {
  let real: Notes;

  beforeAll(() => {
    real = JSON.parse(readFileSync(NOTES_PATH, 'utf8')) as Notes;
  });

  it('loaded a real, substantial notes.json (sanity guard against a broken path)', () => {
    expect(real.notes.length).toBeGreaterThan(100);
  });

  it('finds a term that certainly exists in the vault', () => {
    const results = search(real, 'tcp');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.hits.length).toBeGreaterThan(0);
  });

  it('returns nothing for a term that certainly does not', () => {
    expect(search(real, 'zzzzqqqx')).toEqual([]);
  });

  it('every hit offset lands inside its own snippet', () => {
    // The offset bug this guards is silent: a match pointing past the end
    // of its snippet renders as a highlight of nothing.
    for (const result of search(real, 'consistent hashing')) {
      for (const hit of result.hits) {
        for (const match of hit.matches) {
          expect(match.start).toBeGreaterThanOrEqual(0);
          expect(match.end).toBeLessThanOrEqual(hit.snippet.length);
        }
      }
    }
  });
});

describe('math block indexing', () => {
  it('indexes a math block on its raw LaTeX source', () => {
    const { text } = blockText({ kind: 'math', text: '\\nabla f(x) = 0' });
    expect(text).toBe('\\nabla f(x) = 0');
  });
});
