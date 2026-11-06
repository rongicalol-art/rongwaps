import { useEffect, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { fetchExamples, fetchVocabulary } from '../../../services/vocabularyService';
import { searchDictionaryWordsContaining, type DictionaryContainingWord } from '../../../services/dictionaryService';
import { isNoisyDictionarySuggestion } from '../../../utils/vocabulary/dictionaryDefinitions';
import type { WordExample } from '../../../types/models';

const HANZI_RE = /[一-鿿㐀-䶿]/u;
/** Book words per shared character: a common one (上) is in hundreds of them. */
const BOOK_WORDS_PER_CHARACTER = 6;

/**
 * A word related to this one. `close` words lead: they contain the whole word
 * (行李 → 行李箱) or are book words sharing a character; the rest only share a
 * character in the dictionary and show when common enough or behind "See all".
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

/** Related words, most related first: whole-word matches, then book words, then dictionary words sharing a character. */
async function fetchRelatedWords(word: string): Promise<WordRelatedWord[]> {
  const chars = [...new Set(Array.from(word).filter((char) => HANZI_RE.test(char)))];
  const [cards, whole, ...perCharacter] = await Promise.all([
    fetchVocabulary().catch(() => [] as Flashcard[]),
    chars.length > 1 ? searchDictionaryWordsContaining(word) : Promise.resolve([]),
    ...chars.map((char) => searchDictionaryWordsContaining(char)),
  ]);
  const seen = new Set<string>([word]);
  const results: WordRelatedWord[] = [];
  const add = (item: DictionaryContainingWord, close: boolean) => {
    if (seen.has(item.word) || isNoisyDictionarySuggestion(item.word, item.definition)) return;
    seen.add(item.word);
    results.push({ ...item, close });
  };

  const bookWords = cards
    .filter((card) => card.front !== word && chars.some((char) => card.front.includes(char)))
    .sort((a, b) => a.bookId - b.bookId || a.lessonId - b.lessonId);
  for (const card of bookWords) if (card.front.includes(word)) add(fromCard(card), true);
  for (const item of whole) add(item, true);
  for (const char of chars) {
    bookWords.filter((card) => card.front.includes(char)).slice(0, BOOK_WORDS_PER_CHARACTER).forEach((card) => add(fromCard(card), true));
  }
  for (const list of perCharacter) for (const item of list) add(item, false);
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
