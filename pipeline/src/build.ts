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
