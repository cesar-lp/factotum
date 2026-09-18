export type CardFormat = 'cloze' | 'qa' | 'mcq' | 'recall';

export interface Choice {
  text: string;
  correct: boolean;
}

export interface ParsedCard {
  id: string | null;
  format: CardFormat;
  prompt: string;
  answer?: string;
  choices?: Choice[];
  /** 0-indexed line in the source file that carries (or will carry) the ^card-xxxx anchor. */
  anchorLine: number;
}

export interface NoteMeta {
  category: string;
  tags: string[];
  citations: string[];
}

export interface ParsedNote extends NoteMeta {
  path: string;
  cards: ParsedCard[];
}

export interface DeckCard {
  id: string;
  format: CardFormat;
  category: string;
  tags: string[];
  prompt: string;
  answer?: string;
  choices?: Choice[];
  source: { path: string; block: string };
  citations: string[];
}

export interface Deck {
  generatedAt: string;
  cards: DeckCard[];
}
