import type { Flashcard } from '../../data/flashcards';
import type { DBDictionaryRow } from '../../types/database';
import type { RankedExample } from './courseExamples';
import { isValidFlashcardExtrasRow, type FlashcardExtras } from './flashcardExtrasPack';

export const studyPartKey = (bookId: number, lessonId: number, partId: number) => bookId * 1_000_000 + lessonId * 1000 + partId;
export interface StudyPart {
  key: number; bookId: number; lessonId: number; partId: number;
  count: number; ids: string[]; path: string; bytes: number; sha256: string;
}
export interface StudyPack {
  schemaVersion: 1; key: number; count: number; cards: Flashcard[];
  sentences: Omit<RankedExample, 'rank'>[];
  extras: Array<{ key: string; examples: [number, number][]; wordHook: string | null }>;
  dictionary: DBDictionaryRow[];
}
export interface LoadedStudyPack {
  cards: Flashcard[]; extras: Map<string, FlashcardExtras>; dictionary: Map<string, DBDictionaryRow[]>;
}
export function decodeStudyPack(pack: StudyPack): LoadedStudyPack {
  const examples = new Map<number, RankedExample>();
  const extras = new Map(pack.extras.map(row => [row.key, {
    wordHook: row.wordHook, examples: row.examples.map(([id, rank]) => {
      const key = id * 8 + rank;
      let example = examples.get(key);
      if (!example) { example = { ...pack.sentences[id], rank }; examples.set(key, example); }
      return example;
    }),
  }]));
  const dictionary = new Map<string, DBDictionaryRow[]>();
  for (const row of pack.dictionary) for (const word of new Set([row.traditional, row.simplified])) {
    const rows = dictionary.get(word) ?? []; rows.push(row); dictionary.set(word, rows);
  }
  return { cards: pack.cards, extras, dictionary };
}
export function validStudyPack(value: unknown, key: number, count: number): value is StudyPack {
  if (!value || typeof value !== 'object') return false;
  const pack = value as StudyPack;
  if (pack.schemaVersion !== 1 || pack.key !== key || pack.count !== count || !Array.isArray(pack.cards)
    || pack.cards.length !== count || !Array.isArray(pack.sentences) || !Array.isArray(pack.extras) || !Array.isArray(pack.dictionary)) return false;
  if (!pack.cards.every(card => typeof card?.id === 'string' && typeof card.front === 'string'
    && studyPartKey(card.bookId, card.lessonId, card.partId ?? 1) === key)) return false;
  if (!pack.dictionary.every(row => Number.isInteger(row?.id) && typeof row.simplified === 'string' && typeof row.traditional === 'string')) return false;
  return pack.extras.every(row => row && Array.isArray(row.examples) && row.examples.every(ref => Array.isArray(ref)
    && Number.isInteger(ref[0]) && ref[0] >= 0 && ref[0] < pack.sentences.length)
    && isValidFlashcardExtrasRow({ ...row, examples: row.examples.map(([id, rank]) => ({ ...pack.sentences[id], rank })) }));
}
