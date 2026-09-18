import matter from 'gray-matter';
import type { NoteMeta } from './types.js';

export interface FrontmatterResult {
  meta: NoteMeta | null;
  body: string;
  bodyStartLine: number;
}

function toStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) return [];
  const kept = value.filter((v): v is string => typeof v === 'string');
  if (kept.length !== value.length) {
    const dropped = value.filter((v) => typeof v !== 'string');
    console.warn(`Dropped ${dropped.length} non-string ${field} entr${dropped.length === 1 ? 'y' : 'ies'}: ${JSON.stringify(dropped)}`);
  }
  return kept;
}

export function parseFrontmatter(raw: string): FrontmatterResult {
  const parsed = matter(raw);
  const category = parsed.data['category'];

  if (typeof category !== 'string' || category.trim() === '') {
    // bodyStartLine is meaningless when meta is null; callers must not treat 0 as a real line number.
    return { meta: null, body: parsed.content, bodyStartLine: 0 };
  }

  const consumed = raw.length - parsed.content.length;
  const bodyStartLine = raw.slice(0, consumed).split('\n').length - 1;

  return {
    meta: {
      category: category.trim(),
      tags: toStringArray(parsed.data['tags'], 'tags'),
      citations: toStringArray(parsed.data['citations'], 'citations')
    },
    body: parsed.content,
    bodyStartLine
  };
}
