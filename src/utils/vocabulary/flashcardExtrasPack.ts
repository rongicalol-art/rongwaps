import { getIdPosition } from '../lesson/curriculumPosition';
import type { Flashcard } from '../../data/flashcards';
import type { RankedExample } from './courseExamples';

export const FLASHCARD_EXTRAS_SHARDS = 256;
export interface FlashcardExtras {
  examples: RankedExample[];
  wordHook: string | null;
}
export interface FlashcardExtrasRow extends FlashcardExtras { key: string }

/** Include every field used by example matching; edited/custom cards use the live fallback. */
export function flashcardExtrasKey(card: Flashcard): string {
  if (!getIdPosition(card.id)) return JSON.stringify(['word', card.front]);
  return JSON.stringify([card.id, card.front, card.traditional ?? '', card.simplified ?? '', card.pos ?? '']);
}
export function flashcardExtrasShard(key: string): number {
  let hash = 0;
  for (const character of key) hash = ((hash * 31) + (character.codePointAt(0) ?? 0)) >>> 0;
  return hash % FLASHCARD_EXTRAS_SHARDS;
}

/** IndexedDB and HTTP responses are untrusted even for generated content. */
export function isValidFlashcardExtrasRow(value: unknown): value is FlashcardExtrasRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<FlashcardExtrasRow>;
  return typeof row.key === 'string' && (row.wordHook === null || typeof row.wordHook === 'string')
    && Array.isArray(row.examples) && row.examples.every((example) => example && typeof example.chinese === 'string'
      && typeof example.pinyin === 'string' && typeof example.english === 'string'
      && typeof example.sourceCardId === 'string' && typeof example.sourceFront === 'string'
      && Number.isInteger(example.sourceBookId) && Number.isInteger(example.sourceLessonId)
      && Number.isInteger(example.sourcePartId) && Number.isInteger(example.rank) && example.rank >= 1 && example.rank <= 5);
}
