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

/** A cloze highlight's span within its block's joined text. */
export interface RawCloze {
  start: number;
  end: number;
  /** Ordinal into the `ParsedCard[]` that `parseCards` yields for the same body. */
  cardIndex: number;
  answer: string;
}

export interface ResolvedCloze {
  start: number;
  end: number;
  cardId: string;
  answer: string;
}

/** A block as `parseBlocks` emits it: card references are ordinals. */
export type RawBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; lang: string | null; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'prose'; text: string; clozes: RawCloze[] }
  | { kind: 'qa'; cardIndex: number; prompt: string; answer: string }
  | { kind: 'card'; cardIndex: number; format: 'mcq' | 'recall'; prompt: string; choices?: Choice[]; answer?: string };

/** A block after `build.ts` resolves ordinals to ids. Only this form is serialized. */
export type NoteBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; lang: string | null; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'prose'; text: string; clozes: ResolvedCloze[] }
  | { kind: 'qa'; cardId: string; prompt: string; answer: string }
  | { kind: 'card'; cardId: string; format: 'mcq' | 'recall'; prompt: string; choices?: Choice[]; answer?: string };

export interface NoteDoc {
  path: string;
  title: string;
  topic: string;
  category: string;
  citations: string[];
  blocks: NoteBlock[];
}

export interface Notes {
  generatedAt: string;
  notes: NoteDoc[];
}
