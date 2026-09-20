import type { NoteBlock } from '../../../pipeline/src/types.js';
import { escapeHtml, inlineMarkup } from './renderers.js';

/**
 * Escape, then apply inline markup. Never the other way round: the inline
 * layer wraps spans in tags and escapes nothing itself, so running it first
 * would reintroduce an injection path. See renderers.ts's own contract.
 */
function text(value: string): string {
  return inlineMarkup(escapeHtml(value));
}

function maskAttr(cardId: string, masked: boolean): string {
  return `data-card="${escapeHtml(cardId)}"${masked ? ' class="is-masked"' : ''}`;
}

/** `data-card` alone, for a container whose identity must not depend on
 * whether it currently has anything to mask (see `renderNoteBlocks` below). */
function cardIdAttr(cardId: string): string {
  return `data-card="${escapeHtml(cardId)}"`;
}

/**
 * Renders prose with its cloze spans wrapped, walking the clozes in offset
 * order and slicing between them. Offsets index the block's joined text, so
 * they are applied to the RAW string and each piece is escaped afterwards --
 * escaping first would shift every offset past the first `<` or `&`.
 */
function renderProse(block: Extract<NoteBlock, { kind: 'prose' }>, masked: ReadonlySet<string>): string {
  const ordered = [...block.clozes].sort((a, b) => a.start - b.start);
  let cursor = 0;
  let html = '';
  for (const cloze of ordered) {
    html += text(block.text.slice(cursor, cloze.start));
    const inner = block.text.slice(cloze.start, cloze.end);
    // Always wrap, masked or not: the reader can arrive here already
    // unmasked (having just answered this card in review), and the viewer
    // still needs `[data-card="<id>"]` to scroll to and highlight it. The
    // "Show all" control also reveals in place by stripping `is-masked`
    // from the span rather than re-rendering, so the span must already be
    // there to strip it from. The id is public in deck.json and the answer
    // text is visible right here when unmasked, so the attribute exposes
    // nothing a reader can't already see.
    html += `<span ${maskAttr(cloze.cardId, masked.has(cloze.cardId))}>${text(inner)}</span>`;
    cursor = cloze.end;
  }
  html += text(block.text.slice(cursor));
  return `<p class="note-prose">${html}</p>`;
}

/**
 * `title` is the note's own `NoteDoc.title` (first `# H1`, else the
 * filename stem -- see `noteTitle` in build.ts). The screen header already
 * renders it (`note.ts`'s `.note-title`), so the block stream's own copy of
 * that same heading would repeat it as the first thing in `.note-body` --
 * 201/201 notes in this vault have exactly that: an H1 byte-identical to
 * `title`. Suppressing it here, rather than at build time, keeps
 * `notes.json` a faithful block-for-block representation of the note; only
 * the *first* heading block that is both level 1 and text-identical to
 * `title` is dropped, so a note with no H1, or one whose H1 differs from
 * `title` (falls back to the filename stem), still renders every heading.
 */
export function renderNoteBlocks(blocks: NoteBlock[], masked: ReadonlySet<string>, title?: string): string {
  let skippedTitleHeading = false;
  return blocks.map((block) => {
    if (block.kind === 'heading') {
      if (!skippedTitleHeading && title !== undefined && block.level === 1 && block.text === title) {
        skippedTitleHeading = true;
        return '';
      }
      const level = Math.min(Math.max(block.level, 1), 6);
      return `<h${level} class="note-heading">${text(block.text)}</h${level}>`;
    }

    if (block.kind === 'code') {
      // Escaped only -- never inline markup. Backticks and asterisks inside
      // a code fence are code, not formatting.
      return `<pre class="note-code"><code>${escapeHtml(block.text)}</code></pre>`;
    }

    if (block.kind === 'list') {
      return `<ul class="note-list">${block.items.map((item) => `<li>${text(item)}</li>`).join('')}</ul>`;
    }

    if (block.kind === 'prose') return renderProse(block, masked);

    if (block.kind === 'qa') {
      // data-card lives on the outer div: it is the block's identity, not a
      // statement about whether there's currently anything to blur, so it
      // must not depend on the answer paragraph existing (see the `card`
      // case below for why that distinction matters). The answer <p> is the
      // only thing that should visually blur, so it alone carries
      // `is-masked` -- the prompt must never be maskable.
      const hidden = masked.has(block.cardId);
      return `<div class="note-card note-qa" ${cardIdAttr(block.cardId)}>`
        + `<p class="note-card-prompt">${text(block.prompt)}</p>`
        + `<p class="note-card-answer${hidden ? ' is-masked' : ''}">${text(block.answer)}</p>`
        + `</div>`;
    }

    // block.kind === 'card'
    const hidden = masked.has(block.cardId);
    const head = `<p class="note-card-prompt">${text(block.prompt)}</p>`;
    // Block-level identity, unconditional -- see the recall branch below for
    // why this can't be delegated to an inner element that might not exist.
    const cardAttr = cardIdAttr(block.cardId);

    if (block.choices) {
      // While masked, correctness is not rendered AT ALL -- not rendered and
      // hidden with CSS, which a view-source or a copied selection defeats.
      // `is-masked` goes on the <ul> of choices, not the outer div: the
      // prompt paragraph must stay readable while due, same as qa/recall --
      // the spec's masked-mcq row is "question and choices, no correctness
      // marking", not "the whole card blurred". Blurring the question
      // protects nothing (correctness is already absent from the DOM) and
      // only cost the reader the ability to read what they're studying.
      const items = block.choices.map((choice) => {
        const correct = !hidden && choice.correct ? ' is-correct' : '';
        return `<li class="note-choice${correct}">${text(choice.text)}</li>`;
      }).join('');
      return `<div class="note-card note-mcq" ${cardAttr}>`
        + `${head}<ul class="note-choices${hidden ? ' is-masked' : ''}">${items}</ul></div>`;
    }

    // recall: the `> ---` separator that introduces a model answer is
    // optional, and in this vault nothing uses it -- every recall card is
    // answerless. `data-card` therefore cannot live on the answer <p> (as
    // qa's does), because that element may not exist at all; it has to be
    // on the outer div, unconditionally, so Task 8's
    // `[data-card="<id>"]` scroll-to-arrived-from-card lookup always finds
    // something. When an answer is present, only that <p> gets `is-masked`
    // -- the prompt is never maskable, same as qa.
    const answer = block.answer !== undefined
      ? `<p class="note-card-answer${hidden ? ' is-masked' : ''}">${text(block.answer)}</p>`
      : '';
    return `<div class="note-card note-recall" ${cardAttr}>${head}${answer}</div>`;
  }).join('');
}
