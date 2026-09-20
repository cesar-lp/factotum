import type { CategorySummary, TopicSummary } from '../topics.js';
import { categoryLabel } from './labels.js';

export interface TopicsProps {
  /** Every topic in the deck, disabled ones included — nothing is hidden. */
  topics: TopicSummary[];
  /** The categories currently switched off. */
  disabled: ReadonlySet<string>;
  /** Flip one category. `nextDisabled` is the state being moved TO. */
  onToggleCategory: (category: string, nextDisabled: boolean) => void;
  /** Flip a whole shelf. `nextDisabled` is the state being moved TO. */
  onToggleTopic: (topic: string, nextDisabled: boolean) => void;
  onLearn: (category: string) => void;
  onBack: () => void;
  /**
   * Notes per category, for browsing. Empty when notes.json has not loaded
   * yet -- it is fetched lazily, so this list is absent rather than broken,
   * and the rest of the screen must render exactly as before.
   */
  notes: ReadonlyMap<string, { path: string; title: string }[]>;
  onOpenNote: (path: string) => void;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sums a shelf's categories into the totals shown in its `.topic-head`.
 * Pure and DOM-free so it is unit-testable without a browser environment
 * (this repo's test suite runs under vitest's `node` environment).
 */
export function shelfCounts(categories: CategorySummary[]): { due: number; new: number } {
  return categories.reduce(
    (totals, c) => ({ due: totals.due + c.dueCount, new: totals.new + c.newCount }),
    { due: 0, new: 0 }
  );
}

/**
 * The topics screen: browse the deck by shelf, mute what you are not ready
 * for, and start a focused session on demand.
 *
 * A dumb renderer by design — every decision (what is disabled, what a
 * toggle means, what a tap does) arrives as a prop, so the logic lives in
 * main.ts where it is reachable from a node test environment. This mirrors
 * how renderDashboard is structured.
 *
 * Category names and note titles both come from free-form vault content, so
 * they are HTML-escaped on the way into innerHTML and carried on data
 * attributes rather than being interpolated into element ids.
 */
export function renderTopics(root: HTMLElement, props: TopicsProps): void {
  const sections = props.topics
    .map((topic) => {
      const allDisabled = topic.categories.every((c) => props.disabled.has(c.category));
      // Mixed or fully-on shelves mute; only a fully-muted shelf un-mutes.
      const nextDisabled = !allDisabled;
      const totals = shelfCounts(topic.categories);

      const rows = topic.categories
        .map((c) => {
          const off = props.disabled.has(c.category);
          const label = categoryLabel(c.category, topic.topic);
          const chipDim = c.dueCount === 0 ? ' chip-dim' : '';
          const notes = props.notes.get(c.category);
          const notesHtml = notes && notes.length > 0
            ? `
              <ul class="topic-notes">
                ${notes
                  .map(
                    (note) => `
                      <li>
                        <button class="btn-quiet topic-note" data-note-path="${escapeHtml(note.path)}">
                          ${escapeHtml(note.title)}
                        </button>
                      </li>
                    `
                  )
                  .join('')}
              </ul>
            `
            : '';
          // The name always gets its own line (see .topic-row-name's
          // flex-basis in topics.css) so it can never compete for width
          // with the chip or controls — at 375px "data structures" plus a
          // "94 new" chip plus "learn" plus a switch does not fit on one
          // line at any reasonable font size, and letting flexbox shrink
          // them to fit is what wrapped the chip's text in half. Splitting
          // the row into a name line and a chip+actions line means no
          // element ever needs to shrink below its natural width, and
          // every row ends up exactly two lines tall instead of one or two
          // depending on how long that category's name happens to be.
          return `
            <div class="topic-row" ${off ? 'data-off="true"' : ''}>
              <span class="topic-row-name">${escapeHtml(label)}</span>
              <span class="chip${chipDim}">${c.dueCount} due &middot; ${c.newCount} new</span>
              <div class="topic-row-actions">
                <button class="btn-quiet" data-learn="${escapeHtml(c.category)}">learn</button>
                <label class="switch">
                  <input
                    type="checkbox"
                    data-toggle="${escapeHtml(c.category)}"
                    ${off ? '' : 'checked'}
                    aria-label="${escapeHtml(label)} enabled"
                  />
                  <span class="switch-track"><span class="switch-thumb"></span></span>
                </label>
              </div>
              ${notesHtml}
            </div>
          `;
        })
        .join('');

      return `
        <section class="topic">
          <div class="topic-head">
            <span class="topic-head-name">${escapeHtml(topic.topic)}</span>
            <span class="topic-head-counts">${totals.due} due &middot; ${totals.new} new</span>
            <button class="btn-quiet topic-head-mute" data-toggle-topic="${escapeHtml(topic.topic)}" data-next="${nextDisabled ? 'off' : 'on'}">
              ${nextDisabled ? 'mute all' : 'unmute all'}
            </button>
          </div>
          ${rows}
        </section>
      `;
    })
    .join('');

  const body = props.topics.length === 0
    ? '<div style="color:var(--dim);text-align:center">no topics yet</div>'
    : sections;

  root.innerHTML = `
    <section class="screen">
      <div class="top"><button class="btn-quiet" id="back">← back</button><span>topics</span></div>
      ${body}
    </section>
  `;

  root.querySelector<HTMLButtonElement>('#back')?.addEventListener('click', props.onBack);

  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-learn]')) {
    const category = button.dataset['learn'];
    if (category !== undefined) button.addEventListener('click', () => props.onLearn(category));
  }

  for (const checkbox of root.querySelectorAll<HTMLInputElement>('[data-toggle]')) {
    const category = checkbox.dataset['toggle'];
    if (category !== undefined) {
      checkbox.addEventListener('change', () => props.onToggleCategory(category, !checkbox.checked));
    }
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-toggle-topic]')) {
    const topic = button.dataset['toggleTopic'];
    const next = button.dataset['next'] === 'off';
    if (topic !== undefined) button.addEventListener('click', () => props.onToggleTopic(topic, next));
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-note-path]')) {
    const path = button.dataset['notePath'];
    if (path !== undefined) button.addEventListener('click', () => props.onOpenNote(path));
  }
}
