import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActivityType, CourseLessonPartProgress } from '../../../types/models';
import { useAppStore } from '../../../store/useAppStore';
import { vocabularyCache } from '../../../utils/cache';
import { fetchVocabulary } from '../../../services/vocabularyService';
import { aggregateLessonPartProgress } from '../../../utils/lessonPartProgress';
import {
  getCurriculumSessionKey,
  getLessonSelectionKey,
  normalizePartSelection,
} from '../../../utils/lessonPartSelection';
import {
  getInteractiveGrammarManifestForLesson,
  type GrammarManifestPart,
} from '../../../data/interactiveGrammarManifest';
import type { Flashcard } from '../../../data/flashcards';

export interface UseActivityStudyPartsOptions {
  activeBookId: number;
  selectedLessons: number[];
  isLibraryMode?: boolean;
  isReviewMode?: boolean;
  activeActivity: ActivityType;
  onOpenGrammarPart?: (partId: string, pageId?: string) => void;
}

export interface VisibleStudyPart extends CourseLessonPartProgress {
  isSelected: boolean;
}

export interface UseActivityStudyPartsResult {
  studyLessonParts: CourseLessonPartProgress[];
  visibleStudyParts: VisibleStudyPart[];
  selectedStudyPartIds: number[];
  practiceGrammarPart: GrammarManifestPart | undefined;
  selectStudyPart: (partId: number) => void;
  toggleStudyPart: (partId: number) => void;
  onPartContinue: (() => void) | undefined;
  partContinueLabel: string;
}

