import { useState, useEffect } from 'react';
import type { InteractiveGrammarPart } from '../../types/models';

export async function loadInteractiveGrammarPart(partId: string): Promise<InteractiveGrammarPart | undefined> {
  const { getInteractiveGrammarPart } = await import('../../data/interactiveGrammarPages');
  return getInteractiveGrammarPart(partId);
}

export function useGrammarLauncher() {
  const [activeGrammarPartId, setActiveGrammarPartId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('grammarPart') || null;
    }
    return null;
  });
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
