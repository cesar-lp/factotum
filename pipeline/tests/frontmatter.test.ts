import { describe, it, expect, vi } from 'vitest';
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
      topic: 'networking',
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
      topic: 'algorithms',
      category: 'algorithms',
      tags: [],
      citations: []
    });
  });

  it('extracts topic when present', () => {
    const raw = '---\ntopic: aws\ncategory: aws-dynamodb\n---\nbody';
    expect(parseFrontmatter(raw).meta).toEqual({
      topic: 'aws',
      category: 'aws-dynamodb',
      tags: [],
      citations: []
    });
  });

  it('trims a padded topic', () => {
    const raw = '---\ntopic: "  aws  "\ncategory: aws-s3\n---\nbody';
    expect(parseFrontmatter(raw).meta?.topic).toBe('aws');
  });

  it('defaults an absent topic to the category', () => {
    const raw = '---\ncategory: networking\n---\nbody';
    expect(parseFrontmatter(raw).meta?.topic).toBe('networking');
  });

  it('defaults a blank or non-string topic to the category', () => {
    expect(parseFrontmatter('---\ntopic: "   "\ncategory: networking\n---\nb').meta?.topic)
      .toBe('networking');
    expect(parseFrontmatter('---\ntopic: 7\ncategory: networking\n---\nb').meta?.topic)
      .toBe('networking');
  });

  it('still ignores a note that has a topic but no category', () => {
    expect(parseFrontmatter('---\ntopic: aws\n---\nbody').meta).toBeNull();
  });

  it('returns null meta when category is absent', () => {
    expect(parseFrontmatter('---\ntags: [x]\n---\nbody').meta).toBeNull();
  });

  it('returns null meta when there is no frontmatter at all', () => {
    expect(parseFrontmatter('# Just a draft').meta).toBeNull();
  });

  it('drops non-string tags and warns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const raw = '---\ncategory: algorithms\ntags: [1, 2, "real"]\n---\nbody';
      const { meta } = parseFrontmatter(raw);
      expect(meta?.tags).toEqual(['real']);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
