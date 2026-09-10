import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AnimatePresence } from 'motion/react';
import { ActivityModalWrapper, ScreenSkeleton } from '../../lib/widgets';
import { PracticeHeader } from '../../features/practice';
import { useAppStore } from '../../store/useAppStore';
import { AddCardScreen } from '../add-card';
import type { ActivityType } from '../../types/models';
import { SAMPLE_BOOKS } from '../../data/books';
import { getInteractiveGrammarManifestForLesson } from '../../data/interactiveGrammarManifest';
import { fetchVocabulary } from '../../services/vocabularyService';
import { vocabularyCache } from '../../utils/cache';
import type { Flashcard } from '../../data/flashcards';
import type { CourseLessonPartProgress } from '../../types/models';
import {
  getCurriculumSessionKey,
  getLessonSelectionKey,
  normalizePartSelection,
  SHARED_REVIEW_SESSION_KEY,
} from '../../utils/lessonPartSelection';
import {
  selectPracticePreferences,
  usePracticePreferencesStore,
} from '../../store/usePracticePreferencesStore';
import { PracticeModeDock, PRACTICE_ACTIVITIES } from './components/PracticeModeDock';
import { AnimatedActivityScreen } from './components/AnimatedActivityScreen';
import { useGrammarLessonStore } from '../../store/useGrammarLessonStore';
import type { FlashcardViewMode } from '../flashcard';

const FlashcardScreen = lazy(() => (
  import('../flashcard').then((module) => ({ default: module.FlashcardScreen }))
));
const ListeningScreen = lazy(() => (
  import('../listening').then((module) => ({ default: module.ListeningScreen }))
));
const QuizScreen = lazy(() => (
  import('../quiz').then((module) => ({ default: module.QuizScreen }))
));
const WritingScreen = lazy(() => (
  import('../writing').then((module) => ({ default: module.WritingScreen }))
));

interface ActivityModalsProps {
  activeActivity: ActivityType;
  setActiveActivity: (activity: ActivityType) => void;
  activeBookId: number;
  selectedLessons: number[];
  isLibraryMode?: boolean;
  onNavigateToPractice?: () => void;
  onOpenGrammarPart?: (partId: string) => void;
  onOpenReading?: () => void;
}

