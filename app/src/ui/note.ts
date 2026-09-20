import type { NoteBlock, NoteDoc } from '../../../pipeline/src/types.js';
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
 * How many of `masked`'s cards actually hide something visible. Being in
 * `masked` only means a card is due; it does not mean the note has any
 * surface to blur for it. An answerless `recall` card (no `> ---` model
 * answer -- 177/177 recall cards in this vault) renders no answer <p> at
 * all, so it can be masked with nothing tappable and nothing blurred. The
 * "N answers hidden" bar has to count only cards a reader could plausibly
 * reveal, or it promises more than "Show all" can deliver -- in the
 * degenerate case where every due card is an answerless recall, it would
 * read "N answers hidden" while zero elements carry `is-masked` and "Show
 * all" visibly does nothing.
 */
export function maskedCount(blocks: NoteBlock[], masked: ReadonlySet<string>): number {
  let count = 0;
  for (const block of blocks) {
    if (block.kind === 'prose') {
      for (const cloze of block.clozes) {
        if (masked.has(cloze.cardId)) count++;
      }
    } else if (block.kind === 'qa') {
      if (masked.has(block.cardId)) count++;
    } else if (block.kind === 'card' && masked.has(block.cardId)) {
      // mcq always has something to blur (the whole choice list); recall
      // only does when it actually carries a model answer.
      if (block.format === 'mcq' || block.answer !== undefined) count++;
    }
  }
  return count;
}

/**
 * The note viewer. A dumb renderer, mirroring renderTopics: every decision
 * (which cards are masked, whether notes loaded at all) arrives as a prop,
 * so the logic stays in main.ts where a node test can reach it.
 */
export function renderNote(root: HTMLElement, props: NoteProps): void {
  if (!props.available) {
    root.innerHTML = `
      <section class="screen note-screen">
        <header class="note-head"><button class="btn-secondary" data-role="back">Back</button></header>
        <p class="note-empty">Notes aren't downloaded yet. Connect to the internet once and reopen this note.</p>
      </section>`;
    root.querySelector('[data-role="back"]')?.addEventListener('click', props.onBack);
    return;
  }

  const maybeNote = props.note;
  if (!maybeNote) {
    root.innerHTML = `
      <section class="screen note-screen">
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
    <section class="screen note-screen">
      <header class="note-head">
        <button class="btn-secondary" data-role="back">Back</button>
        <h1 class="note-title">${escapeHtml(note.title)}</h1>
        ${obsidian}
      </header>
      ${maskedSummary(maskedCount(note.blocks, props.masked))
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
    article.innerHTML = renderNoteBlocks(note.blocks, masked, note.title);

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
    const summary = maskedSummary(maskedCount(note.blocks, effectiveMasked(props.masked, revealed)));
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
