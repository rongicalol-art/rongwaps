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
  const [snapshot, setSnapshot] = useState<{ userId: string | null; cards: UserFlashcard[] }>(() => {
    const cached = currentUser ? flashcardService.getCachedFlashcards(currentUser.id) : localFlashcards;
    return { userId: currentUser?.id ?? null, cards: Array.isArray(cached) ? cached : NO_CARDS };
  });

  useEffect(() => {
    if (!currentUser) {
      setSnapshot({ userId: null, cards: localFlashcards });
      return;
    }

    const unsubscribe = flashcardService.subscribeToUserFlashcards(currentUser.id, (updated) => {
      setSnapshot({ userId: currentUser.id, cards: Array.isArray(updated) ? updated : NO_CARDS });
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, localFlashcards]);

  // Cards saved before the encoder fix may hold a JSON-array string as their translation.
  return useMemo(
    () => (currentUser ? snapshot.userId === currentUser.id ? snapshot.cards : NO_CARDS : localFlashcards)
      .map((card) => (card.translation?.startsWith('["') ? { ...card, translation: meaningText(card.translation) } : card)),
    [snapshot, currentUser, localFlashcards],
  );
}
