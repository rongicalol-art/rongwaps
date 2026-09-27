import { useState, useEffect, useCallback } from 'react';
import type { InteractiveGrammarPart } from '../../types/models';

export async function loadInteractiveGrammarPart(partId: string): Promise<InteractiveGrammarPart | undefined> {
  const match = partId.match(/^B(\d+)/i);
  const bookId = match ? Number(match[1]) : 1;
  const [{ fetchGrammarPack }] = await Promise.all([
    import('../../services/contentPacks'),
    import('../../screens/grammar-lesson/components/GrammarStudyPage'),
  ]);
  const parts = await fetchGrammarPack(bookId);
  return parts?.find((part) => part.id === partId);
}

export function useGrammarLauncher({ onOpen }: { onOpen?: () => void } = {}) {
  // The overlay URL sync in App owns ?grammarPart; local state starts empty.
  const [activeGrammarPartId, setActiveGrammarPartIdState] = useState<string | null>(null);
  const [activeGrammarPageId, setActiveGrammarPageId] = useState<string | null>(null);
  const [activeGrammarPart, setActiveGrammarPart] = useState<InteractiveGrammarPart | null>(null);
  const [isLoadingPart, setIsLoadingPart] = useState(false);

  const setActiveGrammarPartId = useCallback((partId: string | null) => {
    if (partId) onOpen?.();
    setActiveGrammarPartIdState(partId);
  }, [onOpen]);

  useEffect(() => {
    if (!activeGrammarPartId) {
      setActiveGrammarPart(null);
      setActiveGrammarPageId(null);
      setIsLoadingPart(false);
      return;
    }
    let cancelled = false;
    setIsLoadingPart(true);
    void loadInteractiveGrammarPart(activeGrammarPartId).then((part) => {
      if (!cancelled) {
        setActiveGrammarPart(part ?? null);
        setIsLoadingPart(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeGrammarPartId]);

  return {
    activeGrammarPartId,
    setActiveGrammarPartId,
    activeGrammarPageId,
    setActiveGrammarPageId,
    activeGrammarPart,
    isLoadingGrammar: isLoadingPart || (Boolean(activeGrammarPartId) && !activeGrammarPart),
  };
}
