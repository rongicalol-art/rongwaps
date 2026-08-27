import { useCallback, useEffect, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { fetchVocabulary } from '../../../services/vocabularyService';

export interface BookVocabularyState {
  cards: Flashcard[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Loads the active book's vocabulary so the dictionary home can show a
 * rotating "From your book" word rail (packs include audio and pinyin).
 */
export function useBookVocabulary(bookId: number): BookVocabularyState {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError(null);

    if (bookId <= 0) {
      setCards([]);
      setIsLoading(false);
      return;
    }

    fetchVocabulary(bookId)
      .then((result) => {
        if (isCurrent) setCards(result);
      })
      .catch(() => {
        if (isCurrent) {
          setError('Book vocabulary is unavailable right now. Try again in a moment.');
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [bookId, tick]);

  const refetch = useCallback(() => setTick((value) => value + 1), []);

  return { cards, isLoading, error, refetch };
}
