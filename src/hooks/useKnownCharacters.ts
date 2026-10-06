import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { fetchVocabulary } from '../services/vocabularyService';
import type { Flashcard } from '../data/flashcards';

export interface KnownCharacters {
  /** Course cards (all books); null until loaded. */
  courseCards: Flashcard[] | null;
  /** Ids of course words the learner has passed. */
  learnedIds: Set<string>;
  /** Characters inside passed course words. */
  chars: Set<string>;
}

/**
 * What the learner already knows, derived from passed course words
 * (`learnedCards`). A character is known once any passed word contains it.
 */
export function useKnownCharacters(): KnownCharacters {
  const learnedCards = useAppStore((state) => state.learnedCards);
  const [courseCards, setCourseCards] = useState<Flashcard[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchVocabulary()
      .then((cards) => {
        if (active) setCourseCards(cards.filter((card) => card.source !== 'dictionary'));
      })
      .catch(() => {
        if (active) setCourseCards([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => {
    const learnedIds = new Set(learnedCards);
    const chars = new Set<string>();
    for (const card of courseCards ?? []) {
      if (learnedIds.has(card.id)) for (const char of card.front) chars.add(char);
    }
    return { courseCards, learnedIds, chars };
  }, [courseCards, learnedCards]);
}
