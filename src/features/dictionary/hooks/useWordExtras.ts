import { useEffect, useMemo, useState } from 'react';
import { fetchExamplesForWord } from '../../../services/vocabularyService';
import { searchDictionaryWordsContaining, type DictionaryContainingWord } from '../../../services/dictionaryService';
import { useCharBreakdown } from '../../../hooks/useCharBreakdown';
import { numberToToneMarks } from '../../../utils/pinyin';
import type { DBCharacterBreakdown } from '../../../types/database';

const HANZI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF]/u;

/** A single in-context sentence pulled from the course that uses this word. */
export interface WordExample {
  chinese: string;
  pinyin: string;
  english: string;
  sourceCardId: string;
  sourceFront: string;
  sourceBookId: number;
  sourceLessonId: number;
}

/** A dictionary word sharing at least one of this word's characters. */
export type WordRelatedWord = DictionaryContainingWord;

/** Decomposition components (radicals/parts) for a single character. */
export interface CharacterDecomposition {
  char: string;
  components: string[];
}

const NON_CHAR_RE = /[⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻\s！？?]/;

/** Fetch example sentences that contain the given word, deduped by sentence text.
 * Only sentences that carry a full pinyin + English translation are surfaced, so
 * the section reads consistently (the course-example pack provides these; the
 * fallback `book_vocabulary` source often stores Chinese-only strings).
 * `limit` caps the returned pool; callers that need a deeper list (e.g. the
 * breakdown example-sentence block with a Show more toggle) raise it.
 * Shared with other features (e.g. the breakdown memory hook). */
export async function fetchExamples(word: string, limit = 3): Promise<WordExample[]> {
  const cards = await fetchExamplesForWord(word);
  const seen = new Set<string>();
  const examples: WordExample[] = [];

  for (const card of cards) {
    for (const ex of card.examples ?? []) {
      const chinese = ex.chinese?.trim();
      const pinyin = ex.pinyin?.trim();
      const english = ex.english?.trim();
      if (!chinese || !chinese.includes(word)) continue;
      if (!pinyin || !english) continue;
      if (seen.has(chinese)) continue;
      seen.add(chinese);
      examples.push({
        chinese,
        pinyin,
        english,
        sourceCardId: card.id,
        sourceFront: card.front,
        sourceBookId: card.bookId,
        sourceLessonId: card.lessonId,
      });
      if (examples.length >= limit) return examples;
    }
  }

  return examples;
}

/** Gather dictionary words containing any of the word's characters, deduped. */
async function fetchRelatedWords(word: string): Promise<WordRelatedWord[]> {
  const chars = Array.from(word).filter((c) => HANZI_RE.test(c));
  const seen = new Set<string>([word]);
  const results: WordRelatedWord[] = [];

  for (const char of chars) {
    const matches = await searchDictionaryWordsContaining(char, 12);
    for (const match of matches) {
      if (seen.has(match.word)) continue;
      seen.add(match.word);
      results.push(match);
      if (results.length >= 12) return results;
    }
  }

  return results;
}

export function useWordExtras(word: string) {
  const [examples, setExamples] = useState<WordExample[]>([]);
  const [relatedWords, setRelatedWords] = useState<WordRelatedWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setExamples([]);
    setRelatedWords([]);

    void Promise.allSettled([fetchExamples(word), fetchRelatedWords(word)]).then(([ex, rw]) => {
      if (!active) return;
      setExamples(ex.status === 'fulfilled' ? ex.value : []);
      setRelatedWords(rw.status === 'fulfilled' ? rw.value : []);
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [word]);

  return { examples, relatedWords, isLoading };
}

/** Components (radicals/parts) of a single character, from its breakdown entry. */
export function useCharacterDecomposition(
  char: string,
): { components: string[]; pinyin: string; meaning: string; data: DBCharacterBreakdown | null } {
  const data = useCharBreakdown(char);

  const components = useMemo(() => {
    if (!data?.decomposition) return [];
    return Array.from(data.decomposition).filter((c) => !NON_CHAR_RE.test(c) && c !== char);
  }, [data, char]);

  const pinyin = data?.pinyin?.[0] ? numberToToneMarks(data.pinyin[0]) : '';
  const meaning = data?.definition || '';

  return { components, pinyin, meaning, data };
}
