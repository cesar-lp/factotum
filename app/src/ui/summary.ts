/**
 * The session completion screen (design spec section 5). Reached both by
 * finishing a session and by the review header's × (see review.ts's
 * finishSession). Every field is collected IN-SESSION as cards are graded
 * (review.ts tracks reviewed/ratingCounts/durationMs itself) rather than
 * re-queried from reviewLog, so this reflects exactly the session just
 * finished, not the account's all-time history. No schema change: nothing
 * here is persisted, it's a pure read of what review.ts already tracked in
 * memory.
 */

export interface RatingCounts {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface SessionSummary {
  /** Total gradings recorded this session -- includes a requeued card's later re-gradings. */
  cardsReviewed: number;
  timeSpentMs: number;
  ratingCounts: RatingCounts;
  /** Invoked when Done is tapped -- the seam back into whatever routing started the session. */
  onDone: () => void;
}

const RATING_ORDER: (keyof RatingCounts)[] = ['again', 'hard', 'good', 'easy'];

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`;
  const minutes = Math.round(ms / 60_000);
  return `${minutes}m`;
}

function capitalize(value: string): string {
  return value.length === 0 ? value : `${value[0]!.toUpperCase()}${value.slice(1)}`;
}

export type SessionStats = Omit<SessionSummary, 'onDone'>;

/**
 * Pure string renderer, kept separate from the DOM-wiring renderSummary()
 * below so it's unit-testable under vitest's `node` environment (no
 * jsdom/`document` here, same reason review.ts's own DOM wiring is never
 * unit-tested directly — only the pure functions it calls are).
 */
export function summaryHtml(stats: SessionStats): string {
  const { cardsReviewed, timeSpentMs, ratingCounts } = stats;
  const againRate = cardsReviewed > 0 ? Math.round((ratingCounts.again / cardsReviewed) * 100) : 0;

  return `
    <section class="screen summary">
      <h1 class="summary-title">Session complete</h1>
      <div class="summary-stats">
        <div class="summary-stat">
          <span class="summary-stat-value">${cardsReviewed}</span>
          <span class="summary-stat-label">reviewed</span>
        </div>
        <div class="summary-stat">
          <span class="summary-stat-value">${againRate}%</span>
          <span class="summary-stat-label">again rate</span>
        </div>
        <div class="summary-stat">
          <span class="summary-stat-value">${formatDuration(timeSpentMs)}</span>
          <span class="summary-stat-label">time spent</span>
        </div>
      </div>
      <div class="summary-breakdown">
        ${RATING_ORDER.map(
          (key) => `
          <div class="summary-row">
            <span class="summary-row-label">${capitalize(key)}</span>
            <span class="summary-row-value">${ratingCounts[key]}</span>
          </div>`
        ).join('')}
      </div>
      <button class="btn" data-role="done">Done</button>
    </section>
  `;
}

export function renderSummary(root: HTMLElement, summary: SessionSummary): void {
  root.innerHTML = summaryHtml(summary);
  root.querySelector('[data-role="done"]')?.addEventListener('click', () => summary.onDone());
}
