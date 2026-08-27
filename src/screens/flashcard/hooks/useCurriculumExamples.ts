import { useEffect, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import type { RankedExample } from '../../../utils/courseExamples';

export function useCurriculumExamples(card: Flashcard | null | undefined, enabled = true) {
  const [examples, setExamples] = useState<RankedExample[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!enabled || !card?.front || !card.id) {
      setExamples([]);
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
        setExamples(findSmartExamplesForWord(matchingCards, searchWords, card.id));
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
  }, [card?.front, card?.id, card?.traditional, card?.simplified, enabled]);

  return { examples, isLoading };
}
