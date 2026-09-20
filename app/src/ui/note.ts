import type { NoteDoc } from '../../../pipeline/src/types.js';
import { renderNoteBlocks } from './note-render.js';
import { escapeHtml } from './renderers.js';

export interface NoteProps {
  /** null when notes.json could not be loaded; absent from it when the path is unknown. */
  note: NoteDoc | null;
  available: boolean;
  masked: Set<string>;
  /** Scrolled to and highlighted on open. */
  arrivedFrom: string | null;
  obsidianHref: string | null;
  onBack: () => void;
}

/** Header copy for the reveal-all control, or null when nothing is masked. */
export function maskedSummary(count: number): string | null {
  if (count === 0) return null;
  return `${count} answer${count === 1 ? '' : 's'} hidden`;
}

/**
 * What's still masked once the reader's own reveals (this session, never
 * persisted) are subtracted out. Pure so it's node-testable independent of
 * the DOM re-render it drives.
 */
export function effectiveMasked(masked: ReadonlySet<string>, revealed: ReadonlySet<string>): Set<string> {
  const result = new Set<string>();
  for (const id of masked) {
    if (!revealed.has(id)) result.add(id);
  }
  return result;
}

/**
 * The note viewer. A dumb renderer, mirroring renderTopics: every decision
 * (which cards are masked, whether notes loaded at all) arrives as a prop,
 * so the logic stays in main.ts where a node test can reach it.
 */
export function renderNote(root: HTMLElement, props: NoteProps): void {
  if (!props.available) {
    root.innerHTML = `
      <section class="note-screen">
        <header class="note-head"><button class="btn-secondary" data-role="back">Back</button></header>
        <p class="note-empty">Notes aren't downloaded yet. Connect to the internet once and reopen this note.</p>
      </section>`;
    root.querySelector('[data-role="back"]')?.addEventListener('click', props.onBack);
    return;
  }

  const maybeNote = props.note;
  if (!maybeNote) {
    root.innerHTML = `
      <section class="note-screen">
        <header class="note-head"><button class="btn-secondary" data-role="back">Back</button></header>
        <p class="note-empty">That note is no longer in the vault.</p>
      </section>`;
    root.querySelector('[data-role="back"]')?.addEventListener('click', props.onBack);
    return;
  }

  const note: NoteDoc = maybeNote;

  const obsidian = props.obsidianHref
    ? `<a class="btn-secondary" href="${escapeHtml(props.obsidianHref)}" data-role="obsidian">Open in Obsidian</a>`
    : '';

  root.innerHTML = `
    <section class="note-screen">
      <header class="note-head">
        <button class="btn-secondary" data-role="back">Back</button>
        <h1 class="note-title">${escapeHtml(note.title)}</h1>
        ${obsidian}
      </header>
      ${maskedSummary(props.masked.size)
        ? `<div class="note-masked-bar"><span></span><button class="btn-secondary" data-role="reveal-all">Show all</button></div>`
        : ''}
      <article class="note-body"></article>
      ${note.citations.length > 0
        ? `<footer class="note-citations">${note.citations.map((c) => `<p>${escapeHtml(c)}</p>`).join('')}</footer>`
        : ''}
    </section>`;

  root.querySelector('[data-role="back"]')?.addEventListener('click', props.onBack);

  // Revealing an mcq must show its is-correct marking, and note-render.ts
  // deliberately never puts is-correct in the DOM at all while masked (a
  // class hidden with CSS is defeated by view-source or a copied
  // selection). That rules out an in-place class swap on reveal -- there is
  // nothing to un-hide for an mcq, since the markup was never there. So
  // reveal instead re-renders the article from renderNoteBlocks against a
  // shrinking masked set: `revealed` is the only state, `effectiveMasked`
  // derives what's still hidden, and the renderer stays the one place that
  // decides what markup exists. Session-only, like the class-swap it
  // replaces -- nothing here is persisted, so leaving and re-entering
  // re-masks everything.
  const revealed = new Set<string>();
  let arrivedScrolled = false;

  function renderArticle(): void {
    const article = root.querySelector<HTMLElement>('.note-body');
    if (!article) return;
    const masked = effectiveMasked(props.masked, revealed);
    article.innerHTML = renderNoteBlocks(note.blocks, masked);

    article.querySelectorAll<HTMLElement>('.is-masked').forEach((element) => {
      element.addEventListener('click', () => {
        // is-masked and data-card are deliberately on different elements
        // for qa/recall (answer <p> vs. the outer div), so the card id has
        // to be resolved via the nearest ancestor that carries it, not read
        // off the clicked element itself.
        const owner = element.closest<HTMLElement>('[data-card]');
        const cardId = owner?.dataset['card'];
        if (!cardId) return;
        revealed.add(cardId);
        rerender();
      });
    });

    if (props.arrivedFrom) {
      const target = article.querySelector<HTMLElement>(`[data-card="${CSS.escape(props.arrivedFrom)}"]`);
      if (target) {
        target.classList.add('is-arrived');
        // Only the very first render scrolls -- a later reveal must not
        // yank the reader back to the arrived-from card.
        if (!arrivedScrolled) {
          target.scrollIntoView({ block: 'center' });
          arrivedScrolled = true;
        }
      }
    }
  }

  function updateBar(): void {
    const bar = root.querySelector<HTMLElement>('.note-masked-bar');
    const summary = maskedSummary(effectiveMasked(props.masked, revealed).size);
    if (!summary) {
      bar?.remove();
      return;
    }
    const span = bar?.querySelector('span');
    if (span) span.textContent = summary;
  }

  function rerender(): void {
    // A re-render must not move the reader's scroll position -- only the
    // arrived-from card's initial scrollIntoView is allowed to do that.
    const scrollY = window.scrollY;
    renderArticle();
    updateBar();
    window.scrollTo(window.scrollX, scrollY);
  }

  renderArticle();
  updateBar();

  root.querySelector('[data-role="reveal-all"]')?.addEventListener('click', () => {
    for (const id of props.masked) revealed.add(id);
    rerender();
  });
}
