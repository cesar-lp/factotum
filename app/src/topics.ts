import type { ReviewState, StoredCard } from './db/schema.js';
import { isDue } from './scheduler/fsrs.js';
import type { Notes } from '../../pipeline/src/types.js';

export interface CategorySummary {
  category: string;
  dueCount: number;
  newCount: number;
}

export interface TopicSummary {
  topic: string;
  categories: CategorySummary[];
}

/**
 * Groups the deck into topic → category with per-category due and new
 * counts, sorted by name at both levels so the picker's ordering is stable
 * across renders and independent of card insertion order.
 *
 * Counts deliberately ignore `disabledCategories`: they describe the
 * MATERIAL, not the daily queue, so a muted shelf still shows what is
 * waiting behind it. The same "due" and "new" tests the scheduler uses
 * apply here (no state = new; state, not suspended, past its due time =
 * due), so a category's counts always match what a focused session over it
 * would actually serve.
 *
 * A category appears as soon as it has any live (non-tombstoned) card,
 * even when nothing of it is due or new right now — such a category shows
 * `0 due / 0 new` rather than vanishing. It has to: the picker is also
 * where a category is muted, and being caught up on a topic is exactly
 * when you would want to mute it before it comes due again. Only a
 * category whose every card is tombstoned disappears, because then there
 * is genuinely nothing to offer and nothing to toggle.
 */
export function summarizeTopics(
  cards: StoredCard[],
  reviews: Map<string, ReviewState>,
  now: Date
): TopicSummary[] {
  const byTopic = new Map<string, Map<string, CategorySummary>>();

  for (const card of cards) {
    if (card.tombstoned) continue;

    // Register the category before any counting guard, so a caught-up or
    // fully-suspended category still renders (with zero counts) and stays
    // toggleable.
    const categories = byTopic.get(card.topic) ?? new Map<string, CategorySummary>();
    const summary = categories.get(card.category) ?? { category: card.category, dueCount: 0, newCount: 0 };
    categories.set(card.category, summary);
    byTopic.set(card.topic, categories);

    const state = reviews.get(card.id);
    if (state?.suspended) continue;

    const isNew = !state;
    if (!isNew && !isDue(state, now)) continue;

    if (isNew) summary.newCount += 1;
    else summary.dueCount += 1;
  }

  return [...byTopic.entries()]
    .map(([topic, categories]) => ({
      topic,
      categories: [...categories.values()].sort((a, b) => a.category.localeCompare(b.category))
    }))
    .sort((a, b) => a.topic.localeCompare(b.topic));
}

/**
 * Whether a focused session over `category` would serve anything. Used to
 * validate a `#focus/...` hash, which — like any hash — can arrive from a
 * stale history entry, a reload or a bookmark rather than from a tap on a
 * button that only renders when the category is real.
 */
/**
 * Groups notes under their category, for the topics screen's third level.
 *
 * Sorted by title rather than path so the list reads the way the note is
 * named, and so ordering never depends on directory layout -- matching how
 * summarizeTopics sorts by name at both its levels.
 */
export function notesByCategory(notes: Notes): Map<string, { path: string; title: string }[]> {
  const byCategory = new Map<string, { path: string; title: string }[]>();
  for (const note of notes.notes) {
    const list = byCategory.get(note.category) ?? [];
    list.push({ path: note.path, title: note.title });
    byCategory.set(note.category, list);
  }
  for (const list of byCategory.values()) list.sort((a, b) => a.title.localeCompare(b.title));
  return byCategory;
}

export function hasFocusableCards(topics: TopicSummary[], category: string): boolean {
  return topics.some((topic) =>
    topic.categories.some((c) => c.category === category && c.dueCount + c.newCount > 0)
  );
}
