export interface DashboardProps {
  dueCount: number;
  onStart: () => void;
  onSettings: () => void;
}

export function renderDashboard(root: HTMLElement, props: DashboardProps): void {
  root.innerHTML = `
    <section class="screen">
      <div class="top"><span>factotum</span><button class="btn-quiet" id="settings">settings</button></div>
      <div class="spacer"></div>
      <div style="text-align:center">
        <div class="due-count">${props.dueCount}</div>
        <div style="color:var(--dim)">cards due today</div>
      </div>
      <div class="spacer"></div>
      <button class="btn" id="start" ${props.dueCount === 0 ? 'disabled' : ''}>
        ${props.dueCount === 0 ? 'All clear' : 'Start review'}
      </button>
    </section>
  `;

  root.querySelector<HTMLButtonElement>('#start')?.addEventListener('click', props.onStart);
  root.querySelector<HTMLButtonElement>('#settings')?.addEventListener('click', props.onSettings);
}
