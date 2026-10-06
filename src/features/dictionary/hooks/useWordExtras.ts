import { useEffect, useState } from 'react';
import { fetchExamples } from '../../../services/vocabularyService';
import { searchDictionaryWordsContaining, type DictionaryContainingWord } from '../../../services/dictionaryService';
import type { WordExample } from '../../../types/models';

const HANZI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF]/u;

/** A dictionary word sharing at least one of this word's characters. */
export type WordRelatedWord = DictionaryContainingWord;

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
