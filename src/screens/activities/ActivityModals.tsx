import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AnimatePresence } from 'motion/react';
import { ActivityModalWrapper, ScreenSkeleton } from '../../lib/widgets';
import { PracticeHeader } from '../../features/practice';
import { useAppStore } from '../../store/useAppStore';
import { AddCardScreen } from '../add-card';
import type { ActivityType } from '../../types/models';
import { SAMPLE_BOOKS } from '../../data/books';
import { getInteractiveGrammarPartsForLesson } from '../../data/interactiveGrammarPages';
import { fetchVocabulary } from '../../services/vocabularyService';
import type { CourseLessonPartProgress } from '../../types/models';
import {
  getCurriculumSessionKey,
  getLessonSelectionKey,
  normalizePartSelection,
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

  useEffect(() => {
    if (activeActivity) {
      setPrevTask(activeActivity);
    }
  }, [activeActivity]);

  const currentIdx = activities.findIndex(a => a.id === resolvedActivity);
  const prevTaskResolved = prevTask === 'flashcards-library' ? 'flashcards' : prevTask;
  const prevIdx = activities.findIndex(a => a.id === prevTaskResolved);
  const direction = currentIdx >= prevIdx ? 1 : -1;

  const { practiceHeader, practiceHeaderActions } = useAppStore();
  const characterPreference = useAppStore(state => state.characterPreference);
  const setCharacterPreference = useAppStore(state => state.setCharacterPreference);
  const practicePreferences = usePracticePreferencesStore(useShallow(selectPracticePreferences));
  const updatePracticePreferences = usePracticePreferencesStore(state => state.updatePreferences);
  const isReviewMode = useAppStore(state => state.isReviewMode);
  const completedGrammarPageIds = useGrammarLessonStore((state) => state.completedPageIds);
  const selectedLessonParts = useAppStore(state => state.selectedLessonParts);
  const setSelectedLessonParts = useAppStore(state => state.setSelectedLessonParts);
  const [studyLessonParts, setStudyLessonParts] = useState<CourseLessonPartProgress[]>([]);
  const studyLessonId = !isLibraryMode && !isReviewMode && selectedLessons.length === 1
    ? selectedLessons[0]
    : null;
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

    const lessonGrammarParts = getInteractiveGrammarPartsForLesson(activeBookId, studyLessonId);
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
    setActiveActivity(null);
    if (isReviewMode) {
      useAppStore.getState().setIsReviewMode(false);
    }
    if (activeActivity === 'create-card') {
      useAppStore.getState().setActiveReviewSessionCards(null);
      return;
    }
    const currentLibraryFolder = useAppStore.getState().libraryActiveFolder;
    const sharedKey = (isReviewMode || activeActivity === 'flashcards-review') ? `shared_deck_review_${activeBookId}` :
      (isLibraryMode || activeActivity === 'flashcards-library') ? `shared_deck_library_${currentLibraryFolder}` :
      getCurriculumSessionKey(activeBookId, selectedLessons, selectedLessonParts);
    useAppStore.getState().clearSessionProgressIndex(sharedKey);
    useAppStore.getState().setActiveReviewSessionCards(null);
  };

  useEffect(() => {
    let isMounted = true;

    if (!studyLessonId || !activeActivity || activeActivity === 'create-card') {
      setStudyLessonParts([]);
      return;
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
      if (isMounted) setStudyLessonParts([]);
    });

    return () => {
      isMounted = false;
    };
  }, [activeActivity, activeBookId, studyLessonId]);

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
                    onClose={handleClose}
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
                      onClose={handleClose}
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
