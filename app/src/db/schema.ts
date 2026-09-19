import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DeckCard } from '../../../pipeline/src/types.js';

export interface StoredCard extends DeckCard {
  tombstoned: boolean;
}

export interface ReviewState {
  cardId: string;
  due: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: number | null;
  suspended: boolean;
  flagged: boolean;
}

export interface ReviewLogEntry {
  id?: number;
  cardId: string;
  ts: number;
  rating: number;
  durationMs: number;
}

export interface Settings {
  desiredRetention: number;
  newCardsPerDay: number;
  theme: 'auto' | 'day' | 'night';
}

export interface FactotumSchema extends DBSchema {
  cards: { key: string; value: StoredCard };
  reviews: { key: string; value: ReviewState; indexes: { due: number } };
  reviewLog: { key: number; value: ReviewLogEntry; indexes: { ts: number } };
  meta: { key: string; value: unknown };
}

export type FactotumDb = IDBPDatabase<FactotumSchema>;

export function openDb(): Promise<FactotumDb> {
  return openDB<FactotumSchema>('factotum', 1, {
    upgrade(db) {
      db.createObjectStore('cards', { keyPath: 'id' });
      const reviews = db.createObjectStore('reviews', { keyPath: 'cardId' });
      reviews.createIndex('due', 'due');
      const log = db.createObjectStore('reviewLog', { keyPath: 'id', autoIncrement: true });
      log.createIndex('ts', 'ts');
      db.createObjectStore('meta');
    }
  });
}
