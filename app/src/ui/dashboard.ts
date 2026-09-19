export interface DashboardProps {
  dueCount: number;
  onStart: () => void;
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
  const startDisabled = deckUnavailable || props.dueCount === 0;
  const startLabel = deckUnavailable ? 'Start review' : props.dueCount === 0 ? 'All clear' : 'Start review';

  const message = deckUnavailable
    ? '<div class="due-count">--</div><div style="color:var(--dim)">couldn’t load the deck &mdash; check your connection</div>'
    : `<div class="due-count">${props.dueCount}</div><div style="color:var(--dim)">cards due today</div>`;

  root.innerHTML = `
    <section class="screen">
      <div class="top"><span>factotum</span><button class="btn-quiet" id="settings">settings</button></div>
      <div class="spacer"></div>
      <div style="text-align:center">
        ${message}
      </div>
      <div class="spacer"></div>
      <button class="btn" id="start" ${startDisabled ? 'disabled' : ''}>
        ${startLabel}
      </button>
    </section>
  `;

  root.querySelector<HTMLButtonElement>('#start')?.addEventListener('click', props.onStart);
  root.querySelector<HTMLButtonElement>('#settings')?.addEventListener('click', props.onSettings);
}
