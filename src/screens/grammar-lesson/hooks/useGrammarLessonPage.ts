import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGrammarLessonStore } from '../../../store/useGrammarLessonStore';
import type { InteractiveGrammarPart } from '../../../types/models';
import { continueGrammarLesson } from '../../../utils/grammarLessonFlow';

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
 * sync, and the continue/back flows including part completion.
 */
export function useGrammarLessonPage({
  part,
  initialPageId,
  initialGrammarIndex,
  contentReady,
  onClose,
  onProceedToReading,
}: UseGrammarLessonPageOptions) {
  const completedPageIds = useGrammarLessonStore((state) => state.completedPageIds);
  const markPageComplete = useGrammarLessonStore((state) => state.markPageComplete);
  const markPartComplete = useGrammarLessonStore((state) => state.markPartComplete);

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

  useEffect(() => {
    if (initialPageId) {
      const targetIndex = part.grammarPages.findIndex((p) => p.id === initialPageId);
      if (targetIndex >= 0) {
        setCurrentGrammarIndex(targetIndex);
      }
    }
  }, [initialPageId, part.grammarPages]);

  const page = part.grammarPages[currentGrammarIndex];
  const previousPage = currentGrammarIndex > 0 ? part.grammarPages[currentGrammarIndex - 1] : null;
  const isLastPage = currentGrammarIndex === part.grammarPages.length - 1;

  const continueAfterStudy = useCallback(() => {
    if (!contentReady) return; // ignore keyboard advance until page content mounted
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
    setCurrentGrammarIndex(next.grammarIndex);
  }, [completedPageIds, contentReady, currentGrammarIndex, isLastPage, markPageComplete, markPartComplete, onClose, onProceedToReading, page, part]);

  const goBackToPreviousGrammar = useCallback(() => {
    if (!previousPage) return;
    setCurrentGrammarIndex((index) => Math.max(0, index - 1));
  }, [previousPage]);

  return {
    currentGrammarIndex,
    page,
    previousPage,
    isLastPage,
    continueAfterStudy,
    goBackToPreviousGrammar,
    totalSteps: part.grammarPages.length,
    currentStepIndex: currentGrammarIndex,
  };
}
