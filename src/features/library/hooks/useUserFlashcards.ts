import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useAppStore } from '../../../store/useAppStore';
import { flashcardService } from '../../../services/flashcardService';
import { meaningText } from '../../../utils/dictionaryDefinitions';
import type { UserFlashcard } from '../../../types/models';

/**
 * Shared hook to access user flashcards reactively across any screen or modal,
 * handling guest storage and authenticated Supabase cards (refetched when the tab becomes visible).
 */
export function useUserFlashcards(): UserFlashcard[] {
  const { currentUser } = useAuth();
  const localFlashcards = useAppStore((state) => state.localFlashcards);
  const [cards, setCards] = useState<UserFlashcard[]>(() => {
    if (currentUser) {
      return flashcardService.getCachedFlashcards() || [];
    }
    return localFlashcards;
  });

  useEffect(() => {
    if (!currentUser) {
      setCards(localFlashcards);
      return;
    }

    const unsubscribe = flashcardService.subscribeToUserFlashcards(currentUser.id, (updated) => {
      setCards(updated);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, localFlashcards]);

  // Cards saved before the encoder fix may hold a JSON-array string as their translation.
  return useMemo(
    () => cards.map((card) => (card.translation?.startsWith('["') ? { ...card, translation: meaningText(card.translation) } : card)),
    [cards],
  );
}
