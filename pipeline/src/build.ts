import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseFrontmatter } from './frontmatter.js';
import { parseCards, parseBlocks } from './cards.js';
import { assignIds, writeBackIds } from './ids.js';
import type { Deck, DeckCard, Notes, NoteBlock, NoteDoc, ParsedCard, ParsedNote, RawBlock } from './types.js';

/**
 * JSON.stringify with object keys sorted so two objects with identical
 * content but different key insertion order compare equal. Array order is
 * left untouched since it can be semantically meaningful (e.g. `choices`).
 *
 * Local equivalent of `app/src/db/deck.ts`'s `stableStringify`, kept in sync
 * with it deliberately rather than imported — the pipeline and app packages
 * do not share source across that boundary.
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : val
  );
}

/**
 * Compares two card arrays for equality ignoring array order (cards are
 * identified by `id`, same as the app's deck merge) and ignoring key order
 * within each card object.
 */
function cardsEqual(a: DeckCard[], b: DeckCard[]): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(a.map((card) => [card.id, stableStringify(card)]));
  for (const card of b) {
    if (byId.get(card.id) !== stableStringify(card)) return false;
  }
  return true;
}

/**
 * Reads `path` and returns its parsed Deck, or null if the file does not
 * exist, is not valid JSON, or does not have the shape of a Deck (e.g. the
 * first build, a corrupted commit, or a bad merge resolution) — in every
 * case we should rebuild fresh rather than crash.
 */
export function readExistingDeck(path: string): Deck | null {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`${path} exists but is not valid JSON; rebuilding fresh`);
    return null;
  }
  if (!parsed || typeof parsed !== 'object') {
    console.warn(`${path} exists but is not a valid deck (not an object); rebuilding fresh`);
    return null;
  }
  const candidate = parsed as { generatedAt?: unknown; cards?: unknown };
  if (typeof candidate.generatedAt !== 'string') {
    console.warn(`${path} exists but is not a valid deck (generatedAt is not a string); rebuilding fresh`);
    return null;
  }
  if (!Array.isArray(candidate.cards) || candidate.cards.some((card) => !card || typeof card !== 'object')) {
    console.warn(`${path} exists but is not a valid deck (cards is not an array of objects); rebuilding fresh`);
    return null;
  }
  return parsed as Deck;
}

/**
 * Preserves `existing.generatedAt` on `deck` when both decks carry the same
 * cards (ignoring array order and object key order), so a rebuild whose
 * content did not actually change produces byte-identical output — no
 * timestamp churn, no pointless CI commit.
 *
 * `existing` is null for a first build or an unreadable/malformed prior
 * file, in which case `deck`'s own fresh timestamp is kept, same as today.
 *
 * After this, `generatedAt` means "when the deck content last actually
 * changed", not "when CI last ran".
 */
export function withStableGeneratedAt(deck: Deck, existing: Deck | null): Deck {
  if (existing && cardsEqual(existing.cards, deck.cards)) {
    return { ...deck, generatedAt: existing.generatedAt };
  }
  return deck;
}

export interface ParseNoteResult {
  note: ParsedNote | null;
  updatedSource: string;
  /** The frontmatter-stripped body, kept so `buildNotes` need not re-read the file. */
  body: string;
}

