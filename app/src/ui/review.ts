import type { FactotumDb, StoredCard } from '../db/schema.js';
import type { Outcome } from '../scheduler/fsrs.js';
import { recordReview, flagCard } from '../db/reviews.js';
import { getSettings } from '../db/settings.js';
import { checkCloze, renderActions, renderPrompt } from './renderers.js';
import { issueUrl } from './flag.js';

export interface ReviewDeps {
  db: FactotumDb;
  session: StoredCard[];
  repo: string;
  onDone: (reviewed: number) => void;
}

export async function startReview(root: HTMLElement, deps: ReviewDeps): Promise<void> {
  const settings = await getSettings(deps.db);
  let index = 0;
  let reviewed = 0;

  const advance = (): void => {
    index += 1;
    if (index >= deps.session.length) deps.onDone(reviewed);
    else draw(false);
  };

  const submit = async (card: StoredCard, outcome: Outcome, startedAt: number): Promise<void> => {
    await recordReview(deps.db, {
      card,
      outcome,
      now: new Date(),
      desiredRetention: settings.desiredRetention,
      durationMs: Date.now() - startedAt
    });
    reviewed += 1;
    advance();
  };

  function draw(revealed: boolean, pendingOutcome: Outcome | null = null): void {
    const card = deps.session[index];
    if (!card) return deps.onDone(reviewed);

    const startedAt = Date.now();
    root.innerHTML = `
      <section class="screen review">
        <div class="top"><span>${index + 1} / ${deps.session.length}</span></div>
        <div class="progress"><i style="width:${(index / deps.session.length) * 100}%"></i></div>
        ${renderPrompt(card)}
        ${renderActions(card, revealed)}
      </section>
    `;

    root.querySelector('[data-role="flag"]')?.addEventListener('click', () => {
      const now = new Date();
      void flagCard(deps.db, card.id, now).then(() => {
        window.open(issueUrl(card, deps.repo), '_blank');
        advance();
      });
    });

    root.querySelector('[data-role="reveal"]')?.addEventListener('click', () => draw(true));

    root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        if (revealed) return;
        const correct = button.dataset['correct'] === 'true';
        // Reveal first — the answer and its citation stay on screen until
        // Continue, which is where the rating is actually recorded.
        draw(true, correct ? 'correct' : 'wrong');
        root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((b) => {
          if (b.dataset['correct'] === 'true') b.classList.add('is-correct');
          else if (b.dataset['choice'] === button.dataset['choice']) b.classList.add('is-wrong');
        });
      });
    });

    root.querySelector('[data-role="check"]')?.addEventListener('click', () => {
      const input = root.querySelector<HTMLInputElement>('[data-role="cloze-input"]');
      const correct = checkCloze(input?.value ?? '', card.answer ?? '');
      if (correct) void submit(card, 'correct', startedAt);
      else draw(true, 'wrong');
    });

    root.querySelectorAll<HTMLButtonElement>('[data-outcome]').forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset['outcome'];
        if (value === 'continue') return void submit(card, pendingOutcome ?? 'wrong', startedAt);
        if (value === 'override') return void submit(card, 'correct', startedAt);
        void submit(card, value as Outcome, startedAt);
      });
    });
  }

  draw(false);
}
