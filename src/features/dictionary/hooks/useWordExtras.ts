import { useEffect, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { fetchExamples, fetchVocabulary } from '../../../services/vocabularyService';
import { searchDictionaryWordsContaining, type DictionaryContainingWord } from '../../../services/dictionaryService';
import { isNoisyDictionarySuggestion } from '../../../utils/vocabulary/dictionaryDefinitions';
import type { WordExample } from '../../../types/models';

/**
 * A longer word that contains this one (行李 → 行李箱). `close` marks book
 * words, which lead; the rest are dictionary words.
 */
export interface WordRelatedWord extends DictionaryContainingWord {
  close: boolean;
}

const fromCard = (card: Flashcard): DictionaryContainingWord => ({
  word: card.front,
  traditional: card.traditional ?? card.front,
  simplified: card.simplified ?? card.front,
  pinyin: card.pinyin ?? '',
  definition: card.back,
});

/**
 * Longer words that contain this whole word: book words first (earliest lesson
 * first), then dictionary words. A word that only shares one character (行李 and
 * 旅行) is not related: it belongs to that character's own page.
 */
async function fetchRelatedWords(word: string): Promise<WordRelatedWord[]> {
  const [cards, containing] = await Promise.all([
    fetchVocabulary().catch(() => [] as Flashcard[]),
    searchDictionaryWordsContaining(word),
  ]);
  const seen = new Set<string>([word]);
  const results: WordRelatedWord[] = [];
  const add = (item: DictionaryContainingWord, close: boolean) => {
    if (seen.has(item.word) || isNoisyDictionarySuggestion(item.word, item.definition)) return;
    seen.add(item.word);
    results.push({ ...item, close });
  };
  cards
    .filter((card) => card.front !== word && card.front.includes(word))
    .sort((a, b) => a.bookId - b.bookId || a.lessonId - b.lessonId)
    .forEach((card) => add(fromCard(card), true));
  containing.forEach((item) => add(item, false));
  return results;
}

export function useWordExtras(word: string) {
  const [examples, setExamples] = useState<WordExample[]>([]);
  const [relatedWords, setRelatedWords] = useState<WordRelatedWord[]>([]);
  const [examplesLoading, setExamplesLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setExamplesLoading(true);
    setRelatedLoading(true);
    setExamples([]);
    setRelatedWords([]);

    void fetchExamples(word).then((value) => { if (active) setExamples(value); })
      .catch(() => {}).finally(() => { if (active) setExamplesLoading(false); });
    void fetchRelatedWords(word).then((value) => { if (active) setRelatedWords(value); })
      .catch(() => {}).finally(() => { if (active) setRelatedLoading(false); });

    return () => {
      active = false;
    };
  }, [word]);

  return { examples, relatedWords, examplesLoading, relatedLoading };
}
