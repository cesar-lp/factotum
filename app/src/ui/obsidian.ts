import type { StoredCard } from '../db/schema.js';

/**
 * Builds an `obsidian://open` deep link back to the note a card came from.
 * The repo's `vault/` directory IS the Obsidian vault root (the README
 * tells the owner to open `vault/` directly in Obsidian), so the leading
 * `vault/` segment of `card.source.path` is stripped — it isn't part of
 * the vault-relative file path Obsidian expects — along with the trailing
 * `.md` extension, which Obsidian's `file` param omits.
 */
export function obsidianUrl(card: StoredCard, vaultName: string): string {
  let file = card.source.path;
  if (file.startsWith('vault/')) file = file.slice('vault/'.length);
  file = file.replace(/\.md$/, '');

  const params = new URLSearchParams({ vault: vaultName, file });
  return `obsidian://open?${params.toString()}`;
}
