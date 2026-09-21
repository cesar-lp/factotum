import type { NoteDoc } from '../../../pipeline/src/types.js';
import { renderNoteBlocks } from './note-render.js';
import { escapeHtml } from './renderers.js';

export interface NoteProps {
  /** null when notes.json could not be loaded; absent from it when the path is unknown. */
  note: NoteDoc | null;
  available: boolean;
  /** Scrolled to and highlighted on open. */
  arrivedFrom: string | null;
  /**
   * Scrolled to (not highlighted) when arriving from a search result and
   * no `arrivedFrom` card takes precedence. Ephemeral by construction --
   * generated from whatever notes.json is currently in memory and followed
   * within seconds -- never a durable anchor the way `^card-xxxx` is.
   */
  arrivedAtBlock: number | null;
  obsidianHref: string | null;
  onBack: () => void;
}

/**
 * The note header's markup. Back and (when present) the Open in Obsidian
 * link share one row inside .note-head-actions; the title, when given,
 * follows on its own full-width line below. They used to be three flex
 * siblings on a single row, where `flex: 1` on the title only grants it
 * whatever width is left over after both buttons take their full content
 * width -- on a 480px phone layout that squeezed the title down to four
 * wrapped lines and wrapped "Open in Obsidian" onto two. Splitting the
 * actions row from the title line fixes that; see note.css's .note-head
 * and .note-head-actions.
 *
 * `title` is null for the two empty states (notes not downloaded / note no
 * longer in the vault), which render only the Back button and no heading.
 */
export function noteHeadHtml(title: string | null, obsidianHref: string | null): string {
  const obsidian = obsidianHref
    ? `<a class="btn-secondary" href="${escapeHtml(obsidianHref)}" data-role="obsidian">Open in Obsidian</a>`
    : '';
  return `
    <header class="note-head">
      <div class="note-head-actions">
        <button class="btn-secondary" data-role="back">Back</button>
        ${obsidian}
      </div>
      ${title !== null ? `<h1 class="note-title">${escapeHtml(title)}</h1>` : ''}
    </header>`;
}

/**
 * The note viewer. A dumb renderer, mirroring renderTopics: every decision
 * (whether notes loaded at all) arrives as a prop, so the logic stays in
 * main.ts where a node test can reach it.
 */
export function renderNote(root: HTMLElement, props: NoteProps): void {
  if (!props.available) {
    root.innerHTML = `
      <section class="screen note-screen">
        ${noteHeadHtml(null, null)}
        <p class="note-empty">Notes aren't downloaded yet. Connect to the internet once and reopen this note.</p>
      </section>`;
    root.querySelector('[data-role="back"]')?.addEventListener('click', props.onBack);
    return;
  }

  const maybeNote = props.note;
  if (!maybeNote) {
    root.innerHTML = `
      <section class="screen note-screen">
        ${noteHeadHtml(null, null)}
        <p class="note-empty">That note is no longer in the vault.</p>
      </section>`;
    root.querySelector('[data-role="back"]')?.addEventListener('click', props.onBack);
    return;
  }

  const note: NoteDoc = maybeNote;

  root.innerHTML = `
    <section class="screen note-screen">
      ${noteHeadHtml(note.title, props.obsidianHref)}
      <article class="note-body"></article>
      ${note.citations.length > 0
        ? `<footer class="note-citations">${note.citations.map((c) => `<p>${escapeHtml(c)}</p>`).join('')}</footer>`
        : ''}
    </section>`;

  root.querySelector('[data-role="back"]')?.addEventListener('click', props.onBack);

  let arrivedScrolled = false;

  function renderArticle(): void {
    const article = root.querySelector<HTMLElement>('.note-body');
    if (!article) return;
    article.innerHTML = renderNoteBlocks(note.blocks, note.title);

    if (props.arrivedFrom) {
      const target = article.querySelector<HTMLElement>(`[data-card="${CSS.escape(props.arrivedFrom)}"]`);
      if (target) {
        target.classList.add('is-arrived');
        if (!arrivedScrolled) {
          target.scrollIntoView({ block: 'center' });
          arrivedScrolled = true;
        }
      }
    }

    if (props.arrivedFrom === null && props.arrivedAtBlock !== null && !arrivedScrolled) {
      // Block indices are EPHEMERAL. They are generated from the
      // notes.json currently in memory and followed within seconds, so a
      // deck rebuild shifting them is harmless here. Never persist one,
      // and never treat it as a durable anchor -- ^card-xxxx is that.
      const target = article.querySelector<HTMLElement>(`[data-block="${props.arrivedAtBlock}"]`);
      if (target) {
        target.scrollIntoView({ block: 'center' });
        arrivedScrolled = true;
      }
    }
  }

  renderArticle();
}