export function ActivityModals({
  activeActivity,
  setActiveActivity,
  activeBookId,
  selectedLessons,
  isLibraryMode = false,
  onNavigateToPractice,
  onOpenGrammarPart,
  onOpenReading,
}: ActivityModalsProps) {
  const activities = PRACTICE_ACTIVITIES;

  const validModes = activities.map(a => a.id);
  const isOverlayOpen = useAppStore(state => state.isOverlayOpen);
  const isInteractionActive = useAppStore(state => state.isInteractionActive);
  const swipeFeedback = useAppStore(state => state.swipeFeedback);

  const resolvedActivity = activeActivity === 'flashcards-library' ? 'flashcards' : activeActivity === 'flashcards-review' ? 'flashcards' : activeActivity;
  const showDock = Boolean(
    resolvedActivity &&
    validModes.some((mode) => mode === resolvedActivity) &&
    resolvedActivity !== 'writing' &&
    !isOverlayOpen &&
    !isInteractionActive,
  );

  const activeBook = SAMPLE_BOOKS.find(b => b.id === activeBookId) || SAMPLE_BOOKS[0];

  const [prevTask, setPrevTask] = useState<ActivityType>(null);
  const activeQuizMode = useAppStore(state => state.activeQuizMode);
  const setActiveQuizMode = useAppStore(state => state.setActiveQuizMode);

  // Cards vs List view for the flashcards deck. Resets to Cards on close so
  // the next session opens in the default study view.
  const [flashcardMode, setFlashcardMode] = useState<FlashcardViewMode>('cards');
  useEffect(() => {
    if (!activeActivity) setFlashcardMode('cards');
  }, [activeActivity]);

  const previousActivityRef = useRef<ActivityType>(null);
  useEffect(() => {
    if (activeActivity) {
      setPrevTask(activeActivity);
      if (activeActivity !== 'writing') {
        previousActivityRef.current = activeActivity;
      }
    }
  }, [activeActivity]);

  const currentIdx = activities.findIndex(a => a.id === resolvedActivity);
  const prevTaskResolved = prevTask === 'flashcards-library' ? 'flashcards' : prevTask;
  const prevIdx = activities.findIndex(a => a.id === prevTaskResolved);
  const direction = currentIdx >= prevIdx ? 1 : -1;

  const practiceHeader = useAppStore((state) => state.practiceHeader);
  const practiceHeaderActions = useAppStore((state) => state.practiceHeaderActions);
  const characterPreference = useAppStore(state => state.characterPreference);
  const setCharacterPreference = useAppStore(state => state.setCharacterPreference);
  const practicePreferences = usePracticePreferencesStore(useShallow(selectPracticePreferences));
  const updatePracticePreferences = usePracticePreferencesStore(state => state.updatePreferences);
  const isReviewMode = useAppStore(state => state.isReviewMode);
  const completedGrammarPageIds = useGrammarLessonStore((state) => state.completedPageIds);
  const selectedLessonParts = useAppStore(state => state.selectedLessonParts);
  const setSelectedLessonParts = useAppStore(state => state.setSelectedLessonParts);
  const studyLessonId = !isLibraryMode && !isReviewMode && selectedLessons.length === 1
    ? selectedLessons[0]
    : null;

  const getCachedParts = useCallback((lessonId: number): CourseLessonPartProgress[] => {
    const cacheKey = `vocab-${activeBookId}-${lessonId}`;
    const allCacheKey = `vocab-${activeBookId}-all`;
    const cached = vocabularyCache.get<Flashcard[]>(cacheKey) || vocabularyCache.get<Flashcard[]>(allCacheKey);
    const lessonCards = cached?.filter((c) => c.lessonId === lessonId);
    if (!lessonCards || lessonCards.length === 0) return [];
    const learnedCards = useAppStore.getState().learnedCards;
    return Array.from(
      lessonCards.reduce((map, card) => {
        const partId = card.partId ?? 1;
        const current = map.get(partId) ?? { id: partId, wordCount: 0, learnedCount: 0, isSelected: false };
        current.wordCount += 1;
        if (learnedCards.includes(card.id)) current.learnedCount += 1;
        map.set(partId, current);
        return map;
      }, new Map<number, CourseLessonPartProgress>()).values(),
    ).sort((a, b) => a.id - b.id);
  }, [activeBookId]);

  const [studyLessonParts, setStudyLessonParts] = useState<CourseLessonPartProgress[]>(() => {
    if (!studyLessonId) return [];
    return getCachedParts(studyLessonId);
  });
  const studySelectionKey = studyLessonId === null
    ? null
    : getLessonSelectionKey(activeBookId, studyLessonId);
  const selectedStudyPartIds = useMemo(() => {
    if (!studySelectionKey) return [];
    const selection = selectedLessonParts[studySelectionKey];
    if (selection === 'all') return studyLessonParts.map((part) => part.id);
    return selection ?? [studyLessonParts[0]?.id ?? 1];
  }, [selectedLessonParts, studyLessonParts, studySelectionKey]);
  const visibleStudyParts = useMemo(() => (
    studyLessonParts.map((part) => ({
      ...part,
      isSelected: selectedStudyPartIds.includes(part.id),
    }))
  ), [selectedStudyPartIds, studyLessonParts]);
  const practiceGrammarPart = useMemo(() => {
    if (!studyLessonId || isLibraryMode || isReviewMode || !onOpenGrammarPart) return undefined;

    const lessonGrammarParts = getInteractiveGrammarManifestForLesson(activeBookId, studyLessonId);
    const enabledGrammarParts = lessonGrammarParts.filter((part) => (
      selectedStudyPartIds.includes(part.partId)
    ));
    const candidateParts = enabledGrammarParts.length > 0 ? enabledGrammarParts : lessonGrammarParts;

    return candidateParts.find((part) => (
      part.grammarPages.some((page) => !completedGrammarPageIds.includes(page.id))
    )) ?? candidateParts[0];
  }, [
    activeBookId,
    completedGrammarPageIds,
    isLibraryMode,
    isReviewMode,
    onOpenGrammarPart,
    selectedStudyPartIds,
    studyLessonId,
  ]);
  const activityLabel = activeActivity === 'create-card'
    ? 'Create a card'
    : `${activities.find((activity) => activity.id === resolvedActivity)?.label ?? 'Study'} practice`;

  const handleClose = () => {
    previousActivityRef.current = null;
    setActiveActivity(null);
    if (isReviewMode) {
      useAppStore.getState().setIsReviewMode(false);
    }
    if (activeActivity === 'create-card') {
      useAppStore.getState().setActiveReviewSessionCards(null);
      return;
    }
    const currentLibraryFolder = useAppStore.getState().libraryActiveFolder;
    const sharedKey = (isReviewMode || activeActivity === 'flashcards-review') ? SHARED_REVIEW_SESSION_KEY :
      (isLibraryMode || activeActivity === 'flashcards-library') ? `shared_deck_library_${currentLibraryFolder}` :
      getCurriculumSessionKey(activeBookId, selectedLessons, selectedLessonParts);
    useAppStore.getState().clearSessionProgressIndex(sharedKey);
    useAppStore.getState().setActiveReviewSessionCards(null);
  };

  const handleWritingClose = useCallback(() => {
    const defaultStudyCards: ActivityType = isLibraryMode
      ? 'flashcards-library'
      : isReviewMode
      ? 'flashcards-review'
      : 'flashcards';
    const targetActivity = previousActivityRef.current || defaultStudyCards;
    setActiveActivity(targetActivity);
  }, [isLibraryMode, isReviewMode, setActiveActivity]);

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

    fetchVocabulary(activeBookId, studyLessonId).then((cards) => {
      if (!isMounted) return;
      const learnedCards = useAppStore.getState().learnedCards;
      const parts = Array.from(
        cards.reduce((map, card) => {
          const partId = card.partId ?? 1;
          const current = map.get(partId) ?? { id: partId, wordCount: 0, learnedCount: 0, isSelected: false };
          current.wordCount += 1;
          if (learnedCards.includes(card.id)) current.learnedCount += 1;
          map.set(partId, current);
          return map;
        }, new Map<number, CourseLessonPartProgress>()).values(),
      ).sort((a, b) => a.id - b.id);
      setStudyLessonParts(parts);
    }).catch(() => {
      if (isMounted && cachedParts.length === 0) setStudyLessonParts([]);
    });

    return () => {
      isMounted = false;
    };
  }, [activeActivity, activeBookId, getCachedParts, studyLessonId]);

  const toggleStudyPart = useCallback((partId: number) => {
    if (!studyLessonId || !studySelectionKey || visibleStudyParts.length === 0) return;

    const availablePartIds = visibleStudyParts.map((part) => part.id);
    const currentSelection = selectedLessonParts[studySelectionKey];
    const currentPartIds = currentSelection === 'all'
      ? availablePartIds
      : currentSelection ?? [availablePartIds[0]];
    const toggledPartIds = currentPartIds.includes(partId)
      ? currentPartIds.filter((id) => id !== partId)
      : [...currentPartIds, partId];
    if (toggledPartIds.length === 0) return;

    const normalized = normalizePartSelection(toggledPartIds, availablePartIds);
    if (!normalized) return;

    setSelectedLessonParts((current) => ({
      ...current,
      [studySelectionKey]: normalized,
    }));
  }, [
    selectedLessonParts,
    setSelectedLessonParts,
    studyLessonId,
    studySelectionKey,
    visibleStudyParts,
  ]);

  const selectStudyPart = useCallback((partId: number) => {
    if (!studyLessonId || !studySelectionKey || visibleStudyParts.length === 0) return;

    const availablePartIds = visibleStudyParts.map((part) => part.id);
    const normalized = normalizePartSelection([partId], availablePartIds);
    if (!normalized) return;

    setSelectedLessonParts((current) => ({
      ...current,
      [studySelectionKey]: normalized,
    }));
  }, [
    setSelectedLessonParts,
    studyLessonId,
    studySelectionKey,
    visibleStudyParts,
  ]);

  /**
   * On completion, advances to the next vocabulary part for this lesson and
   * resets the session so the new part starts at card 0. Wraps to Part 1 when
   * the last part is finished, giving a natural "loop back" behaviour.
   */
  const handleNextPart = useCallback(() => {
    if (!studySelectionKey || visibleStudyParts.length < 2) return;

    const availablePartIds = visibleStudyParts.map((p) => p.id);
    const currentlySelected = selectedStudyPartIds[0] ?? availablePartIds[0];
    const currentPos = availablePartIds.indexOf(currentlySelected);
    const nextPartId = availablePartIds[(currentPos + 1) % availablePartIds.length];

    // Clear old session progress so the new part starts at card 0.
    const oldSessionKey = getCurriculumSessionKey(activeBookId, selectedLessons, selectedLessonParts);
    useAppStore.getState().clearSessionProgressIndex(oldSessionKey);

    const normalized = normalizePartSelection([nextPartId], availablePartIds);
    if (!normalized) return;

    setSelectedLessonParts((current) => ({
      ...current,
      [studySelectionKey]: normalized,
    }));
  }, [
    activeBookId,
    selectedLessons,
    selectedLessonParts,
    selectedStudyPartIds,
    setSelectedLessonParts,
    studySelectionKey,
    visibleStudyParts,
  ]);

  // Provide a next-part action only in single-lesson, multi-part, non-review/library sessions.
  const isMultiPart = !isLibraryMode && !isReviewMode && visibleStudyParts.length >= 2;
  const onPartContinue = isMultiPart ? handleNextPart : undefined;

  // Compute the label for the continue button (e.g. "Part 2" when wrapping from Part 1).
  const partContinueLabel = useMemo(() => {
    if (!isMultiPart) return 'Continue';
    const availablePartIds = visibleStudyParts.map((p) => p.id);
    const currentlySelected = selectedStudyPartIds[0] ?? availablePartIds[0];
    const currentPos = availablePartIds.indexOf(currentlySelected);
    const nextPartId = availablePartIds[(currentPos + 1) % availablePartIds.length];
    return `Part ${nextPartId}`;
  }, [isMultiPart, visibleStudyParts, selectedStudyPartIds]);

  return (
    <>
      <AnimatePresence>
        {activeActivity && (
          <ActivityModalWrapper id="global-activity-modal" ariaLabel={activityLabel} onClose={handleClose}>
            {activeActivity !== 'create-card' && (
               <div className={`absolute top-0 left-0 right-0 z-[150] ${isOverlayOpen ? 'invisible' : ''}`}>
                 <PracticeHeader
                    key={resolvedActivity}
                    maxWidth="none"
                    onClose={activeActivity === 'writing' ? handleWritingClose : handleClose}
                    progress={practiceHeader.progress}
                    currentIndex={practiceHeader.currentIndex}
                    totalCount={practiceHeader.totalCount}
                    partSegments={practiceHeader.partSegments}
                    studyParts={visibleStudyParts}
                    onSelectStudyPart={selectStudyPart}
                    onToggleStudyPart={toggleStudyPart}
                    accentBgClassName={activeBook.accentBg}
                    onSettingsClick={practiceHeaderActions.onSettingsClick}
                    onShuffleClick={practiceHeaderActions.onShuffleClick}
                    onFlowClick={practiceHeaderActions.onFlowClick}
                    onRestartClick={practiceHeaderActions.onRestartClick}
                    isShuffled={practiceHeaderActions.isShuffled}
                    flowStatus={practiceHeaderActions.flowStatus}
                    showFlow={resolvedActivity === 'flashcards' && flashcardMode === 'cards'}
                    settings={{
                      preferences: practicePreferences,
                      onPreferencesChange: updatePracticePreferences,
                      characterPreference,
                      onCharacterPreferenceChange: setCharacterPreference,
                    }}
                 />
               </div>
            )}

            <AnimatePresence custom={direction} mode="popLayout">
              {(activeActivity === 'flashcards' || activeActivity === 'flashcards-library' || activeActivity === 'flashcards-review') && (
                <AnimatedActivityScreen activityKey="flashcards" direction={direction}>
                  <Suspense fallback={<ScreenSkeleton type="flashcard" />}>
                    <FlashcardScreen
                      activeBookId={activeBookId}
                      selectedLessons={selectedLessons}
                      isReviewDeck={isReviewMode || activeActivity === 'flashcards-review'}
                      isLibraryDeck={activeActivity === 'flashcards-library' || isLibraryMode}
                      mode={flashcardMode}
                      onClose={handleClose}
                      onContinue={onPartContinue}
                      continueLabel={partContinueLabel}
                      onNavigateToPractice={onNavigateToPractice}
                    />
                  </Suspense>
                </AnimatedActivityScreen>
              )}

              {activeActivity === 'listening' && (
                <AnimatedActivityScreen activityKey="listening" direction={direction}>
                  <Suspense fallback={<ScreenSkeleton type="listening" />}>
                    <ListeningScreen
                      activeBookId={activeBookId}
                      selectedLessons={selectedLessons}
                      isReviewDeck={isReviewMode}
                      isLibraryDeck={isLibraryMode}
                      onClose={handleClose}
                      onContinue={onPartContinue}
                      continueLabel={partContinueLabel}
                    />
                  </Suspense>
                </AnimatedActivityScreen>
              )}

              {activeActivity === 'quiz' && (
                <AnimatedActivityScreen activityKey="quiz" direction={direction}>
                  <Suspense fallback={<ScreenSkeleton type="quiz" />}>
                    <QuizScreen
                      activeBookId={activeBookId}
                      selectedLessons={selectedLessons}
                      isReviewDeck={isReviewMode}
                      isLibraryDeck={isLibraryMode}
                      mode={activeQuizMode ?? 'choices'}
                      onClose={handleClose}
                      onContinue={onPartContinue}
                      continueLabel={partContinueLabel}
                    />
                  </Suspense>
                </AnimatedActivityScreen>
              )}

              {activeActivity === 'writing' && (
                <AnimatedActivityScreen activityKey="writing" direction={direction}>
                  <Suspense fallback={<ScreenSkeleton type="writing" />}>
                    <WritingScreen
                      activeBookId={activeBookId}
                      selectedLessons={selectedLessons}
                      isReviewDeck={isReviewMode}
                      isLibraryDeck={isLibraryMode}
                      onClose={handleWritingClose}
                      onContinue={onPartContinue}
                      continueLabel={partContinueLabel}
                    />
                  </Suspense>
                </AnimatedActivityScreen>
              )}

              {activeActivity === 'create-card' && (
                <AnimatedActivityScreen activityKey="create-card" direction={direction} useSlide={false}>
                  <AddCardScreen onClose={() => setActiveActivity(null)} />
                </AnimatedActivityScreen>
              )}
            </AnimatePresence>
          </ActivityModalWrapper>
        )}
      </AnimatePresence>

      {/* Floating Pill Dock for Modes */}
      <AnimatePresence>
        {showDock && (
          <PracticeModeDock
            feedback={swipeFeedback}
            value={resolvedActivity as (typeof PRACTICE_ACTIVITIES)[number]['id']}
            quizMode={activeQuizMode}
            flashcardMode={flashcardMode}
            onSelectFlashcardMode={(mode) => {
              if (isLibraryMode) {
                setActiveActivity('flashcards-library');
              } else if (isReviewMode) {
                setActiveActivity('flashcards-review');
              } else {
                setActiveActivity('flashcards');
              }
              setFlashcardMode(mode);
            }}
            onOpenGrammar={practiceGrammarPart && onOpenGrammarPart
              ? () => onOpenGrammarPart(practiceGrammarPart.id)
              : undefined}
            onOpenReading={onOpenReading}
            onSelectQuizMode={(mode) => {
              setActiveQuizMode(mode);
              setActiveActivity('quiz');
            }}
            onChange={(nextActivity) => {
              if (isLibraryMode && nextActivity === 'flashcards') {
                setActiveActivity('flashcards-library');
              } else if (isReviewMode && nextActivity === 'flashcards') {
                setActiveActivity('flashcards-review');
              } else {
                setActiveActivity(nextActivity);
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
