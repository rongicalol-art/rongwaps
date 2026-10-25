import { useEffect, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { retainStudyPacks } from '../../../services/contentPacks';
import { preparePracticeData } from '../practiceLoader';
import { FLASHCARD_EXTRAS_CACHE_LIMIT } from '../../../utils/vocabulary/flashcardExtrasPack';

/** Preparation shares the exact caches read by cards, word popovers and dictionary search. */
export function usePracticeDataReady(cards: Flashcard[], enabled: boolean) {
  const [prepared, setPrepared] = useState<Flashcard[] | null>(null);
  const [failure, setFailure] = useState<{ cards: Flashcard[]; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled || !cards.length) { setPrepared(null); return; }
    const controller = new AbortController();
    const workingSet = cards.slice(0, FLASHCARD_EXTRAS_CACHE_LIMIT);
    const releaseWords = retainStudyPacks(workingSet);
    setFailure(null);
    const deadline = window.setTimeout(() => {
      controller.abort();
      setFailure({ cards, message: 'Preparation took too long. Check your connection and try again.' });
    }, 30_000);
    void preparePracticeData(cards, controller.signal).then(() => {
      if (!controller.signal.aborted) setPrepared(cards);
    }).catch(() => {
      if (!controller.signal.aborted) setFailure({ cards, message: 'Study data could not load. Check your connection and try again.' });
    }).finally(() => window.clearTimeout(deadline));
    return () => {
      window.clearTimeout(deadline);
      controller.abort();
      releaseWords();
    };
  }, [cards, enabled, attempt]);
  return {
    ready: !enabled || !cards.length || prepared === cards,
    error: failure?.cards === cards ? failure.message : null,
    retry: () => { setFailure(null); setPrepared(null); setAttempt((value) => value + 1); },
  };
}
