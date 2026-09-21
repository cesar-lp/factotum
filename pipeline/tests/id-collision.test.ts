import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { processVault, buildDeck, collectAnchors } from '../src/build.js';

const note = (body: string) => `---\ncategory: networking\n---\n\n${body}\n`;

/** Feeds `generateId` the exact draws that spell `card-<suffix>`. */
function drawsFor(suffix: string): number[] {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return [...suffix].map((ch) => alphabet.indexOf(ch) / alphabet.length);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('card id collisions across the vault', () => {
  it('collects anchors from every file, not just the ones parsed', () => {
    const root = mkdtempSync(join(tmpdir(), 'factotum-anchors-'));
    const vaultDir = join(root, 'vault');
    mkdirSync(join(vaultDir, 'zzz'), { recursive: true });
    // No frontmatter at all, so this file yields no note -- but its anchor is
    // still a real card id that must not be handed out again.
    writeFileSync(join(vaultDir, 'zzz', 'orphan.md'), 'MTU is ==1500 bytes==. ^card-zzzz\n', 'utf8');

    try {
      expect(collectAnchors([join(vaultDir, 'zzz', 'orphan.md')])).toEqual(new Set(['card-zzzz']));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('never mints an id owned by a note that sorts later in the vault', () => {
    const root = mkdtempSync(join(tmpdir(), 'factotum-collision-'));
    const vaultDir = join(root, 'vault');
    mkdirSync(join(vaultDir, 'aaa'), { recursive: true });
    mkdirSync(join(vaultDir, 'zzz'), { recursive: true });

    // Sorts first and needs an id minted.
    const unanchored = join(vaultDir, 'aaa', 'new-note.md');
    writeFileSync(unanchored, note('An MTU of ==1500 bytes== is the default.'), 'utf8');
    // Sorts last and already owns card-abcd.
    writeFileSync(join(vaultDir, 'zzz', 'old-note.md'), note('A jumbo frame is ==9000 bytes==. ^card-abcd'), 'utf8');

    // Force the first draw to land exactly on the already-owned id, then settle
    // on `card-aaaa`. Before the vault-wide pre-scan, the first draw was
    // accepted and `buildDeck` threw on the duplicate.
    const random = vi.spyOn(Math, 'random');
    for (const draw of drawsFor('abcd')) random.mockReturnValueOnce(draw);
    random.mockReturnValue(0);

    try {
      const { notes } = processVault(vaultDir);
      const minted = notes.find((n) => n.path.endsWith('new-note.md'))?.cards[0]?.id;
      expect(minted).toBe('card-aaaa');
      expect(readFileSync(unanchored, 'utf8')).toContain('^card-aaaa');
      expect(() => buildDeck(notes, new Date())).not.toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
