import matter from 'gray-matter';
import type { NoteMeta } from './types.js';

export interface FrontmatterResult {
  meta: NoteMeta | null;
  body: string;
  bodyStartLine: number;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

export function parseFrontmatter(raw: string): FrontmatterResult {
  const parsed = matter(raw);
  const category = parsed.data['category'];

  if (typeof category !== 'string' || category.trim() === '') {
    return { meta: null, body: parsed.content, bodyStartLine: 0 };
  }

  const consumed = raw.length - parsed.content.length;
  const bodyStartLine = raw.slice(0, consumed).split('\n').length - 1;

  return {
    meta: {
      category: category.trim(),
      tags: toStringArray(parsed.data['tags']),
      citations: toStringArray(parsed.data['citations'])
    },
    body: parsed.content,
    bodyStartLine
  };
}
