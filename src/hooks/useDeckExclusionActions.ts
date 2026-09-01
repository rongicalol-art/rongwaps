import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * Mutating actions for one deck's include/exclude curation. Reads via
 * `useAppStore.getState()` so callers never re-render on every exclusion
 * change — the deck itself re-renders through the loader's derived filter.
 */
export function useDeckExclusionActions(deckKey: string) {
  const toggleCard = useCallback((cardId: string) => {
    useAppStore.getState().toggleCardExclusion(deckKey, cardId);
  }, [deckKey]);

  const resetDeckExclusions = useCallback(() => {
    useAppStore.getState().clearDeckExclusions(deckKey);
  }, [deckKey]);

  return { toggleCard, resetDeckExclusions };
}
