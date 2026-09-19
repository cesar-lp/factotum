import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseNote, buildDeck, processVault, markdownFiles } from '../src/build.js';

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
