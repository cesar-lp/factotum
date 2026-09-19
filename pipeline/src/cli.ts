import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { buildDeck, parseNote } from './build.js';
import type { ParsedNote } from './types.js';

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return markdownFiles(full);
    return full.endsWith('.md') ? [full] : [];
  });
}

function main(): void {
  const [vaultDir, outFile] = process.argv.slice(2);
  if (!vaultDir || !outFile) {
    console.error('usage: build:deck <vaultDir> <outFile>');
    process.exit(2);
  }

  const taken = new Set<string>();
  const notes: ParsedNote[] = [];

  for (const file of markdownFiles(vaultDir).sort()) {
    const raw = readFileSync(file, 'utf8');
    const rel = relative(process.cwd(), file);
    const { note, updatedSource } = parseNote(rel, raw, taken);
    if (updatedSource !== raw) writeFileSync(file, updatedSource, 'utf8');
    if (note) notes.push(note);
  }

  const deck = buildDeck(notes, new Date());
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(deck, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${deck.cards.length} cards from ${notes.length} notes to ${outFile}`);
}

main();
