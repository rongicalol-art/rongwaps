import { useCallback, useEffect, useMemo, useState } from 'react';
import { findGrammarManifestPartForReading } from '../../../data/interactiveGrammarManifest';
import { useAppStore } from '../../../store/useAppStore';
import type { InteractiveGrammarPart } from '../../../types/models';
import { completedGrammarPartNumbers, continueGrammarLesson } from '../../../utils/grammar/grammarLessonFlow';

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
  const markPartStarted = useAppStore((state) => state.markPartStarted);
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
  const [practiceInitialIndex, setPracticeInitialIndex] = useState(0);

  useEffect(() => {
    if (initialPageId) {
      const targetIndex = part.grammarPages.findIndex((p) => p.id === initialPageId);
      if (targetIndex >= 0) {
        setCurrentGrammarIndex(targetIndex);
        setPracticeInitialIndex(0);
        setIsPracticing(false);
      }
    }
  }, [initialPageId, part.grammarPages]);

  const page = part.grammarPages[currentGrammarIndex];
  const previousPage = currentGrammarIndex > 0 ? part.grammarPages[currentGrammarIndex - 1] : null;
  const isLastPage = currentGrammarIndex === part.grammarPages.length - 1;
  const currentPartId = findGrammarManifestPartForReading({
    bookId: page.bookId,
    lessonId: page.lessonId,
    dialogueNumber: page.partId,
  })?.id ?? null;

  useEffect(() => {
    if (currentPartId) markPartStarted(currentPartId);
  }, [currentPartId, markPartStarted]);

  /** Marks this page done, then advances or returns to the lesson on its final page. */
  const completePage = useCallback(() => {
    const next = continueGrammarLesson({
      grammarIndex: currentGrammarIndex,
      grammarCount: part.grammarPages.length,
      pageId: page.id,
      completedPageIds,
      allPageIds: part.grammarPages.map((grammarPage) => grammarPage.id),
    });
    markPageComplete(page.id);

    // A combined run still credits each source part as its own pages finish.
    const postCompletion = new Set(completedPageIds);
    postCompletion.add(page.id);
    for (const partNumber of completedGrammarPartNumbers(part.grammarPages, [...postCompletion])) {
      const sourcePage = part.grammarPages.find((grammarPage) => grammarPage.partId === partNumber);
      if (!sourcePage) continue;
      const sourcePart = findGrammarManifestPartForReading({
        bookId: sourcePage.bookId,
        lessonId: sourcePage.lessonId,
        dialogueNumber: partNumber,
      });
      if (sourcePart) markPartComplete(sourcePart.id);
    }

    if (isLastPage || next.isPartComplete) {
      if (onProceedToReading) onProceedToReading(part);
      else onClose();
      return;
    }
    setIsPracticing(false);
    setPracticeInitialIndex(0);
    setCurrentGrammarIndex(next.grammarIndex);
  }, [completedPageIds, currentGrammarIndex, isLastPage, markPageComplete, markPartComplete, onClose, onProceedToReading, page, part]);

  const continueAfterStudy = useCallback(() => {
    if (!contentReady || isPracticing) return; // keyboard advance waits for content; the exercise drives itself
    if (page.practice) {
      setPracticeInitialIndex(0);
      setIsPracticing(true);
    } else {
      completePage();
    }
  }, [completePage, contentReady, isPracticing, page.practice]);

  /** Back from the exercise returns to its page; from a page, to the previous page (or previous exercise). */
  const goBackToPreviousGrammar = useCallback(() => {
    if (isPracticing) {
      setIsPracticing(false);
      setPracticeInitialIndex(0);
      return;
    }
    if (!previousPage) return;
    if (previousPage.practice) {
      setCurrentGrammarIndex((index) => Math.max(0, index - 1));
      setPracticeInitialIndex(Math.max(0, previousPage.practice.items.length - 1));
      setIsPracticing(true);
      return;
    }
    setCurrentGrammarIndex((index) => Math.max(0, index - 1));
    setPracticeInitialIndex(0);
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
    practiceInitialIndex,
    finishPractice: completePage,
    canGoBack: isPracticing || Boolean(previousPage),
    totalSteps: steps.length,
    currentStepIndex: steps.indexOf(isPracticing ? `${page.id}:practice` : page.id),
  };
}
