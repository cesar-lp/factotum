import type { StoredCard } from '../db/schema.js';

export function issueUrl(card: StoredCard, repo: string): string {
  const title = `Card ${card.id} looks wrong`;
  const body = [
    `**Card:** \`${card.id}\``,
    `**Note:** \`${card.source.path}\``,
    `**Prompt:** ${card.prompt}`,
    card.answer ? `**Answer:** ${card.answer}` : '',
    '',
    'Flagged from the app during review.'
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({ title, body, labels: 'card-error' });
  return `https://github.com/${repo}/issues/new?${params.toString()}`;
}