export function useActivityStudyParts({
  activeBookId,
  selectedLessons,
  isLibraryMode = false,
  isReviewMode = false,
  activeActivity,
  onOpenGrammarPart,
}: UseActivityStudyPartsOptions): UseActivityStudyPartsResult {
  const completedGrammarPageIds = useAppStore((state) => state.completedPageIds);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  const setSelectedLessonParts = useAppStore((state) => state.setSelectedLessonParts);

  const studyLessonId =
    !isLibraryMode && !isReviewMode && selectedLessons.length === 1
      ? selectedLessons[0]
      : null;

  const getCachedParts = useCallback(
    (lessonId: number): CourseLessonPartProgress[] => {
      const cacheKey = `vocab-${activeBookId}-${lessonId}`;
      const allCacheKey = `vocab-${activeBookId}-all`;
      const cached =
        vocabularyCache.get<Flashcard[]>(cacheKey) ||
        vocabularyCache.get<Flashcard[]>(allCacheKey);
      const lessonCards = cached?.filter((c) => c.lessonId === lessonId) ?? [];
      return aggregateLessonPartProgress(lessonCards, useAppStore.getState().learnedCards);
    },
    [activeBookId],
  );

  const [studyLessonParts, setStudyLessonParts] = useState<CourseLessonPartProgress[]>(() => {
    if (!studyLessonId) return [];
    return getCachedParts(studyLessonId);
  });

  const studySelectionKey =
    studyLessonId === null ? null : getLessonSelectionKey(activeBookId, studyLessonId);

  const selectedStudyPartIds = useMemo(() => {
    if (!studySelectionKey) return [];
    const selection = selectedLessonParts[studySelectionKey];
    if (selection === 'all') return studyLessonParts.map((part) => part.id);
    return selection ?? [studyLessonParts[0]?.id ?? 1];
  }, [selectedLessonParts, studyLessonParts, studySelectionKey]);

  const visibleStudyParts = useMemo(
    () =>
      studyLessonParts.map((part) => ({
        ...part,
        isSelected: selectedStudyPartIds.includes(part.id),
      })),
    [selectedStudyPartIds, studyLessonParts],
  );

  const practiceGrammarPart = useMemo(() => {
    if (!studyLessonId || isLibraryMode || isReviewMode || !onOpenGrammarPart) return undefined;

    const lessonGrammarParts = getInteractiveGrammarManifestForLesson(activeBookId, studyLessonId);
    const enabledGrammarParts = lessonGrammarParts.filter((part) =>
      selectedStudyPartIds.includes(part.partId),
    );
    const candidateParts =
      enabledGrammarParts.length > 0 ? enabledGrammarParts : lessonGrammarParts;

    return (
      candidateParts.find((part) =>
        part.grammarPages.some((page) => !completedGrammarPageIds.includes(page.id)),
      ) ?? candidateParts[0]
    );
  }, [
    activeBookId,
    completedGrammarPageIds,
    isLibraryMode,
    isReviewMode,
    onOpenGrammarPart,
    selectedStudyPartIds,
    studyLessonId,
  ]);

  useEffect(() => {
    let isMounted = true;

    if (!studyLessonId || !activeActivity || activeActivity === 'create-card') {
      setStudyLessonParts([]);
      return;
    }

    const cachedParts = getCachedParts(studyLessonId);
    if (cachedParts.length > 0) {
      setStudyLessonParts(cachedParts);
    }

    fetchVocabulary(activeBookId, studyLessonId)
      .then((cards) => {
        if (!isMounted) return;
        setStudyLessonParts(aggregateLessonPartProgress(cards, useAppStore.getState().learnedCards));
      })
      .catch(() => {
        if (isMounted && cachedParts.length === 0) setStudyLessonParts([]);
      });

    return () => {
      isMounted = false;
    };
  }, [activeActivity, activeBookId, getCachedParts, studyLessonId]);

  const applyPartSelection = useCallback(
    (partIds: number[]) => {
      if (!studySelectionKey || visibleStudyParts.length === 0) return;

      const normalized = normalizePartSelection(
        partIds,
        visibleStudyParts.map((part) => part.id),
      );
      if (!normalized) return;

      setSelectedLessonParts((current) => ({
        ...current,
        [studySelectionKey]: normalized,
      }));
    },
    [setSelectedLessonParts, studySelectionKey, visibleStudyParts],
  );

  const toggleStudyPart = useCallback(
    (partId: number) => {
      if (!studyLessonId || !studySelectionKey || visibleStudyParts.length === 0) return;

      const availablePartIds = visibleStudyParts.map((part) => part.id);
      const currentSelection = selectedLessonParts[studySelectionKey];
      const currentPartIds =
        currentSelection === 'all'
          ? availablePartIds
          : currentSelection ?? [availablePartIds[0]];
      const toggledPartIds = currentPartIds.includes(partId)
        ? currentPartIds.filter((id) => id !== partId)
        : [...currentPartIds, partId];
      if (toggledPartIds.length === 0) return;

      applyPartSelection(toggledPartIds);
    },
    [applyPartSelection, selectedLessonParts, studyLessonId, studySelectionKey, visibleStudyParts],
  );

  const selectStudyPart = useCallback(
    (partId: number) => {
      if (!studyLessonId || !studySelectionKey || visibleStudyParts.length === 0) return;

      applyPartSelection([partId]);
    },
    [applyPartSelection, studyLessonId, studySelectionKey, visibleStudyParts],
  );

  const isMultiPart = !isLibraryMode && !isReviewMode && visibleStudyParts.length >= 2;

  const nextStudyPartId = useMemo(() => {
    if (!isMultiPart) return null;

    const availablePartIds = visibleStudyParts.map((part) => part.id);
    const currentlySelected = selectedStudyPartIds[0] ?? availablePartIds[0];
    const currentPos = availablePartIds.indexOf(currentlySelected);
    return availablePartIds[(currentPos + 1) % availablePartIds.length];
  }, [isMultiPart, selectedStudyPartIds, visibleStudyParts]);

  const handleNextPart = useCallback(() => {
    if (!studySelectionKey || nextStudyPartId === null) return;

    const oldSessionKey = getCurriculumSessionKey(
      activeBookId,
      selectedLessons,
      selectedLessonParts,
    );
    useAppStore.getState().clearSessionProgressIndex(oldSessionKey);

    applyPartSelection([nextStudyPartId]);
  }, [
    activeBookId,
    applyPartSelection,
    nextStudyPartId,
    selectedLessons,
    selectedLessonParts,
    studySelectionKey,
  ]);

  const onPartContinue = isMultiPart ? handleNextPart : undefined;

  const partContinueLabel =
    nextStudyPartId === null ? 'Continue' : `Continue (Part ${nextStudyPartId})`;

  return {
    studyLessonParts,
    visibleStudyParts,
    selectedStudyPartIds,
    practiceGrammarPart,
    selectStudyPart,
    toggleStudyPart,
    onPartContinue,
    partContinueLabel,
  };
}
