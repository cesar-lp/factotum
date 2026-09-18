import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '../src/frontmatter.js';

describe('parseFrontmatter', () => {
  it('extracts category, tags and citations', () => {
    const raw = [
      '---',
      'category: networking',
      'tags: [tcp, transport-layer]',
      'citations: ["RFC 793 §1.4"]',
      '---',
      '',
      '# Title'
    ].join('\n');

    const { meta, body, bodyStartLine } = parseFrontmatter(raw);

    expect(meta).toEqual({
      category: 'networking',
      tags: ['tcp', 'transport-layer'],
      citations: ['RFC 793 §1.4']
    });
    expect(body.trim()).toBe('# Title');
    expect(bodyStartLine).toBe(5);
  });

  it('defaults tags and citations to empty arrays', () => {
    const raw = '---\ncategory: algorithms\n---\nbody';
    expect(parseFrontmatter(raw).meta).toEqual({
      category: 'algorithms',
      tags: [],
      citations: []
    });
  });

  it('returns null meta when category is absent', () => {
    expect(parseFrontmatter('---\ntags: [x]\n---\nbody').meta).toBeNull();
  });

  it('returns null meta when there is no frontmatter at all', () => {
    expect(parseFrontmatter('# Just a draft').meta).toBeNull();
  });
});
