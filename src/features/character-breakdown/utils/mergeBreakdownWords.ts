import type { Flashcard } from '../../../data/flashcards';
import type { DictionaryContainingWord } from '../../../services/dictionaryService';
import { isNoisyDictionarySuggestion } from '../../../utils/vocabulary/dictionaryDefinitions';

/**
 * Course words first (as given), then dictionary words. When `wordLevel` is
 * known, dictionary words a learner will actually meet (official list levels,
 * lowest first — pass no estimates) lead; unleveled words (names, rare terms,
 * transliterations) keep their order after. Vulgar, slang and fad coinages
 * never appear as dictionary suggestions.
 */
export function mergeBreakdownWords(
  courseWords: Flashcard[],
  dictionaryWords: DictionaryContainingWord[],
  wordLevel?: (word: string) => number | undefined,
): Flashcard[] {
  const merged = new Map<string, Flashcard>();
  for (const card of courseWords) merged.set(card.front, { ...card, source: 'course' });

  const rankOf = (word: string) => wordLevel?.(word) ?? Number.POSITIVE_INFINITY;
  const usable = dictionaryWords.filter((entry) => !isNoisyDictionarySuggestion(entry.word, entry.definition));
  const orderedDictionary = wordLevel
    ? usable
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => rankOf(a.entry.word) - rankOf(b.entry.word) || a.index - b.index)
      .map(({ entry }) => entry)
    : usable;

  orderedDictionary.forEach((entry, index) => {
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
