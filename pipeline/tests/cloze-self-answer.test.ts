import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { processVault, buildDeck } from '../src/build.js';
import type { Deck } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// The real vault, not a fixture — this check exists to guard content as the
// vault grows, so it must see what actually ships in deck.json.
const REAL_VAULT_DIR = resolve(__dirname, '../../vault');

/**
 * Below this length, a word-boundary match is more likely to be an
 * incidental collision (a number, a 1-2 char acronym, a unit) than a real
 * leaked answer, and the check would start crying wolf. Verified empirically
 * against the current deck: every cloze answer shorter than 3 characters
 * (single digits, 2-letter tokens) never legitimately recurs in its own
 * prompt, so raising the floor to 3 loses no real catches, while at 3 the
 * check still catches genuine short-word leaks (e.g. an answer "one" that
 * reappears later in the same sentence's explanation).
 */
const MIN_ANSWER_LENGTH = 3;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A cloze prompt is the whole source block with only the marked span
 * replaced by `___`; the marked text becomes the answer. If that answer
 * phrase also appears anywhere else in the block, the learner reads the
 * answer in plain sight and the card tests nothing. This scans the REAL
 * vault content (via processVault + buildDeck, not a stale deck.json) so it
 * fails the build the moment a new note introduces the same defect.
 *
 * `processVault` is not read-only: any card missing a `^card-xxxx` anchor
 * gets one minted and written back into its source file (that write-back is
 * exactly what `build:deck` relies on, so it must not be disabled here).
 * Running it straight against `REAL_VAULT_DIR` would make `npm test` itself
 * mutate the working tree the moment a new, not-yet-anchored note appears —
 * silently, with a randomly generated id, ahead of any real `build:deck`
 * run. So this test operates on a throwaway copy of the vault instead: the
 * copy is read from the real vault immediately before each run (nothing
 * here is a stale fixture) and discarded afterward, and any write-back a
 * card needs lands in that copy, never in the developer's checkout.
 */
describe('cloze cards do not print their own answer', () => {
  let deck: Deck;
  let tmpRoot: string;

  beforeAll(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'factotum-cloze-check-'));
    const vaultCopy = join(tmpRoot, 'vault');
    cpSync(REAL_VAULT_DIR, vaultCopy, { recursive: true });

    const { notes } = processVault(vaultCopy);
    deck = buildDeck(notes, new Date());
  });

  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('found cloze cards to check (sanity guard against a broken vault path)', () => {
    const clozeCards = deck.cards.filter((card) => card.format === 'cloze');
    expect(clozeCards.length).toBeGreaterThan(100);
  });

  it('never repeats a cloze answer elsewhere in its own generated prompt', () => {
    const clozeCards = deck.cards.filter((card) => card.format === 'cloze');
    const violations: string[] = [];

    for (const card of clozeCards) {
      const answer = (card.answer ?? '').trim();
      if (answer.length < MIN_ANSWER_LENGTH) continue;

      const pattern = new RegExp(`\\b${escapeRegExp(answer)}\\b`, 'i');
      if (pattern.test(card.prompt)) {
        violations.push(
          `${card.id} [${card.source.path}] answer ${JSON.stringify(answer)} recurs in prompt:\n    "${card.prompt}"`
        );
      }
    }

    expect(
      violations,
      `${violations.length} cloze card(s) leak their own answer back into the prompt:\n\n${violations.join('\n\n')}`
    ).toEqual([]);
  });
});
