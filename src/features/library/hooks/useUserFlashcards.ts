import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useAppStore } from '../../../store/useAppStore';
import { flashcardService } from '../../../services/flashcardService';
import { meaningText } from '../../../utils/vocabulary/dictionaryDefinitions';
import type { UserFlashcard } from '../../../types/models';

const NO_CARDS: UserFlashcard[] = [];

/**
 * Shared hook to access user flashcards reactively across any screen or modal,
 * handling guest storage and authenticated Supabase cards (refetched when the tab becomes visible).
 */
export function useUserFlashcards(): UserFlashcard[] {
  const { currentUser } = useAuth();
  const localFlashcards = useAppStore((state) => Array.isArray(state.localFlashcards) ? state.localFlashcards : NO_CARDS);
  const [cards, setCards] = useState<UserFlashcard[]>(() => {
    const cached = currentUser ? flashcardService.getCachedFlashcards(currentUser.id) : localFlashcards;
    return Array.isArray(cached) ? cached : NO_CARDS;
  });

  useEffect(() => {
    if (!currentUser) {
      setCards(localFlashcards);
      return;
    }

    const unsubscribe = flashcardService.subscribeToUserFlashcards(currentUser.id, (updated) => {
      setCards(Array.isArray(updated) ? updated : NO_CARDS);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, localFlashcards]);

  // Cards saved before the encoder fix may hold a JSON-array string as their translation.
  return useMemo(
    () => (currentUser ? cards.filter((card) => card.userId === currentUser.id) : localFlashcards)
      .map((card) => (card.translation?.startsWith('["') ? { ...card, translation: meaningText(card.translation) } : card)),
    [cards, currentUser, localFlashcards],
  );
}
