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
  /**
   * The shelf this note sits on — a book, a subject, a cloud provider.
   * Grouping and bulk-toggling happen at this level; interleaving and
   * mastery stay keyed on `category`. Always populated: a note that omits
   * `topic` gets its own `category` as its topic, so a single-category
   * shelf is the floor, never an absent one.
   */
  topic: string;
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
  topic: string;
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
