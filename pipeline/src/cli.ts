import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildDeck, processVault, readExistingDeck, withStableGeneratedAt } from './build.js';

function main(): void {
  const [vaultDir, outFile] = process.argv.slice(2);
  if (!vaultDir || !outFile) {
    console.error('usage: build:deck <vaultDir> <outFile>');
    process.exit(2);
  }

  const { notes } = processVault(vaultDir);
  const built = buildDeck(notes, new Date());
  const deck = withStableGeneratedAt(built, readExistingDeck(outFile));
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(deck, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${deck.cards.length} cards from ${notes.length} notes to ${outFile}`);
}

main();
