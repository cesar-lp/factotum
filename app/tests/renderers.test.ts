import { describe, it, expect } from 'vitest';
import { normalizeAnswer, checkCloze, renderPrompt, renderActions } from '../src/ui/renderers.js';
import { issueUrl } from '../src/ui/flag.js';
import type { StoredCard } from '../src/db/schema.js';

const base = {
  category: 'networking', tags: [], source: { path: 'vault/a.md', block: 'card-aaaa' },
  citations: ['RFC 9293'], tombstoned: false
};

const cloze: StoredCard = { ...base, id: 'card-aaaa', format: 'cloze', prompt: 'MTU is ___.', answer: '1500 bytes' };
const mcq: StoredCard = {
  ...base, id: 'card-bbbb', format: 'mcq', prompt: 'Layer?',
  choices: [{ text: 'Transport', correct: true }, { text: 'Network', correct: false }]
};
const recall: StoredCard = { ...base, id: 'card-cccc', format: 'recall', prompt: 'Explain ARQ.' };

describe('answer checking', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeAnswer('  1500   Bytes ')).toBe('1500 bytes');
  });

  it('accepts answers differing only by case or spacing', () => {
    expect(checkCloze('1500  BYTES', '1500 bytes')).toBe(true);
    expect(checkCloze('1400 bytes', '1500 bytes')).toBe(false);
  });
});

describe('renderPrompt', () => {
  it('shows the category chip and prompt text', () => {
    const html = renderPrompt(cloze);
    expect(html).toContain('networking');
    expect(html).toContain('MTU is ___.');
  });

  it('escapes html in prompts', () => {
    const html = renderPrompt({ ...recall, prompt: '<script>x</script>' });
    expect(html).not.toContain('<script>');
  });
});

describe('renderActions', () => {
  it('renders one button per choice for mcq', () => {
    const html = renderActions(mcq, false);
    expect((html.match(/data-choice=/g) ?? [])).toHaveLength(2);
  });

  it('shows citations and a continue button once an mcq is revealed', () => {
    const html = renderActions(mcq, true);
    expect(html).toContain('RFC 9293');
    expect(html).toContain('data-outcome="continue"');
    expect(html).toContain('disabled');
  });

  it('renders an input and check button for cloze before reveal', () => {
    expect(renderActions(cloze, false)).toContain('data-role="cloze-input"');
  });

  it('renders four rating buttons for self-graded cards after reveal', () => {
    const html = renderActions(recall, true);
    for (const outcome of ['again', 'hard', 'good', 'easy']) {
      expect(html).toContain(`data-outcome="${outcome}"`);
    }
  });

  it('always renders the flag button', () => {
    expect(renderActions(mcq, false)).toContain('data-role="flag"');
    expect(renderActions(recall, true)).toContain('data-role="flag"');
  });
});

describe('issueUrl', () => {
  it('prefills the card id and note path', () => {
    const url = issueUrl(cloze, 'cesar-lp/factotum');
    expect(url).toContain('https://github.com/cesar-lp/factotum/issues/new');
    expect(decodeURIComponent(url)).toContain('card-aaaa');
    expect(decodeURIComponent(url)).toContain('vault/a.md');
  });
});
