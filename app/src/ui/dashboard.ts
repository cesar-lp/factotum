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
  onStart: () => void;
  onKeepGoing: () => void;
  onSettings: () => void;
  /**
   * True when there are no cards in local storage AND the deck sync failed —
   * i.e. a genuine first-load failure (offline first launch, broken deploy),
   * as opposed to a normal "0 due" caught-up state or a stale-but-present
   * cached deck (which stays silent). Defaults to false.
   */
  deckUnavailable?: boolean;
}

export function renderDashboard(root: HTMLElement, props: DashboardProps): void {
  const deckUnavailable = props.deckUnavailable ?? false;
  const queueEmpty = props.dueCount === 0;
  // Fourth dashboard state: queue empty for now, but new cards remain.
  // Distinct from both "all clear" (queue empty, nothing left to take on)
  // and the failed-first-load state, and only ever an opt-in action.
  const canKeepGoing = !deckUnavailable && queueEmpty && props.newCardsRemaining > 0;

  const startDisabled = deckUnavailable || queueEmpty;
  // "All clear" is reserved for genuinely nothing left to do. When new
  // cards are still sitting there for the taking (canKeepGoing), saying
  // "All clear" directly above a "Keep going — N new cards left" button
  // reads as a contradiction, so this state gets its own accurate label —
  // the due queue specifically is clear, not the day.
  const startLabel = deckUnavailable
    ? 'Start review'
    : queueEmpty
      ? (canKeepGoing ? 'Due queue clear' : 'All clear')
      : 'Start review';

  const message = deckUnavailable
    ? '<div class="due-count">--</div><div style="color:var(--dim)">couldn’t load the deck &mdash; check your connection</div>'
    : `<div class="due-count">${props.dueCount}</div><div style="color:var(--dim)">cards due today</div>`;

  const newCardsLine = deckUnavailable
    ? ''
    : `<div style="color:var(--dim);font-size:13px;margin-top:8px">${props.newCardsSeenToday} new card${
        props.newCardsSeenToday === 1 ? '' : 's'
      } today</div>`;

  const keepGoingButton = canKeepGoing
    ? `<button class="btn" id="keep-going" style="margin-top:8px">Keep going &mdash; ${
        props.newCardsRemaining
      } new card${props.newCardsRemaining === 1 ? '' : 's'} left</button>`
    : '';

  root.innerHTML = `
    <section class="screen">
      <div class="top"><span>factotum</span><button class="btn-quiet" id="settings">settings</button></div>
      <div class="spacer"></div>
      <div style="text-align:center">
        ${message}
        ${newCardsLine}
      </div>
      <div class="spacer"></div>
      <button class="btn" id="start" ${startDisabled ? 'disabled' : ''}>
        ${startLabel}
      </button>
      ${keepGoingButton}
    </section>
  `;

  root.querySelector<HTMLButtonElement>('#start')?.addEventListener('click', props.onStart);
  root.querySelector<HTMLButtonElement>('#settings')?.addEventListener('click', props.onSettings);
  root.querySelector<HTMLButtonElement>('#keep-going')?.addEventListener('click', props.onKeepGoing);
}
