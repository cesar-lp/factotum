import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseFrontmatter } from './frontmatter.js';
import { parseCards } from './cards.js';
import { assignIds, writeBackIds } from './ids.js';
import type { Deck, DeckCard, ParsedNote } from './types.js';

export interface ParseNoteResult {
  note: ParsedNote | null;
  updatedSource: string;
}

export function parseNote(path: string, raw: string, taken: Set<string>): ParseNoteResult {
  const { meta, body, bodyStartLine } = parseFrontmatter(raw);
  if (!meta) return { note: null, updatedSource: raw };

  const cards = assignIds(parseCards(body, bodyStartLine), taken);
  const note: ParsedNote = { path, ...meta, cards };
  return { note, updatedSource: writeBackIds(raw, cards) };
}

export function buildDeck(notes: ParsedNote[], now: Date): Deck {
  const seen = new Set<string>();
  const cards: DeckCard[] = [];

  for (const note of notes) {
    for (const card of note.cards) {
      if (!card.id) throw new Error(`Card without id in ${note.path}`);
      if (seen.has(card.id)) throw new Error(`Duplicate card id ${card.id} in ${note.path}`);
      seen.add(card.id);

      const deckCard: DeckCard = {
        id: card.id,
        format: card.format,
        category: note.category,
        tags: note.tags,
        prompt: card.prompt,
        source: { path: note.path, block: card.id },
        citations: note.citations
      };
      if (card.answer !== undefined) deckCard.answer = card.answer;
      if (card.choices !== undefined) deckCard.choices = card.choices;
      cards.push(deckCard);
    }
  }

  return { generatedAt: now.toISOString(), cards };
}

/**
 * Recursively collects markdown file paths under `dir`.
 *
 * Skips dot-directories (e.g. `.obsidian/`, which real Obsidian vaults always
 * have, and which some plugins fill with `.md`-suffixed data that is not a
 * note) and skips symlinks entirely — following a symlinked directory can
 * recurse forever (a self-referential link raises ELOOP and crashes the
 * build) or double-count a target reachable another way.
 */
export function markdownFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((dirent) => {
    if (dirent.isSymbolicLink()) return [];
    const full = join(dir, dirent.name);
    if (dirent.isDirectory()) {
      if (dirent.name.startsWith('.')) return [];
      return markdownFiles(full);
    }
    return full.endsWith('.md') ? [full] : [];
  });
}

/**
 * Walks `vaultDir`, parses every note, assigns/writes back ids, and returns
 * the parsed notes ready for `buildDeck`.
 *
 * `taken` is a single Set created once here and threaded through every
 * note's `parseNote` call, so generated ids are unique across the whole
 * vault rather than merely within one file.
 *
 * Source paths are computed relative to `vaultDir`'s PARENT directory
 * (e.g. `vault/networking/tcp.md`), not `process.cwd()` — a cwd-relative
 * path would depend on where the CLI happens to be invoked from and could
 * bake a fragile, non-reproducible path into the committed deck.json.
 *
 * A failure while processing any single note is re-thrown with that note's
 * file path attached, so a malformed note in a large vault is identifiable
 * instead of surfacing as a bare, file-less stack trace. This intentionally
 * does not swallow the error and continue: a partial deck would silently
 * tombstone every card from the broken note during the app's merge step,
 * which is worse than a failed build.
 */
export function processVault(vaultDir: string): ParsedNote[] {
  const pathBase = resolve(vaultDir, '..');
  const taken = new Set<string>();
  const notes: ParsedNote[] = [];

  for (const file of markdownFiles(vaultDir).sort()) {
    try {
      const raw = readFileSync(file, 'utf8');
      const rel = relative(pathBase, file);
      const { note, updatedSource } = parseNote(rel, raw, taken);
      if (updatedSource !== raw) writeFileSync(file, updatedSource, 'utf8');
      if (note) notes.push(note);
    } catch (error) {
      throw new Error(`Failed to process ${file}: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error
      });
    }
  }

  return notes;
}
