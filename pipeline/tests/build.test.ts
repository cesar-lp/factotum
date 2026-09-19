import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseNote,
  buildDeck,
  processVault,
  markdownFiles,
  readExistingDeck,
  withStableGeneratedAt
} from '../src/build.js';
import type { Deck } from '../src/types.js';

const raw = [
  '---',
  'category: networking',
  'tags: [tcp]',
  'citations: ["RFC 793 §1.4"]',
  '---',
  '',
  'Default Ethernet MTU is ==1500 bytes==.'
].join('\n');

describe('parseNote', () => {
  it('returns a note with ids assigned and source updated', () => {
    const { note, updatedSource } = parseNote('vault/networking/tcp.md', raw, new Set());
    expect(note?.category).toBe('networking');
    expect(note?.cards).toHaveLength(1);
    expect(note?.cards[0]?.id).toMatch(/^card-[a-z0-9]{4}$/);
    expect(updatedSource).toContain(`^${note?.cards[0]?.id}`);
  });

  it('skips notes without a category and leaves the source untouched', () => {
    const { note, updatedSource } = parseNote('vault/daily.md', '# Draft ==x==', new Set());
    expect(note).toBeNull();
    expect(updatedSource).toBe('# Draft ==x==');
  });
});

describe('buildDeck', () => {
  it('flattens notes into deck cards carrying category, tags, citations and source', () => {
    const { note } = parseNote('vault/networking/tcp.md', raw, new Set());
    const deck = buildDeck(note ? [note] : [], new Date('2026-09-18T10:00:00Z'));

    expect(deck.generatedAt).toBe('2026-09-18T10:00:00.000Z');
    expect(deck.cards).toHaveLength(1);
    const card = deck.cards[0];
    expect(card?.category).toBe('networking');
    expect(card?.tags).toEqual(['tcp']);
    expect(card?.citations).toEqual(['RFC 793 §1.4']);
    expect(card?.prompt).toBe('Default Ethernet MTU is ___.');
    expect(card?.answer).toBe('1500 bytes');
    expect(card?.source.path).toBe('vault/networking/tcp.md');
    expect(card?.source.block).toBe(card?.id);
  });

  it('omits choices for non-mcq cards and answer for recall cards', () => {
    const recallRaw = ['---', 'category: networking', '---', '> [!card] recall', '> Explain ARQ.'].join('\n');
    const { note } = parseNote('vault/networking/arq.md', recallRaw, new Set());
    const card = buildDeck(note ? [note] : [], new Date()).cards[0];
    expect(card && 'choices' in card).toBe(false);
    expect(card && 'answer' in card).toBe(false);
  });

  it('throws on duplicate ids across notes', () => {
    const a = parseNote('a.md', '---\ncategory: x\n---\nA ==b==. ^card-dupe', new Set()).note;
    const b = parseNote('b.md', '---\ncategory: x\n---\nC ==d==. ^card-dupe', new Set()).note;
    expect(() => buildDeck([a!, b!], new Date())).toThrow(/card-dupe/);
  });
});

