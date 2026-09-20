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

  if (!props.note) {
    root.innerHTML = `
      <section class="note-screen">
        <header class="note-head"><button class="btn-secondary" data-role="back">Back</button></header>
        <p class="note-empty">That note is no longer in the vault.</p>
      </section>`;
    root.querySelector('[data-role="back"]')?.addEventListener('click', props.onBack);
    return;
  }

  const summary = maskedSummary(props.masked.size);
  const obsidian = props.obsidianHref
    ? `<a class="btn-secondary" href="${escapeHtml(props.obsidianHref)}" data-role="obsidian">Open in Obsidian</a>`
    : '';

  root.innerHTML = `
    <section class="note-screen">
      <header class="note-head">
        <button class="btn-secondary" data-role="back">Back</button>
        <h1 class="note-title">${escapeHtml(props.note.title)}</h1>
        ${obsidian}
      </header>
      ${summary ? `<div class="note-masked-bar"><span>${summary}</span><button class="btn-secondary" data-role="reveal-all">Show all</button></div>` : ''}
      <article class="note-body">${renderNoteBlocks(props.note.blocks, props.masked)}</article>
      ${props.note.citations.length > 0
        ? `<footer class="note-citations">${props.note.citations.map((c) => `<p>${escapeHtml(c)}</p>`).join('')}</footer>`
        : ''}
    </section>`;

  root.querySelector('[data-role="back"]')?.addEventListener('click', props.onBack);

  // Reveal is per-element and ephemeral -- it derives from the schedule, so
  // leaving and re-entering re-masks. Nothing here is persisted.
  root.querySelectorAll<HTMLElement>('.is-masked').forEach((element) => {
    element.addEventListener('click', () => {
      element.classList.remove('is-masked');
      element.classList.add('is-revealed');
    });
  });

  root.querySelector('[data-role="reveal-all"]')?.addEventListener('click', () => {
    root.querySelectorAll<HTMLElement>('.is-masked').forEach((element) => {
      element.classList.remove('is-masked');
      element.classList.add('is-revealed');
    });
    root.querySelector('.note-masked-bar')?.remove();
  });

  if (props.arrivedFrom) {
    const target = root.querySelector<HTMLElement>(`[data-card="${CSS.escape(props.arrivedFrom)}"]`);
    if (target) {
      target.classList.add('is-arrived');
      target.scrollIntoView({ block: 'center' });
    }
  }
}
