import type { DayCount } from '../db/stats.js';

export interface DashboardProps {
  dueCount: number;
  /**
   * New cards left unseen today, past whatever `buildSession` already
   * included under the daily allowance. Only ever offered as an opt-in
   * "keep going" action, never folded into `dueCount` or started
   * automatically.
   */
  newCardsRemaining: number;
  /** Today's new-card count so far, so unlimited "keep going" stays honest. */
  newCardsSeenToday: number;
  /**
   * Consecutive days with at least one review, counted back from today —
   * see `computeStreak` in `db/stats.ts` for exactly how a gap or an
   * unreviewed-so-far today are handled. Optional/defaulted to 0 the same
   * way `deckUnavailable` is below, so this renderer keeps compiling for
   * any caller not yet passing it.
   */
  streak?: number;
  /**
   * Per-day review counts for the last 7 days, oldest first, today last.
   * Optional/defaulted to an empty list (renders the streak with no bar
   * row) for the same reason as `streak`.
   */
  lastSevenDays?: DayCount[];
  onStart: () => void;
  onKeepGoing: () => void;
  onTopics: () => void;
  onSettings: () => void;
  onSearch: () => void;
  /**
   * True when there are no cards in local storage AND the deck sync failed —
   * i.e. a genuine first-load failure (offline first launch, broken deploy),
   * as opposed to a normal "0 due" caught-up state or a stale-but-present
   * cached deck (which stays silent). Defaults to false.
   */
  deckUnavailable?: boolean;
  /**
   * Due cards held back this pass because the reader recently read the
   * note that backs them — see `selectNotRecentlyRead` in `scheduler/queue.ts`.
   * Surfaced so a shrinking due count is never mistaken for cards going
   * missing.
   */
  deferredCount: number;
}

function weekdayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString(undefined, { weekday: 'narrow' });
}

function renderStats(streak: number, lastSevenDays: DayCount[]): string {
  const max = Math.max(1, ...lastSevenDays.map((d) => d.count));
  const todayKey = lastSevenDays[lastSevenDays.length - 1]?.dayKey;

  const bars = lastSevenDays
    .map((d) => {
      const heightPct = Math.round((d.count / max) * 100);
      const isToday = d.dayKey === todayKey;
      return `
        <div class="week-bar${isToday ? ' week-bar-today' : ''}" title="${d.count} review${d.count === 1 ? '' : 's'}">
          <div class="week-bar-fill" style="height:${d.count > 0 ? Math.max(heightPct, 8) : 2}%"></div>
          <span class="week-bar-label">${weekdayLabel(d.dayKey)}</span>
        </div>`;
    })
    .join('');

  return `
    <div class="stats">
      <div class="streak">
        <span class="streak-count">${streak}</span>
        <span class="streak-label">day streak</span>
      </div>
      <div class="week-bars">${bars}</div>
    </div>`;
}

/**
 * A card leaving the queue without explanation is the same defect as the
 * silently-dropped re-queued card (state-and-roadmap §6). Suppression is
 * deliberate, so it is stated.
 */
export function deferredLine(count: number): string {
  if (count <= 0) return '';
  const noun = count === 1 ? 'card' : 'cards';
  const theirs = count === 1 ? 'its note' : 'their notes';
  return `<div style="color:var(--dim);font-size:13px;margin-top:4px">${count} ${noun} deferred &mdash; you read ${theirs} recently</div>`;
}

export function renderDashboard(root: HTMLElement, props: DashboardProps): void {
  const deckUnavailable = props.deckUnavailable ?? false;
  const queueEmpty = props.dueCount === 0;
  // Fourth dashboard state: queue empty for now, but new cards remain.
  // Distinct from both "all clear" (queue empty, nothing left to take on)
  // and the failed-first-load state, and only ever an opt-in action.
  const canKeepGoing = !deckUnavailable && queueEmpty && props.newCardsRemaining > 0;
  // Genuinely nothing left to do today: queue empty, no new cards to opt
  // into, and the deck loaded fine. This is the only state that gets the
  // "all clear" treatment below.
  const allClear = !deckUnavailable && queueEmpty && !canKeepGoing;

  const startDisabled = deckUnavailable;

  const message = deckUnavailable
    ? '<div class="due-count">--</div><div style="color:var(--dim)">couldn’t load the deck &mdash; check your connection</div>'
    : `<div class="due-count">${props.dueCount}</div><div style="color:var(--dim)">cards due today</div>`;

  const newCardsLine = deckUnavailable
    ? ''
    : `<div style="color:var(--dim);font-size:13px;margin-top:8px">${props.newCardsSeenToday} new card${
        props.newCardsSeenToday === 1 ? '' : 's'
      } today</div>`;

  const statsBlock = deckUnavailable ? '' : renderStats(props.streak ?? 0, props.lastSevenDays ?? []);

  const keepGoingButton = canKeepGoing
    ? `<button class="btn-secondary" id="keep-going" style="margin-top:8px">Keep going &mdash; ${
        props.newCardsRemaining
      } new card${props.newCardsRemaining === 1 ? '' : 's'} left</button>`
    : '';

  // "All clear" is reserved for genuinely nothing left to do. A disabled
  // button labelled "All clear" reads as broken -- success reported by a
  // dead control -- so this is a real state instead: a mark and a message,
  // no button at all. When new cards are still sitting there for the
  // taking (canKeepGoing), this block is skipped entirely and "Keep going"
  // is the only control on screen, so there's no "All clear" sitting
  // directly above an action that contradicts it.
  const allClearBlock = allClear
    ? `<div class="all-clear"><span class="all-clear-mark">&#10003;</span><span>All clear &mdash; nothing due today</span></div>`
    : '';

  // The due-queue-specifically-clear variant of the same idea: the due
  // queue is done, but it isn't the whole day, so it gets its own accurate
  // (non-button) label rather than reusing "All clear".
  const dueQueueClearBlock = canKeepGoing
    ? `<div class="all-clear"><span>Due queue clear</span></div>`
    : '';

  const startButton =
    allClear || canKeepGoing
      ? ''
      : `<button class="btn" id="start" ${startDisabled ? 'disabled' : ''}>
          Start review
        </button>`;

  root.innerHTML = `
    <section class="screen">
      <div class="top">
        <span>factotum</span>
        <span>
          <button class="btn-quiet" id="search">search</button>
          <button class="btn-quiet" id="topics">topics</button>
          <button class="btn-quiet" id="settings">settings</button>
        </span>
      </div>
      <div class="spacer"></div>
      <div style="text-align:center">
        ${message}
        ${newCardsLine}
        ${deckUnavailable ? '' : deferredLine(props.deferredCount)}
        ${statsBlock}
      </div>
      <div class="spacer"></div>
      ${allClearBlock}
      ${dueQueueClearBlock}
      ${startButton}
      ${keepGoingButton}
    </section>
  `;

  root.querySelector<HTMLButtonElement>('#start')?.addEventListener('click', props.onStart);
  root.querySelector<HTMLButtonElement>('#search')?.addEventListener('click', props.onSearch);
  root.querySelector<HTMLButtonElement>('#topics')?.addEventListener('click', props.onTopics);
  root.querySelector<HTMLButtonElement>('#settings')?.addEventListener('click', props.onSettings);
  root.querySelector<HTMLButtonElement>('#keep-going')?.addEventListener('click', props.onKeepGoing);
}
