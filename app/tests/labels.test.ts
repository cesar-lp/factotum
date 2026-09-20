import { describe, it, expect } from 'vitest';
import { categoryLabel } from '../src/ui/labels.js';

describe('categoryLabel: real vault categories', () => {
  const cases: Array<[string, string, string]> = [
    // topic              category                    expected
    ['algorithms', 'algo-data-structures', 'data structures'],
    ['algorithms', 'algo-design', 'design'],
    ['algorithms', 'algo-foundations', 'foundations'],
    ['algorithms', 'algo-graphs', 'graphs'],
    ['algorithms', 'algo-sorting', 'sorting'],

    ['aws', 'aws-api-gateway', 'api gateway'],
    ['aws', 'aws-dynamodb', 'dynamodb'],
    ['aws', 'aws-iam', 'iam'],
    ['aws', 'aws-lambda', 'lambda'],
    ['aws', 'aws-messaging', 'messaging'],
    ['aws', 'aws-opensearch', 'opensearch'],
    ['aws', 'aws-rds', 'rds'],
    ['aws', 'aws-s3', 's3'],

    ['concurrency', 'amp', 'amp'],
    ['concurrency', 'os-concurrency', 'os concurrency'],

    ['data-systems', 'data-systems', 'data systems'],

    ['database-internals', 'database-internals', 'database internals'],

    ['networking', 'networking', 'networking'],

    ['operating-systems', 'os-persistence', 'persistence'],
    ['operating-systems', 'os-virtualization', 'virtualization']
  ];

  for (const [topic, category, expected] of cases) {
    it(`"${category}" under "${topic}" -> "${expected}"`, () => {
      expect(categoryLabel(category, topic)).toBe(expected);
    });
  }
});

describe('categoryLabel: degenerate and unexpected shapes', () => {
  it('empty category with no topic returns empty string', () => {
    expect(categoryLabel('')).toBe('');
  });

  it('empty category with a topic returns empty string', () => {
    expect(categoryLabel('', 'algorithms')).toBe('');
  });

  it('empty topic just humanizes the category', () => {
    expect(categoryLabel('algo-graphs', '')).toBe('algo graphs');
  });

  it('undefined topic just humanizes the category', () => {
    expect(categoryLabel('algo-graphs')).toBe('algo graphs');
  });

  it('category identical to topic is never stripped to nothing', () => {
    expect(categoryLabel('networking', 'networking')).toBe('networking');
    expect(categoryLabel('data-systems', 'data-systems')).toBe('data systems');
    expect(categoryLabel('database-internals', 'database-internals')).toBe('database internals');
  });

  it('category with no shared prefix with its topic is left alone', () => {
    expect(categoryLabel('amp', 'concurrency')).toBe('amp');
  });

  it('a category that is a strict prefix of its topic is not mangled', () => {
    // "algo" is a prefix of "algorithms", but has no dash to split on, so
    // there is nothing to strip it down to - it must come back untouched.
    expect(categoryLabel('algo', 'algorithms')).toBe('algo');
  });

  it('a slug-style prefix that only coincidentally relates to another topic is not stripped', () => {
    // "os-concurrency" lives under the "concurrency" topic in the real vault,
    // even though its "os-" prefix reads like it belongs to "operating-systems".
    // The function must judge the prefix against the topic it was actually
    // given, not any topic the prefix might suggest.
    expect(categoryLabel('os-concurrency', 'concurrency')).toBe('os concurrency');
  });

  it('does not throw on a category made only of dashes', () => {
    expect(() => categoryLabel('---', 'algorithms')).not.toThrow();
  });

  it('does not throw on a category with a trailing dash', () => {
    expect(() => categoryLabel('algo-', 'algorithms')).not.toThrow();
    expect(categoryLabel('algo-', 'algorithms')).toBe('algo');
  });

  it('does not throw on a topic with a trailing dash', () => {
    expect(() => categoryLabel('algo-graphs', 'algorithms-')).not.toThrow();
  });

  it('does not throw on whitespace-only input', () => {
    expect(() => categoryLabel('   ', 'algorithms')).not.toThrow();
  });

  it('a two-word topic strips only its true initials, not any substring', () => {
    // "operating-systems" -> initials "os". A prefix drawn from the second
    // word alone ("sys", from "systems") is neither that initialism nor a
    // truncation of the topic string, so it must survive untouched.
    expect(categoryLabel('sys-scheduling', 'operating-systems')).toBe('sys scheduling');
  });
});
