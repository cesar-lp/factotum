import type { Match, NoteResult } from '../search.js';
import type { NoteDoc } from '../../../pipeline/src/types.js';
import { escapeHtml } from './renderers.js';

/**
 * Wraps matched spans in <mark>, escaping as it goes.
 *
 * Offsets index the RAW string, so the string is SLICED first and each
 * piece escaped afterwards. Escaping first would rewrite `&` as `&amp;`
 * and push every later offset four characters right -- the exact bug
 * note-render.ts's renderProse documents for cloze spans.
 */
export function highlight(text: string, matches: Match[]): string {
  if (matches.length === 0) return escapeHtml(text);
  let html = '';
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue; // overlapping; already covered
    html += escapeHtml(text.slice(cursor, match.start));
    html += `<mark>${escapeHtml(text.slice(match.start, match.end))}</mark>`;
    cursor = match.end;
  }
  html += escapeHtml(text.slice(cursor));
  return html;
}

/**
 * Note rows, each with two separate targets: the row body opens the note,
 * the chevron expands it. A row that did both would leave one gesture with
 * nowhere to live -- and the split is also what keeps snippets (the only
 * unmasked prose a result list shows) behind a deliberate second tap
 * rather than on the way past.
 */
export function renderResults(results: NoteResult[], expanded: ReadonlySet<string>): string {
  return results.map((result) => {
    const open = expanded.has(result.path);
    const snippets = open
      ? `<ul class="search-hits">${result.hits.map((hit) =>
          `<li class="search-hit" data-block="${hit.blockIndex}" data-path="${escapeHtml(result.path)}">`
          + `${highlight(hit.snippet, hit.matches)}</li>`
        ).join('')}</ul>`
      : '';

    return `<li class="search-result">`
      + `<div class="search-row">`
      + `<button class="search-open" data-role="open" data-path="${escapeHtml(result.path)}">`
      + `<span class="search-title">${escapeHtml(result.title)}</span>`
      + `<span class="search-meta">${escapeHtml(result.category)} &middot; ${result.hits.length}</span>`
      + `</button>`
      + `<button class="search-expand" data-role="expand" data-path="${escapeHtml(result.path)}"`
      + ` aria-expanded="${open}" aria-label="Show matches">${open ? '∨' : '›'}</button>`
      + `</div>${snippets}</li>`;
  }).join('');
}

/**
 * The landing screen: what you read most recently, newest first.
 *
 * Fed from `noteReads`, which the suppression mechanic already
 * maintains -- no extra state, and it happens to be the most likely
 * thing you want when you open search without a query in mind.
 */
export const MAX_RECENT = 10;

export function renderRecent(notes: NoteDoc[], paths: string[]): string {
  const byPath = new Map(notes.map((note) => [note.path, note]));
  const rows = paths
    .map((path) => byPath.get(path))
    // A path can outlive its note across a deck rebuild. Skip it rather
    // than render a row that opens nothing.
    .filter((note): note is NoteDoc => note !== undefined)
    .slice(0, MAX_RECENT)
    .map((note) =>
      `<li class="search-result"><div class="search-row">`
      + `<button class="search-open" data-role="open" data-path="${escapeHtml(note.path)}">`
      + `<span class="search-title">${escapeHtml(note.title)}</span>`
      + `<span class="search-meta">${escapeHtml(note.category)}</span>`
      + `</button></div></li>`
    );
  if (rows.length === 0) return '';
  return `<p class="search-state">Recently read</p><ul class="search-results">${rows.join('')}</ul>`;
}

export function renderSearchState(kind: 'empty' | 'no-matches' | 'unavailable', query: string): string {
  if (kind === 'unavailable') {
    // NEVER an empty result list: that asserts "no matches", which is a
    // different and false statement when the corpus was never downloaded.
    return `<p class="search-state">Notes haven’t been downloaded yet &mdash; search needs a connection the first time.</p>`;
  }
  if (kind === 'no-matches') {
    return `<p class="search-state">No notes match &ldquo;${escapeHtml(query)}&rdquo;.</p>`;
  }
  return `<p class="search-state">Search your notes.</p>`;
}
