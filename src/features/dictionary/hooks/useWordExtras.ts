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