describe('processVault', () => {
  it('produces a source path relative to the vault parent, independent of process.cwd()', () => {
    // Built under the OS temp dir, which is not under process.cwd() — proves the
    // path does not depend on where the CLI happens to be invoked from.
    const root = mkdtempSync(join(tmpdir(), 'factotum-vault-'));
    const vaultDir = join(root, 'vault');
    mkdirSync(join(vaultDir, 'networking'), { recursive: true });
    writeFileSync(
      join(vaultDir, 'networking', 'tcp.md'),
      '---\ncategory: networking\n---\n\nDefault MTU is ==1500 bytes==.\n',
      'utf8'
    );

    try {
      const notes = processVault(vaultDir);
      expect(notes).toHaveLength(1);
      expect(notes[0]?.path).toBe('vault/networking/tcp.md');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('throws an error naming the file when a note has malformed frontmatter', () => {
    const root = mkdtempSync(join(tmpdir(), 'factotum-vault-'));
    const vaultDir = join(root, 'vault');
    mkdirSync(vaultDir, { recursive: true });
    const badFile = join(vaultDir, 'broken.md');
    writeFileSync(badFile, '---\ncategory: [unterminated\n---\nBody', 'utf8');

    try {
      expect(() => processVault(vaultDir)).toThrow(badFile);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('markdownFiles', () => {
  it('skips a .obsidian directory even when it contains markdown-suffixed data', () => {
    const root = mkdtempSync(join(tmpdir(), 'factotum-vault-'));
    mkdirSync(join(root, '.obsidian'), { recursive: true });
    writeFileSync(join(root, '.obsidian', 'workspace.md'), 'not a note', 'utf8');
    writeFileSync(join(root, 'real.md'), '# real', 'utf8');

    try {
      expect(markdownFiles(root)).toEqual([join(root, 'real.md')]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('skips a symlinked directory instead of following it', () => {
    const root = mkdtempSync(join(tmpdir(), 'factotum-vault-'));
    const target = join(root, 'target');
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, 'note.md'), '# note', 'utf8');
    const link = join(root, 'link');

    let symlinked = true;
    try {
      symlinkSync(target, link, 'dir');
    } catch {
      symlinked = false;
    }

    try {
      if (!symlinked) return; // symlink creation unsupported on this platform; skip assertion
      expect(markdownFiles(root)).toEqual([join(target, 'note.md')]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('readExistingDeck', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when the file does not exist', () => {
    const root = mkdtempSync(join(tmpdir(), 'factotum-deck-'));
    try {
      expect(readExistingDeck(join(root, 'deck.json'))).toBeNull();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns null and warns when the file is malformed JSON', () => {
    const root = mkdtempSync(join(tmpdir(), 'factotum-deck-'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const path = join(root, 'deck.json');
      writeFileSync(path, '{ not valid json', 'utf8');
      expect(readExistingDeck(path)).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns null and warns when the file is valid JSON but missing a cards array', () => {
    const root = mkdtempSync(join(tmpdir(), 'factotum-deck-'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const path = join(root, 'deck.json');
      writeFileSync(path, '{}', 'utf8');
      expect(readExistingDeck(path)).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns null and warns when cards is present but not an array', () => {
    const root = mkdtempSync(join(tmpdir(), 'factotum-deck-'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const path = join(root, 'deck.json');
      writeFileSync(path, JSON.stringify({ generatedAt: '2020-01-01T00:00:00.000Z', cards: 'nope' }), 'utf8');
      expect(readExistingDeck(path)).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('parses a well-formed deck file', () => {
    const root = mkdtempSync(join(tmpdir(), 'factotum-deck-'));
    try {
      const path = join(root, 'deck.json');
      const deck: Deck = { generatedAt: '2026-09-18T10:00:00.000Z', cards: [] };
      writeFileSync(path, JSON.stringify(deck), 'utf8');
      expect(readExistingDeck(path)).toEqual(deck);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('withStableGeneratedAt', () => {
  const cardA = {
    id: 'card-aaaa',
    format: 'qa' as const,
    category: 'networking',
    tags: ['tcp'],
    prompt: 'What is TCP?',
    answer: 'A protocol',
    source: { path: 'vault/networking/tcp.md', block: 'card-aaaa' },
    citations: []
  };
  const cardB = {
    id: 'card-bbbb',
    format: 'qa' as const,
    category: 'networking',
    tags: ['udp'],
    prompt: 'What is UDP?',
    answer: 'Another protocol',
    source: { path: 'vault/networking/udp.md', block: 'card-bbbb' },
    citations: []
  };

  it('preserves the existing timestamp when cards are unchanged (same order)', () => {
    const existing: Deck = { generatedAt: '2020-01-01T00:00:00.000Z', cards: [cardA, cardB] };
    const built: Deck = { generatedAt: '2026-09-19T14:19:23.949Z', cards: [cardA, cardB] };
    expect(withStableGeneratedAt(built, existing).generatedAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('preserves the existing timestamp when cards are unchanged but reordered', () => {
    const existing: Deck = { generatedAt: '2020-01-01T00:00:00.000Z', cards: [cardA, cardB] };
    const built: Deck = { generatedAt: '2026-09-19T14:19:23.949Z', cards: [cardB, cardA] };
    expect(withStableGeneratedAt(built, existing).generatedAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('preserves the existing timestamp when a card has different key insertion order', () => {
    const reorderedA = {
      source: cardA.source,
      id: cardA.id,
      citations: cardA.citations,
      format: cardA.format,
      prompt: cardA.prompt,
      answer: cardA.answer,
      category: cardA.category,
      tags: cardA.tags
    };
    const existing: Deck = { generatedAt: '2020-01-01T00:00:00.000Z', cards: [cardA] };
    const built: Deck = { generatedAt: '2026-09-19T14:19:23.949Z', cards: [reorderedA] };
    expect(withStableGeneratedAt(built, existing).generatedAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('stamps a new timestamp when cards changed', () => {
    const existing: Deck = { generatedAt: '2020-01-01T00:00:00.000Z', cards: [cardA] };
    const changedA = { ...cardA, answer: 'A different answer' };
    const built: Deck = { generatedAt: '2026-09-19T14:19:23.949Z', cards: [changedA] };
    expect(withStableGeneratedAt(built, existing).generatedAt).toBe('2026-09-19T14:19:23.949Z');
  });

  it('stamps a new timestamp when there is no existing deck', () => {
    const built: Deck = { generatedAt: '2026-09-19T14:19:23.949Z', cards: [cardA] };
    expect(withStableGeneratedAt(built, null).generatedAt).toBe('2026-09-19T14:19:23.949Z');
  });

  it('rebuilds fresh instead of throwing when the existing file is malformed-shape ({})', () => {
    const root = mkdtempSync(join(tmpdir(), 'factotum-deck-'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const path = join(root, 'deck.json');
      writeFileSync(path, '{}', 'utf8');
      const built: Deck = { generatedAt: '2026-09-19T14:19:23.949Z', cards: [cardA] };
      expect(() => withStableGeneratedAt(built, readExistingDeck(path))).not.toThrow();
      expect(withStableGeneratedAt(built, readExistingDeck(path)).generatedAt).toBe('2026-09-19T14:19:23.949Z');
    } finally {
      vi.restoreAllMocks();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
