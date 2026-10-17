import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import type { InteractiveGrammarPart } from '../../../types/models';
import { continueGrammarLesson } from '../../../utils/grammar/grammarLessonFlow';

interface UseGrammarLessonPageOptions {
  part: InteractiveGrammarPart;
  initialPageId?: string;
  initialGrammarIndex?: number;
  /** False until the lazy study-page chunk has mounted at least once. */
  contentReady: boolean;
  onClose: () => void;
  onProceedToReading?: (part: InteractiveGrammarPart) => void;
}

/**
 * Page cursor for a grammar part: resume position (explicit page, explicit
 * index, `grammarIndex` URL param, or first incomplete page), page-change
 * sync, and the continue/back flows including part completion. A page with a
 * book exercise (`practice`) opens it on Continue; the page completes once the
 * exercise is done.
 */
export function useGrammarLessonPage({
  part,
  initialPageId,
  initialGrammarIndex,
  contentReady,
  onClose,
  onProceedToReading,
}: UseGrammarLessonPageOptions) {
  const completedPageIds = useAppStore((state) => state.completedPageIds);
  const markPageComplete = useAppStore((state) => state.markPageComplete);
  const markPartComplete = useAppStore((state) => state.markPartComplete);

  const firstIncompleteIndex = useMemo(
    () => part.grammarPages.findIndex((grammarPage) => !completedPageIds.includes(grammarPage.id)),
    [completedPageIds, part.grammarPages],
  );

  const [currentGrammarIndex, setCurrentGrammarIndex] = useState(() => {
    if (initialPageId) {
      const targetIndex = part.grammarPages.findIndex((p) => p.id === initialPageId);
      if (targetIndex >= 0) return targetIndex;
    }
    if (initialGrammarIndex !== undefined && initialGrammarIndex >= 0 && initialGrammarIndex < part.grammarPages.length) {
      return initialGrammarIndex;
    }
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('grammarIndex');
      if (param !== null) {
        const parsed = parseInt(param, 10);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed < part.grammarPages.length) {
          return parsed;
        }
      }
    }
    return firstIncompleteIndex === -1 ? 0 : firstIncompleteIndex;
  });

  const [isPracticing, setIsPracticing] = useState(false);

  useEffect(() => {
    if (initialPageId) {
      const targetIndex = part.grammarPages.findIndex((p) => p.id === initialPageId);
      if (targetIndex >= 0) {
        setCurrentGrammarIndex(targetIndex);
        setIsPracticing(false);
      }
    }
  }, [initialPageId, part.grammarPages]);

  const page = part.grammarPages[currentGrammarIndex];
  const previousPage = currentGrammarIndex > 0 ? part.grammarPages[currentGrammarIndex - 1] : null;
  const isLastPage = currentGrammarIndex === part.grammarPages.length - 1;

  /** Marks this page done and moves on (next page, or the part's reading). */
  const completePage = useCallback(() => {
    const next = continueGrammarLesson({
      grammarIndex: currentGrammarIndex,
      grammarCount: part.grammarPages.length,
      pageId: page.id,
      completedPageIds,
      allPageIds: part.grammarPages.map((grammarPage) => grammarPage.id),
    });
    markPageComplete(page.id);
    if (isLastPage || next.isPartComplete) {
      markPartComplete(part.id);
      onClose();
      onProceedToReading?.(part);
      return;
    }
    setIsPracticing(false);
    setCurrentGrammarIndex(next.grammarIndex);
  }, [completedPageIds, currentGrammarIndex, isLastPage, markPageComplete, markPartComplete, onClose, onProceedToReading, page, part]);

  const continueAfterStudy = useCallback(() => {
    if (!contentReady || isPracticing) return; // keyboard advance waits for content; the exercise drives itself
    if (page.practice) setIsPracticing(true);
    else completePage();
  }, [completePage, contentReady, isPracticing, page.practice]);

  /** Back from the exercise returns to its page; from a page, to the previous page. */
  const goBackToPreviousGrammar = useCallback(() => {
    if (isPracticing) {
      setIsPracticing(false);
      return;
    }
    if (!previousPage) return;
    setCurrentGrammarIndex((index) => Math.max(0, index - 1));
  }, [isPracticing, previousPage]);

  // Progress counts each page and each exercise as a step.
  const steps = useMemo(
    () => part.grammarPages.flatMap((grammarPage) => (grammarPage.practice ? [`${grammarPage.id}`, `${grammarPage.id}:practice`] : [grammarPage.id])),
    [part.grammarPages],
  );

  return {
    currentGrammarIndex,
    page,
    previousPage,
    isLastPage,
    continueAfterStudy,
    goBackToPreviousGrammar,
    isPracticing,
    finishPractice: completePage,
    canGoBack: isPracticing || Boolean(previousPage),
    totalSteps: steps.length,
    currentStepIndex: steps.indexOf(isPracticing ? `${page.id}:practice` : page.id),
  };
}
