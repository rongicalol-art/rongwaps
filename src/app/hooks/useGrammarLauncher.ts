import { useState, useEffect } from 'react';
import type { InteractiveGrammarPart } from '../../types/models';

export async function loadInteractiveGrammarPart(partId: string): Promise<InteractiveGrammarPart | undefined> {
  const { getInteractiveGrammarPart } = await import('../../data/interactiveGrammarPages');
  return getInteractiveGrammarPart(partId);
}

export function useGrammarLauncher() {
  // The overlay URL sync in App owns ?grammarPart; local state starts empty.
  const [activeGrammarPartId, setActiveGrammarPartId] = useState<string | null>(null);
  const [activeGrammarPart, setActiveGrammarPart] = useState<InteractiveGrammarPart | null>(null);

  useEffect(() => {
    if (!activeGrammarPartId) {
      setActiveGrammarPart(null);
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
    activeGrammarPart,
  };
}
