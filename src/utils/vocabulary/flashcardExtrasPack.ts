import { getIdPosition } from '../lesson/curriculumPosition';
import type { Flashcard } from '../../data/flashcards';
import type { RankedExample } from './courseExamples';

export const FLASHCARD_EXTRAS_SHARDS = 512;
export const FLASHCARD_EXTRAS_CACHE_LIMIT = 128;
export interface FlashcardExtras {
  examples: RankedExample[];
  wordHook: string | null;
  /** Other-lesson examples not included here; load them on request. */
  more?: number;
}
export interface FlashcardExtrasRow extends FlashcardExtras { key: string }

/** Include every field used by example matching; edited/custom cards use the live fallback. */
export function flashcardExtrasKey(card: Flashcard): string {
  if (!getIdPosition(card.id)) return JSON.stringify(['word', card.front]);
  return JSON.stringify([card.id, card.front, card.traditional ?? '', card.simplified ?? '', card.pos ?? '']);
}
/**
 * The card shows only same-lesson examples (ranks 1–3); the rest sit behind "Show more".
 * Common words like 是 have hundreds of other-lesson sentences, about half of all study bytes.
 */
export const LESSON_EXAMPLE_MAX_RANK = 3;
export const lessonExamples = <T extends { rank: number }>(examples: readonly T[]): T[] =>
  examples.filter(({ rank }) => rank <= LESSON_EXAMPLE_MAX_RANK);
/** Lesson-only extras; `more` counts the examples held back (omitted when none). */
export function lessonExtras(row: FlashcardExtras): FlashcardExtras {
  const examples = lessonExamples(row.examples);
  const more = row.examples.length - examples.length;
  return { wordHook: row.wordHook, examples, ...(more ? { more } : {}) };
}
export function flashcardExtrasShard(key: string): number {
  let hash = 0;
  for (const character of key) hash = ((hash * 31) + (character.codePointAt(0) ?? 0)) >>> 0;
  return hash % FLASHCARD_EXTRAS_SHARDS;
}

function isValidSentenceAudio(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const audio = value as Record<string, unknown>;
  const hasRange = 'start' in audio || 'end' in audio;
  return (audio.voice === 'book' || audio.voice === 'studio')
    && typeof audio.file === 'string' && audio.file.trim().length > 0
    && (!hasRange || (typeof audio.start === 'number' && Number.isFinite(audio.start) && audio.start >= 0
      && typeof audio.end === 'number' && Number.isFinite(audio.end) && audio.end > audio.start))
    && (audio.cache === undefined || typeof audio.cache === 'boolean');
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
      && Number.isInteger(example.sourcePartId) && Number.isInteger(example.rank) && example.rank >= 1 && example.rank <= 5
      && (example.audio === undefined || isValidSentenceAudio(example.audio)));
}
