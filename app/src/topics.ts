import type { ReviewState, StoredCard } from './db/schema.js';
import { isDue } from './scheduler/fsrs.js';

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
 * A category whose cards are all tombstoned disappears entirely — there is
 * nothing to offer and nothing to toggle.
 */
export function summarizeTopics(
  cards: StoredCard[],
  reviews: Map<string, ReviewState>,
  now: Date
): TopicSummary[] {
  const byTopic = new Map<string, Map<string, CategorySummary>>();

  for (const card of cards) {
    if (card.tombstoned) continue;
    const state = reviews.get(card.id);
    if (state?.suspended) continue;

    const isNew = !state;
    if (!isNew && !isDue(state, now)) continue;

    const categories = byTopic.get(card.topic) ?? new Map<string, CategorySummary>();
    const summary = categories.get(card.category) ?? { category: card.category, dueCount: 0, newCount: 0 };
    if (isNew) summary.newCount += 1;
    else summary.dueCount += 1;
    categories.set(card.category, summary);
    byTopic.set(card.topic, categories);
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
export function hasFocusableCards(topics: TopicSummary[], category: string): boolean {
  return topics.some((topic) =>
    topic.categories.some((c) => c.category === category && c.dueCount + c.newCount > 0)
  );
}
