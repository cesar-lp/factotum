import { MIN_QUERY_LENGTH, search, type Match, type NoteResult } from '../search.js';
import type { NoteDoc, Notes } from '../../../pipeline/src/types.js';
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

export interface SearchProps {
  query: string;
  notes: Notes | null;
  /** Note paths, most recently read first. Drives the empty-query screen. */
  recentPaths: string[];
  onQueryChange: (query: string) => void;
  onOpen: (path: string, block: number | null) => void;
  onBack: () => void;
}

const DEBOUNCE_MS = 150;

/**
 * The DOM-wiring entry point -- everything above this line is pure and
 * unit-tested; this is not (no DOM in the test environment), so it is
 * hand-verified instead (see the task-13 brief's Step 7 walkthrough).
 */
export function renderSearch(root: HTMLElement, props: SearchProps): void {
  const expanded = new Set<string>();
  let query = props.query;

  root.innerHTML = `
    <section class="screen">
      <div class="top">
        <button class="btn-quiet" data-role="back">back</button>
        <span>search</span>
      </div>
      <input class="search-input" type="search" autocomplete="off"
        placeholder="search notes" value="${escapeHtml(query)}" />
      <div class="search-out"></div>
    </section>`;

  const out = root.querySelector<HTMLElement>('.search-out');
  const input = root.querySelector<HTMLInputElement>('.search-input');

  const paint = (): void => {
    if (!out) return;
    // Corpus availability first: with no query AND no corpus, the honest
    // state is "not downloaded yet", not "search your notes" -- the latter
    // falsely implies typing something would work.
    if (props.notes === null) { out.innerHTML = renderSearchState('unavailable', query); return; }
    if (query.trim().length < MIN_QUERY_LENGTH) {
      const recent = renderRecent(props.notes.notes, props.recentPaths);
      out.innerHTML = recent === '' ? renderSearchState('empty', query) : recent;
      return;
    }
    const results = search(props.notes, query);
    out.innerHTML = results.length === 0
      ? renderSearchState('no-matches', query)
      : `<ul class="search-results">${renderResults(results, expanded)}</ul>`;
  };

  let timer: ReturnType<typeof setTimeout> | null = null;
  input?.addEventListener('input', () => {
    query = input.value;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { expanded.clear(); paint(); props.onQueryChange(query); }, DEBOUNCE_MS);
  });

  out?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const hit = target.closest<HTMLElement>('.search-hit');
    if (hit) {
      const path = hit.dataset['path'];
      const block = Number(hit.dataset['block']);
      if (path) props.onOpen(path, Number.isFinite(block) ? block : null);
      return;
    }
    const button = target.closest<HTMLElement>('[data-role]');
    if (!button) return;
    const path = button.dataset['path'];
    if (!path) return;
    if (button.dataset['role'] === 'open') { props.onOpen(path, null); return; }
    if (expanded.has(path)) expanded.delete(path); else expanded.add(path);
    paint();
  });

  root.querySelector('[data-role="back"]')?.addEventListener('click', props.onBack);
  paint();
  input?.focus();
}
