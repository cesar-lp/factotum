import type { TopicSummary } from '../topics.js';

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
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
 * Category names come from free-form vault frontmatter, so they are
 * HTML-escaped on the way into innerHTML and carried on data attributes
 * rather than being interpolated into element ids.
 */
export function renderTopics(root: HTMLElement, props: TopicsProps): void {
  const sections = props.topics
    .map((topic) => {
      const allDisabled = topic.categories.every((c) => props.disabled.has(c.category));
      // Mixed or fully-on shelves mute; only a fully-muted shelf un-mutes.
      const nextDisabled = !allDisabled;

      const rows = topic.categories
        .map((c) => {
          const off = props.disabled.has(c.category);
          return `
            <div class="topic-row" ${off ? 'data-off="true"' : ''}>
              <span class="topic-row-name">${escapeHtml(c.category)}</span>
              <span class="chip">${c.dueCount} due &middot; ${c.newCount} new</span>
              <button class="btn-quiet" data-learn="${escapeHtml(c.category)}">learn</button>
              <button class="btn-quiet" data-toggle="${escapeHtml(c.category)}" data-next="${off ? 'on' : 'off'}">
                ${off ? 'off' : 'on'}
              </button>
            </div>
          `;
        })
        .join('');

      return `
        <section class="topic">
          <div class="topic-head">
            <span>${escapeHtml(topic.topic)}</span>
            <button class="btn-quiet" data-toggle-topic="${escapeHtml(topic.topic)}" data-next="${nextDisabled ? 'off' : 'on'}">
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

  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-toggle]')) {
    const category = button.dataset['toggle'];
    const next = button.dataset['next'] === 'off';
    if (category !== undefined) {
      button.addEventListener('click', () => props.onToggleCategory(category, next));
    }
  }

  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-toggle-topic]')) {
    const topic = button.dataset['toggleTopic'];
    const next = button.dataset['next'] === 'off';
    if (topic !== undefined) button.addEventListener('click', () => props.onToggleTopic(topic, next));
  }
}
