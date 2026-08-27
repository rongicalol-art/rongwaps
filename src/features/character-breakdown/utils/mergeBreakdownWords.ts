import type { Flashcard } from '../../../data/flashcards';
import type { DictionaryContainingWord } from '../../../services/dictionaryService';

export function mergeBreakdownWords(
  courseWords: Flashcard[],
  dictionaryWords: DictionaryContainingWord[],
): Flashcard[] {
  const merged = new Map<string, Flashcard>();
  for (const card of courseWords) merged.set(card.front, { ...card, source: 'course' });

  dictionaryWords.forEach((entry, index) => {
    if (merged.has(entry.word)) return;
    merged.set(entry.word, {
      id: `dictionary-${index}-${entry.word}-${entry.pinyin}`,
      bookId: 0,
      lessonId: 0,
      front: entry.word,
      back: entry.definition,
      pinyin: entry.pinyin,
      source: 'dictionary',
    });
  });

  return [...merged.values()];
}
