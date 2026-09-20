import { describe, it, expect } from 'vitest';
import { obsidianUrl } from '../src/ui/obsidian.js';
import type { StoredCard } from '../src/db/schema.js';

const base = {
  topic: 'networking', category: 'networking', tags: [], source: { path: 'vault/a.md', block: 'card-aaaa' },
  citations: [], tombstoned: false
};

const card: StoredCard = { ...base, id: 'card-aaaa', format: 'qa', prompt: 'p', answer: 'a' };

describe('obsidianUrl', () => {
  it('strips the leading vault/ segment and the trailing .md', () => {
    const c: StoredCard = { ...card, source: { ...card.source, path: 'vault/aws/iam/policy-evaluation-logic.md' } };
    const url = obsidianUrl(c, 'vault');
    expect(decodeURIComponent(url)).toBe('obsidian://open?vault=vault&file=aws/iam/policy-evaluation-logic');
  });

  it('leaves a path alone when it has no leading vault/ segment', () => {
    const c: StoredCard = { ...card, source: { ...card.source, path: 'aws/iam/policy-evaluation-logic.md' } };
    const url = obsidianUrl(c, 'vault');
    expect(decodeURIComponent(url)).toBe('obsidian://open?vault=vault&file=aws/iam/policy-evaluation-logic');
  });

  it('does not strip a vault/ segment appearing deeper in the path', () => {
    const c: StoredCard = { ...card, source: { ...card.source, path: 'notes/vault/thing.md' } };
    const url = obsidianUrl(c, 'vault');
    expect(decodeURIComponent(url)).toBe('obsidian://open?vault=vault&file=notes/vault/thing');
  });

  it('URL-encodes spaces and other characters in the path', () => {
    const c: StoredCard = { ...card, source: { ...card.source, path: 'vault/aws iam/policy logic.md' } };
    const url = obsidianUrl(c, 'vault');
    expect(url).toContain('file=aws+iam%2Fpolicy+logic');
  });

  it('URL-encodes a custom vault name containing spaces', () => {
    const c: StoredCard = { ...card, source: { ...card.source, path: 'vault/a.md' } };
    const url = obsidianUrl(c, 'My Notes');
    expect(url).toContain('vault=My+Notes');
    expect(url.replace(/\+/g, ' ')).toBe('obsidian://open?vault=My Notes&file=a');
  });

  it('uses the given custom vault name in the URL', () => {
    const url = obsidianUrl(card, 'second-brain');
    expect(decodeURIComponent(url)).toBe('obsidian://open?vault=second-brain&file=a');
  });
});