export function parseNote(path: string, raw: string, taken: Set<string>): ParseNoteResult {
  const { meta, body, bodyStartLine } = parseFrontmatter(raw);
  if (!meta) return { note: null, updatedSource: raw, body };

  const cards = assignIds(parseCards(body, bodyStartLine), taken);
  const note: ParsedNote = { path, ...meta, cards };
  return { note, updatedSource: writeBackIds(raw, cards), body };
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
        topic: note.topic,
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
export function processVault(vaultDir: string): { notes: ParsedNote[]; bodies: Map<string, string> } {
  const pathBase = resolve(vaultDir, '..');
  const taken = new Set<string>();
  const notes: ParsedNote[] = [];
  const bodies = new Map<string, string>();

  for (const file of markdownFiles(vaultDir).sort()) {
    try {
      const raw = readFileSync(file, 'utf8');
      const rel = relative(pathBase, file);
      const { note, updatedSource, body } = parseNote(rel, raw, taken);
      if (updatedSource !== raw) writeFileSync(file, updatedSource, 'utf8');
      if (note) {
        notes.push(note);
        bodies.set(note.path, body);
      }
    } catch (error) {
      throw new Error(`Failed to process ${file}: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error
      });
    }
  }

  return { notes, bodies };
}

/**
 * Replaces each block's `cardIndex` ordinal with the id `assignIds` gave
 * the card at that position.
 *
 * The zip must be TOTAL: every ordinal resolves and every card is consumed.
 * `parseBlocks` and `parseCards` walk the same structure in the same order,
 * and this is where that claim is checked -- on every build of every note,
 * not only in the corpus test. A silent mismatch would mask the wrong card,
 * or reveal a due one, so it throws instead.
 */
export function resolveBlocks(blocks: RawBlock[], cards: ParsedCard[], path: string): NoteBlock[] {
  const consumed = new Set<number>();

  const idFor = (index: number): string => {
    const card = cards[index];
    if (!card?.id) {
      throw new Error(
        `${path}: block references card ordinal ${index}, but parseCards produced ${cards.length} card(s). ` +
        'parseBlocks and parseCards have drifted -- likely a cloze or `::` inside a heading, list item, or ' +
        'non-card blockquote, which parseCards treats as a card but parseBlocks does not.'
      );
    }
    consumed.add(index);
    return card.id;
  };

  const resolved: NoteBlock[] = blocks.map((block) => {
    if (block.kind === 'prose') {
      return {
        kind: 'prose',
        text: block.text,
        clozes: block.clozes.map(({ start, end, answer, cardIndex }) => ({
          start, end, answer, cardId: idFor(cardIndex)
        }))
      };
    }
    if (block.kind === 'qa') {
      return { kind: 'qa', cardId: idFor(block.cardIndex), prompt: block.prompt, answer: block.answer };
    }
    if (block.kind === 'card') {
      const base = { kind: 'card' as const, cardId: idFor(block.cardIndex), format: block.format, prompt: block.prompt };
      if (block.choices !== undefined) return { ...base, choices: block.choices };
      if (block.answer !== undefined) return { ...base, answer: block.answer };
      return base;
    }
    return block;
  });

  if (consumed.size !== cards.length) {
    const missing = cards.map((_, i) => i).filter((i) => !consumed.has(i));
    throw new Error(
      `${path}: ${missing.length} card(s) produced by parseCards are referenced by no block ` +
      `(ordinals ${missing.join(', ')}). parseBlocks and parseCards have drifted.`
    );
  }

  return resolved;
}

/** First h1 if the note has one, else the filename stem. */
export function noteTitle(path: string, blocks: NoteBlock[]): string {
  const h1 = blocks.find((block) => block.kind === 'heading' && block.level === 1);
  if (h1 && h1.kind === 'heading' && h1.text !== '') return h1.text;
  return (path.split('/').pop() ?? path).replace(/\.md$/, '');
}

export function buildNotes(notes: ParsedNote[], bodies: Map<string, string>, now: Date): Notes {
  const docs: NoteDoc[] = notes.map((note) => {
    const body = bodies.get(note.path);
    if (body === undefined) throw new Error(`No body captured for ${note.path}`);
    const blocks = resolveBlocks(parseBlocks(body), note.cards, note.path);
    return {
      path: note.path,
      title: noteTitle(note.path, blocks),
      topic: note.topic,
      category: note.category,
      citations: note.citations,
      blocks
    };
  });

  // Sorted by path so output order never depends on directory traversal.
  docs.sort((a, b) => a.path.localeCompare(b.path));
  return { generatedAt: now.toISOString(), notes: docs };
}

/** Same contract as `readExistingDeck`: anything unreadable or malformed rebuilds fresh. */
export function readExistingNotes(path: string): Notes | null {
  let raw: string;
  try { raw = readFileSync(path, 'utf8'); } catch { return null; }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch {
    console.warn(`${path} exists but is not valid JSON; rebuilding fresh`);
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const candidate = parsed as { generatedAt?: unknown; notes?: unknown };
  if (typeof candidate.generatedAt !== 'string') return null;
  if (!Array.isArray(candidate.notes)) return null;
  return parsed as Notes;
}

/**
 * The notes.json counterpart of `withStableGeneratedAt`. Same reason: CI
 * gates PRs on `git status --porcelain` printing nothing after a rebuild,
 * so a timestamp that churns on every run fails unrelated PRs.
 */
export function withStableNotesGeneratedAt(next: Notes, existing: Notes | null): Notes {
  if (existing && stableStringify(existing.notes) === stableStringify(next.notes)) {
    return { ...next, generatedAt: existing.generatedAt };
  }
  return next;
}
