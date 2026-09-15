import { useEffect, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import type { RankedExample } from '../../../utils/courseExamples';

const examplesCache = new Map<string, RankedExample[]>();

export function useCurriculumExamples(card: Flashcard | null | undefined, enabled = true) {
  const cacheKey = card?.id && card.front
    ? `${card.id}:${card.front}:${card.traditional || ''}:${card.simplified || ''}`
    : null;

  const [examples, setExamples] = useState<RankedExample[]>(() => {
    if (!cacheKey) return [];
    return examplesCache.get(cacheKey) ?? [];
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!enabled || !card?.front || !card.id || !cacheKey) {
      setExamples([]);
      setIsLoading(false);
      return;
    }

    const cached = examplesCache.get(cacheKey);
    if (cached) {
      setExamples(cached);
      setIsLoading(false);
      return;
    }

    setExamples([]);
    setIsLoading(true);

    void (async () => {
      try {
        // Search the raw traditional AND simplified forms: the cleaned front
        // alone would miss slash alternatives (護士) and the other script (老板).
        const searchWords = [card.traditional, card.simplified, card.front].filter(
          (form): form is string => Boolean(form?.trim()),
        );
        const { fetchExamplesForWord } = await import('../../../services/vocabularyService');
        const matchingCards = await fetchExamplesForWord(searchWords);
        if (!isMounted) return;

        const { findSmartExamplesForWord } = await import('../../../utils/courseExamples');
        const resolved = findSmartExamplesForWord(matchingCards, searchWords, card.id);
        examplesCache.set(cacheKey, resolved);
        if (isMounted) setExamples(resolved);
      } catch (error) {
        console.error('Error loading curriculum-safe examples:', error);
        if (isMounted) setExamples([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [card?.front, card?.id, card?.traditional, card?.simplified, cacheKey, enabled]);

  return { examples, isLoading };
}
