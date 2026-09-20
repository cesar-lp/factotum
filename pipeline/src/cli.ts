import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  buildDeck, buildNotes, processVault,
  readExistingDeck, readExistingNotes,
  withStableGeneratedAt, withStableNotesGeneratedAt
} from './build.js';

function main(): void {
  const [vaultDir, outFile, notesOutFile] = process.argv.slice(2);
  if (!vaultDir || !outFile || !notesOutFile) {
    console.error('usage: build:deck <vaultDir> <deckOutFile> <notesOutFile>');
    process.exit(2);
  }

  const now = new Date();
  const { notes: parsed, bodies } = processVault(vaultDir);

  const deck = withStableGeneratedAt(buildDeck(parsed, now), readExistingDeck(outFile));
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(deck, null, 2)}\n`, 'utf8');

  // Written second and separately: notes.json is a reading surface, and a
  // failure to produce it must never leave a half-written deck behind.
  const notes = withStableNotesGeneratedAt(buildNotes(parsed, bodies, now), readExistingNotes(notesOutFile));
  mkdirSync(dirname(notesOutFile), { recursive: true });
  writeFileSync(notesOutFile, `${JSON.stringify(notes, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${deck.cards.length} cards and ${notes.notes.length} notes from ${parsed.length} notes`);
}

main();
