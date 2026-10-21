import { useState, useEffect, useCallback } from 'react';
import type { InteractiveGrammarPart } from '../../types/models';
import { warmChineseFont } from '../../utils/browser/fontWarmup';

export async function loadInteractiveGrammarPart(partId: string): Promise<InteractiveGrammarPart | undefined> {
  warmChineseFont();
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
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const setActiveGrammarPartId = useCallback((partId: string | null) => {
    if (partId) onOpen?.();
    setActiveGrammarPartIdState(partId);
  }, [onOpen]);

  useEffect(() => {
    if (!activeGrammarPartId) {
      setActiveGrammarPart(null);
      setActiveGrammarPageId(null);
      setIsLoadingPart(false);
      setLoadError(false);
      return;
    }
    let cancelled = false;
    setActiveGrammarPart(null);
    setLoadError(false);
    setIsLoadingPart(true);
    const fail = () => {
      if (cancelled) return;
      setLoadError(true);
      setIsLoadingPart(false);
    };
    const timeout = window.setTimeout(() => { fail(); cancelled = true; }, 25_000);
    void loadInteractiveGrammarPart(activeGrammarPartId).then((part) => {
      if (!cancelled) {
        setActiveGrammarPart(part ?? null);
        setIsLoadingPart(false);
        setLoadError(!part);
      }
    }, fail).finally(() => window.clearTimeout(timeout));
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [activeGrammarPartId, attempt]);

  return {
    activeGrammarPartId,
    setActiveGrammarPartId,
    activeGrammarPageId,
    setActiveGrammarPageId,
    activeGrammarPart,
    loadError,
    retry: () => setAttempt((value) => value + 1),
    isLoadingGrammar: isLoadingPart || (Boolean(activeGrammarPartId) && !activeGrammarPart),
  };
}
