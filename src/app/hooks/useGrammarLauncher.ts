import { useState, useEffect, useCallback, useMemo } from 'react';
import type { InteractiveGrammarPart } from '../../types/models';
import { warmChineseFont } from '../../utils/browser/fontWarmup';
import { combineGrammarParts } from '../../utils/grammar/grammarLessonFlow';

/** One pack fetch for the whole run; missing ids are skipped. */
export async function loadInteractiveGrammarParts(partIds: string[]): Promise<InteractiveGrammarPart[]> {
  const firstId = partIds[0];
  if (!firstId) return [];

  warmChineseFont();
  const match = firstId.match(/^B(\d+)/i);
  const bookId = match ? Number(match[1]) : 1;
  const [{ fetchGrammarPack }] = await Promise.all([
    import('../../services/contentPacks'),
    import('../../screens/grammar-lesson/components/GrammarStudyPage'),
  ]);
  const parts = await fetchGrammarPack(bookId);
  const byId = new Map((parts ?? []).map((part) => [part.id, part]));

  return partIds.flatMap((id) => {
    const part = byId.get(id);
    return part ? [part] : [];
  });
}

export function useGrammarLauncher({ onOpen }: { onOpen?: () => void } = {}) {
  // The overlay URL sync in App owns ?grammarPart; local state starts empty.
  // Combined runs are stored as comma-separated ids so reload keeps the session.
  const [activeGrammarPartIds, setActiveGrammarPartIds] = useState<string[]>([]);
  const [activeGrammarPageId, setActiveGrammarPageId] = useState<string | null>(null);
  const [activeGrammarParts, setActiveGrammarParts] = useState<InteractiveGrammarPart[]>([]);
  const [isLoadingPart, setIsLoadingPart] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const openGrammarParts = useCallback((partIds: string[]) => {
    const ids = [...new Set(partIds.filter(Boolean))];
    if (ids.length > 0) onOpen?.();
    setActiveGrammarPartIds((current) => (
      current.length === ids.length && current.every((id, index) => id === ids[index])
        ? current
        : ids
    ));
  }, [onOpen]);

  const setActiveGrammarPartId = useCallback((partId: string | null) => {
    openGrammarParts(partId ? partId.split(',').filter(Boolean) : []);
  }, [openGrammarParts]);

  const activeGrammarPartId = activeGrammarPartIds.length > 0
    ? activeGrammarPartIds.join(',')
    : null;

  useEffect(() => {
    if (activeGrammarPartIds.length === 0) {
      setActiveGrammarParts([]);
      setActiveGrammarPageId(null);
      setIsLoadingPart(false);
      setLoadError(false);
      return;
    }
    let cancelled = false;
    setActiveGrammarParts([]);
    setLoadError(false);
    setIsLoadingPart(true);
    const fail = () => {
      if (cancelled) return;
      setLoadError(true);
      setIsLoadingPart(false);
    };
    const timeout = window.setTimeout(() => { fail(); cancelled = true; }, 25_000);
    void loadInteractiveGrammarParts(activeGrammarPartIds).then((parts) => {
      if (cancelled) return;
      setActiveGrammarParts(parts);
      setIsLoadingPart(false);
      setLoadError(parts.length === 0);
    }, fail).finally(() => window.clearTimeout(timeout));
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [activeGrammarPartIds, attempt]);

  const activeGrammarPart = useMemo(
    () => combineGrammarParts(activeGrammarParts),
    [activeGrammarParts],
  );

  return {
    activeGrammarPartId,
    setActiveGrammarPartId,
    openGrammarParts,
    activeGrammarPageId,
    setActiveGrammarPageId,
    activeGrammarPart,
    loadError,
    retry: () => setAttempt((value) => value + 1),
    isLoadingGrammar: isLoadingPart || (activeGrammarPartIds.length > 0 && !activeGrammarPart),
  };
}
