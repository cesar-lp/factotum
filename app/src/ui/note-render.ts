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

export function renderNoteBlocks(blocks: NoteBlock[], masked: ReadonlySet<string>): string {
  return blocks.map((block) => {
    if (block.kind === 'heading') {
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
      const hidden = masked.has(block.cardId);
      return `<div class="note-card note-qa">`
        + `<p class="note-card-prompt">${text(block.prompt)}</p>`
        + `<p class="note-card-answer" ${maskAttr(block.cardId, hidden)}>${text(block.answer)}</p>`
        + `</div>`;
    }

    // block.kind === 'card'
    const hidden = masked.has(block.cardId);
    const head = `<p class="note-card-prompt">${text(block.prompt)}</p>`;

    if (block.choices) {
      // While masked, correctness is not rendered AT ALL -- not rendered and
      // hidden with CSS, which a view-source or a copied selection defeats.
      const items = block.choices.map((choice) => {
        const correct = !hidden && choice.correct ? ' is-correct' : '';
        return `<li class="note-choice${correct}">${text(choice.text)}</li>`;
      }).join('');
      return `<div class="note-card note-mcq" ${maskAttr(block.cardId, hidden)}>`
        + `${head}<ul class="note-choices">${items}</ul></div>`;
    }

    const answer = block.answer !== undefined
      ? `<p class="note-card-answer" ${maskAttr(block.cardId, hidden)}>${text(block.answer)}</p>`
      : '';
    return `<div class="note-card note-recall">${head}${answer}</div>`;
  }).join('');
}
