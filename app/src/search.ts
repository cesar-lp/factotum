import type { NoteBlock, Notes } from '../../pipeline/src/types.js';

export interface Match { start: number; end: number }

export interface BlockHit {
  blockIndex: number;
  snippet: string;
  /** Offsets into `snippet`, ascending. */
  matches: Match[];
  score: number;
}

export interface NoteResult {
  path: string;
  title: string;
  topic: string;
  category: string;
  score: number;
  hits: BlockHit[];
}

/**
 * Guesses, deliberately gathered in one table rather than scattered as
 * magic numbers, because tuning them against real queries is inevitable.
 */
export const FIELD_WEIGHTS = {
  title: 10, tags: 7, heading: 5, prompt: 4, prose: 3, list: 3, citations: 2, code: 2
} as const;

/** The raw query appearing contiguously is a much stronger signal than its terms appearing apart. */
export const PHRASE_BONUS = 12;

/** Every term inside ONE block beats the same terms scattered over four paragraphs. */
export const ALL_TERMS_IN_BLOCK_BONUS = 8;

export const MAX_NOTE_RESULTS = 30;
export const MAX_HITS_PER_NOTE = 5;
export const MIN_QUERY_LENGTH = 2;
export const SNIPPET_RADIUS = 80;

/**
 * Deduped: the AND check below (`found.size !== terms.length`) compares
 * against a Set built from matched terms, so a repeated term (`hash hash`)
 * would demand two entries in a Set that can only ever hold one distinct
 * `hash` -- making every note fail the AND check and "No notes match" a
 * false claim about a query that, deduped, has a real answer.
 */
export function parseQuery(query: string): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t !== '');
  return [...new Set(terms)];
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A term matches at a word boundary with an OPEN right edge, so `hash`
 * finds `hashing` while `ip` does not find `multiple`. The term is escaped
 * because it comes straight from the user: `c++` must neither throw nor
 * match everything.
 */
function termPattern(term: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(term)}`, 'g');
}

export function blockText(block: NoteBlock): { text: string; weight: number } {
  switch (block.kind) {
    case 'heading': return { text: block.text, weight: FIELD_WEIGHTS.heading };
    case 'code': return { text: block.text, weight: FIELD_WEIGHTS.code };
    case 'list': return { text: block.items.join('\n'), weight: FIELD_WEIGHTS.list };
    case 'prose': return { text: block.text, weight: FIELD_WEIGHTS.prose };
    case 'qa': return { text: `${block.prompt}\n${block.answer}`, weight: FIELD_WEIGHTS.prompt };
    case 'card': {
      const choices = (block.choices ?? []).map((c) => c.text).join('\n');
      const answer = block.answer ?? '';
      return { text: [block.prompt, choices, answer].filter((s) => s !== '').join('\n'), weight: FIELD_WEIGHTS.prompt };
    }
  }
}

function findMatches(text: string, terms: string[]): { matches: Match[]; found: Set<string> } {
  const lower = text.toLowerCase();
  const matches: Match[] = [];
  const found = new Set<string>();
  for (const term of terms) {
    const pattern = termPattern(term);
    let hit = pattern.exec(lower);
    while (hit) {
      matches.push({ start: hit.index, end: hit.index + term.length });
      found.add(term);
      hit = pattern.exec(lower);
    }
  }
  matches.sort((a, b) => a.start - b.start);
  return { matches, found };
}

/**
 * A window around the first match. Offsets are re-based into the snippet's
 * own coordinate space, and matches falling outside the window are dropped
 * -- a caller highlighting by offset must never be handed one that points
 * past the end of the string it is highlighting.
 */
export function snippetAround(text: string, matches: Match[], radius: number): { snippet: string; matches: Match[] } {
  const first = matches[0];
  if (!first) return { snippet: text.slice(0, radius * 2), matches: [] };

  const from = Math.max(0, first.start - radius);
  const to = Math.min(text.length, first.end + radius);
  const head = from > 0 ? '…' : '';
  const tail = to < text.length ? '…' : '';
  const body = text.slice(from, to);
  const shift = head.length - from;

  const rebased = matches
    .filter((m) => m.start >= from && m.end <= to)
    .map((m) => ({ start: m.start + shift, end: m.end + shift }));

  return { snippet: `${head}${body}${tail}`, matches: rebased };
}

export function search(notes: Notes, query: string): NoteResult[] {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];
  const terms = parseQuery(trimmed);
  if (terms.length === 0) return [];
  const phrase = trimmed.toLowerCase();

  const results: NoteResult[] = [];

  for (const note of notes.notes) {
    const found = new Set<string>();
    let score = 0;
    const hits: BlockHit[] = [];

    // Note-level fields. These never become hits -- there is no block to
    // scroll to -- but they rank and they make a note findable by a tag
    // its prose never spells.
    const fields: { text: string; weight: number }[] = [
      { text: note.title, weight: FIELD_WEIGHTS.title },
      // `?? []`, not a type-safety hedge: `notes.json` is served network-first
      // with a cache fallback, so this can genuinely be a pre-`tags` payload
      // from the previous deploy, and `.join` on `undefined` must not throw
      // inside the debounce timer and kill search for the rest of the session.
      { text: (note.tags ?? []).join('\n'), weight: FIELD_WEIGHTS.tags },
      { text: `${note.topic}\n${note.category}`, weight: FIELD_WEIGHTS.tags },
      { text: note.citations.join('\n'), weight: FIELD_WEIGHTS.citations }
    ];
    for (const field of fields) {
      if (field.text === '') continue;
      const { found: f } = findMatches(field.text, terms);
      for (const term of f) found.add(term);
      score += f.size * field.weight;
      if (f.size > 0 && field.text.toLowerCase().includes(phrase)) score += PHRASE_BONUS;
    }

    note.blocks.forEach((block, blockIndex) => {
      const { text, weight } = blockText(block);
      if (text === '') return;
      const { matches, found: f } = findMatches(text, terms);
      if (f.size === 0) return;
      for (const term of f) found.add(term);

      // Presence, not occurrence count: otherwise a long note wins by
      // repeating one word, which is the opposite of relevance.
      let blockScore = f.size * weight;
      if (text.toLowerCase().includes(phrase)) blockScore += PHRASE_BONUS;
      if (f.size === terms.length) blockScore += ALL_TERMS_IN_BLOCK_BONUS;

      score += blockScore;
      const windowed = snippetAround(text, matches, SNIPPET_RADIUS);
      hits.push({ blockIndex, snippet: windowed.snippet, matches: windowed.matches, score: blockScore });
    });

    // AND: every term must appear somewhere in the note.
    if (found.size !== terms.length) continue;

    hits.sort((a, b) => b.score - a.score || a.blockIndex - b.blockIndex);
    results.push({
      path: note.path, title: note.title, topic: note.topic, category: note.category,
      score, hits: hits.slice(0, MAX_HITS_PER_NOTE)
    });
  }

  results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return results.slice(0, MAX_NOTE_RESULTS);
}
