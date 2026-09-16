import { useState, useEffect, useCallback } from 'react';
import type { InteractiveGrammarPart } from '../../types/models';

export async function loadInteractiveGrammarPart(partId: string): Promise<InteractiveGrammarPart | undefined> {
  const { getInteractiveGrammarPart } = await import('../../data/interactiveGrammarPages');
  return getInteractiveGrammarPart(partId);
}

export function useGrammarLauncher({ onOpen }: { onOpen?: () => void } = {}) {
  // The overlay URL sync in App owns ?grammarPart; local state starts empty.
  const [activeGrammarPartId, setActiveGrammarPartIdState] = useState<string | null>(null);
  const [activeGrammarPageId, setActiveGrammarPageId] = useState<string | null>(null);
  const [activeGrammarPart, setActiveGrammarPart] = useState<InteractiveGrammarPart | null>(null);

  const setActiveGrammarPartId = useCallback((partId: string | null) => {
    if (partId) onOpen?.();
    setActiveGrammarPartIdState(partId);
  }, [onOpen]);

  useEffect(() => {
    if (!activeGrammarPartId) {
      setActiveGrammarPart(null);
      setActiveGrammarPageId(null);
      return;
    }
    let cancelled = false;
    void loadInteractiveGrammarPart(activeGrammarPartId).then((part) => {
      if (!cancelled) setActiveGrammarPart(part ?? null);
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
  };
}
