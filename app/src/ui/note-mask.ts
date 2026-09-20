import type { ReviewState } from '../db/schema.js';
import type { NoteBlock, NoteDoc } from '../../../pipeline/src/types.js';
import { isDue } from '../scheduler/fsrs.js';

/** Every card id this block stream references, in walk order. */
export function blockCardIds(blocks: NoteBlock[]): string[] {
  return blocks.flatMap((block) =>
    block.kind === 'prose' ? block.clozes.map((c) => c.cardId)
    : block.kind === 'qa' || block.kind === 'card' ? [block.cardId]
    : []
  );
}

/**
 * Which of this note's cards render masked.
 *
 * MASK IFF DUE. New cards stay visible: masking protects a pending test,
 * and a card never asked has none. The note is the source material you
 * would learn it from, so reading before a first review is studying, which
 * is the normal order of operations. Masking new cards would invert the
 * property that makes this worth building -- a freshly written note would
 * be fully blurred on the day you most want to read it.
 *
 * `arrivedFrom` is the card you opened the note from in review. It is by
 * definition due, and is deliberately exempt: you just answered it, so
 * there is nothing left to protect.
 *
 * Due-ness comes from `isDue`, never re-derived -- there must not be a
 * second notion of "due" in this app.
 */
export function maskedCardIds(
  note: NoteDoc,
  reviews: Map<string, ReviewState>,
  now: Date,
  arrivedFrom: string | null
): Set<string> {
  const masked = new Set<string>();
  for (const cardId of blockCardIds(note.blocks)) {
    if (cardId === arrivedFrom) continue;
    const state = reviews.get(cardId);
    if (!state) continue;          // new: nothing to protect
    if (state.suspended) continue; // never going to be asked
    if (isDue(state, now)) masked.add(cardId);
  }
  return masked;
}
