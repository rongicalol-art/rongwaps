import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SAMPLE_BOOKS } from '../../data/books';
import {
  AlertBanner,
  StickyWorkspaceHeader,
  type StickyWorkspaceHeaderMenuToggle,
} from '../../lib/widgets';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../hooks/useAuth';
import { getLessonSelectionKey, getSelectedLessonIds, reconcilePartSelectionsForBook } from '../../utils/lesson/lessonPartSelection';
import type { ActivityType } from '../../types/models';
import { AppFooter } from '../../app/components/AppFooter';
import { BookCarousel } from './BookCarousel';
import { LessonItem } from './LessonItem';
import { SelectionDock } from './components/SelectionDock';
import { useLessonSelection } from './hooks/useLessonSelection';
import { StarterLesson } from './StarterLesson';
import { CurriculumSkeleton } from './components/CurriculumSkeleton';
import { useCourseDashboard } from './hooks/useCourseDashboard';
import { LessonWindow, type LessonWindowTarget } from './lesson-window/LessonWindow';
import { GlobalPresenceButton, LessonFaces, lessonKey } from '../../features/social';
import { lessonThumbnail } from '../../data/lessonThumbnails';

interface CurriculumLibraryProps {
  activeBookId?: number;
  onActiveBookChange?: (id: number) => void;
  /** Scopes practice to one or more lesson parts and opens the activity. */
  onStartPartPractice?: (lessonId: number, partId: number | number[], activity: ActivityType) => void;
  /** Opens the last-used activity on the lessons selected in the store (independent study). */
  onStartPathPractice?: () => void;
  /** Opens the grammar window for a manifest part id. */
  onOpenGrammarPart?: (partId: string | string[], pageId?: string | null, onComplete?: () => void) => void;
  /** Opens the reader on a lesson part's dialogue. */
  onOpenReadingPart?: (target: { bookId: number; lessonId: number; partId: number | number[] }) => void;
  /** Mobile hamburger shown overlaid left in the sticky header (Books home). */
  menuToggle?: StickyWorkspaceHeaderMenuToggle;
}

export const CurriculumLibrary = memo(function CurriculumLibrary({
  activeBookId = 1,
  onActiveBookChange = () => {},
  onStartPartPractice,
  onStartPathPractice,
  onOpenGrammarPart,
  onOpenReadingPart,
  menuToggle,
}: CurriculumLibraryProps) {
  const hasActiveActivity = useAppStore((state) => Boolean(state.activeActivity));
  const { currentUser, hasFullCourseAccess } = useAuth();
  const activeLearnedCards = useAppStore((state) => (
    state.activeActivity ? null : state.learnedCards
  ));
  const stableLearnedCardsRef = useRef<string[]>(useAppStore.getState().learnedCards);
  if (activeLearnedCards !== null) {
    stableLearnedCardsRef.current = activeLearnedCards;
  }
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  const selectedLessons = useMemo(
    () => getSelectedLessonIds(selectedLessonParts, activeBookId),
    [activeBookId, selectedLessonParts],
  );
  const [lessonWindow, setLessonWindow] = useState<LessonWindowTarget | null>(null);
  const setIsLessonWindowOpen = useAppStore((state) => state.setIsLessonWindowOpen);
  const isLessonOpen = lessonWindow !== null;
  useEffect(() => {
    setIsLessonWindowOpen(isLessonOpen);
    return () => setIsLessonWindowOpen(false);
  }, [isLessonOpen, setIsLessonWindowOpen]);
  const setSelectedLessonParts = useAppStore((state) => state.setSelectedLessonParts);
  const activeBook = useMemo(
    () => SAMPLE_BOOKS.find((book) => book.id === activeBookId) || SAMPLE_BOOKS[0],
    [activeBookId],
  );
  const { progress, isLoading, error } = useCourseDashboard({
    activeBookId,
    userId: currentUser?.id ?? null,
    hasFullCourseAccess,
    learnedCards: stableLearnedCardsRef.current,
    selectedLessons,
    selectedLessonParts,
  });

  useEffect(() => {
    if (isLoading || error || hasActiveActivity) return;

    const availablePartsByLesson = Object.fromEntries(
      progress.lessons.map((lesson) => [lesson.id, lesson.state === 'locked' ? [] : lesson.parts.map((part) => part.id)]),
    );
    setSelectedLessonParts((current) => (
      reconcilePartSelectionsForBook(current, activeBookId, availablePartsByLesson)
    ));
  }, [activeBookId, error, hasActiveActivity, isLoading, progress.lessons, setSelectedLessonParts]);

  const setLastOpenedLesson = useAppStore((state) => state.setLastOpenedLesson);
  const handleOpenLesson = useCallback((lessonId: number) => {
    setLessonWindow({ lessonId, partIds: null });
    setLastOpenedLesson(activeBookId, lessonId);
  }, [activeBookId, setLastOpenedLesson]);
  const handleCloseLesson = useCallback(() => setLessonWindow(null), []);
  const currentLesson = useMemo(
    () => progress.lessons.find((lesson) => lesson.state === 'current'),
    [progress.lessons],
  );
  const defaultLessonId = currentLesson?.id ?? null;
  const selection = useLessonSelection(activeBookId, defaultLessonId);

  const handleLessonClick = useCallback((lessonId: number) => {
    if (selection.isMultiSelecting) {
      selection.toggle(lessonId);
    } else if (selection.selectedIds.includes(lessonId)) {
      handleOpenLesson(lessonId);
    } else {
      selection.enter(lessonId);
    }
  }, [handleOpenLesson, selection]);

  const handleStartSelection = useCallback(() => {
    const ids = selection.selectedIds;
    if (ids.length === 1) {
      handleOpenLesson(ids[0]);
      return;
    }
    // Several lessons: scope the book's selection to them (all parts) and open independent study.
    const partsByLesson = Object.fromEntries(
      progress.lessons.map((lesson) => [lesson.id, lesson.parts.map((part) => part.id)]),
    );
    setSelectedLessonParts((current) => {
      const bookPrefix = `${activeBookId}:`;
      const next = Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(bookPrefix)));
      ids.forEach((id) => { next[getLessonSelectionKey(activeBookId, id)] = partsByLesson[id] ?? [1]; });
      return next;
    });
    selection.exit();
    onStartPathPractice?.();
  }, [activeBookId, handleOpenLesson, onStartPathPractice, progress.lessons, selection, setSelectedLessonParts]);
  const handlePartChange = useCallback((partIds: number[]) => {
    setLessonWindow((current) => (current ? { ...current, partIds } : current));
  }, []);

  const starterLesson = progress.lessons.find((lesson) => lesson.id === 0);
  const regularLessons = progress.lessons.filter((lesson) => lesson.id !== 0);
  const midIndex = Math.ceil(regularLessons.length / 2);
  const lessonColumns = [
    regularLessons.slice(0, midIndex),
    regularLessons.slice(midIndex),
  ];

  // Scroll the current lesson into view once per book, when its card mounts.
  const scrolledBookRef = useRef<number | null>(null);
  const currentLessonRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || scrolledBookRef.current === activeBookId) return;
    scrolledBookRef.current = activeBookId;
    if (node.getBoundingClientRect().bottom > window.innerHeight) {
      node.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, [activeBookId]);
  const refIfCurrent = (lesson: { state: string }) => (lesson.state === 'current' ? currentLessonRef : undefined);

  const isPicked = (lesson?: { id: number }) => Boolean(lesson && selection.selectedIds.includes(lesson.id));
  const renderLessonList = (lessons: typeof regularLessons) => lessons.map((lesson, index) => (
    <div key={lesson.id} ref={refIfCurrent(lesson)}>
      <LessonItem
        lesson={lesson}
        onOpen={handleLessonClick}
        onLongPress={selection.toggle}
        onToggle={selection.toggle}
        isSelecting={selection.isMultiSelecting}
        isSelected={isPicked(lesson)}
        isPrevSelected={isPicked(lessons[index - 1])}
        isNextSelected={isPicked(lessons[index + 1])}
        faces={<LessonFaces lesson={lessonKey(activeBookId, lesson.id)} />}
        art={lessonThumbnail(activeBookId, lesson.id)}
        isPhoto={Boolean(lessonThumbnail(activeBookId, lesson.id))}
      />
    </div>
  ));

  return (
    // No padding above the sticky header. Any gap above it makes the header
    // scroll briefly before it pins at top:0, which reads as unintentional.
    // The header sits flush against the scroll container top, like Library.
    <div className="relative w-full">
      <div className="flex w-full flex-col pb-12">
        <StickyWorkspaceHeader
          title={activeBook.title}
          menuToggle={menuToggle}
          rightContent={<GlobalPresenceButton />}
        />

        <BookCarousel
          activeBookId={activeBookId}
          hasFullCourseAccess={hasFullCourseAccess}
          onActiveBookChange={onActiveBookChange}
        />

        <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-12 md:px-12">
          {error && (
            <AlertBanner variant="danger" message={error} className="mb-5" />
          )}

          <AnimatePresence mode="wait">
            {isLoading && progress.lessons.length === 0 ? (
              <motion.div
                key="curriculum-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="w-full"
              >
                <CurriculumSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key={`lessons-${activeBookId}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="flex w-full flex-col items-center"
              >
                {starterLesson && (
                  <div className="w-full max-w-[400px]" ref={refIfCurrent(starterLesson)}>
                    <StarterLesson
                      starterLesson={starterLesson}
                      faces={<LessonFaces lesson={lessonKey(activeBookId, starterLesson.id)} />}
                      activeBook={activeBook}
                      onOpen={handleLessonClick}
                      onLongPress={selection.toggle}
                      onToggle={selection.toggle}
                      isSelecting={selection.isMultiSelecting}
                      isSelected={isPicked(starterLesson)}
                    />
                  </div>
                )}

                <div className="flex w-full flex-col gap-4 lg:flex-row lg:gap-6">
                  <div className="flex min-w-0 flex-col lg:flex-[1.05]">
                    {renderLessonList(lessonColumns[0])}
                  </div>
                  <div className="flex min-w-0 flex-col lg:mt-8 lg:flex-[0.95]">
                    {renderLessonList(lessonColumns[1])}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AppFooter className="mt-12" />
        </div>
      </div>

      <SelectionDock
        count={selection.selectedIds.length}
        accentBgClassName={activeBook.accentBg}
        edgeHex={activeBook.edgeHex}
        disabled={isLoading}
        onStart={handleStartSelection}
        onCancel={selection.exit}
      />

      <LessonWindow
        bookId={activeBookId}
        lesson={progress.lessons.find((lesson) => lesson.id === lessonWindow?.lessonId) ?? null}
        partIds={lessonWindow?.partIds ?? null}
        isHidden={hasActiveActivity}
        onPartChange={handlePartChange}
        onClose={handleCloseLesson}
        onStartPractice={(lessonId, partId, activity) => {
          const partIds = Array.isArray(partId) ? partId : [partId];
          setLessonWindow((current) => (current ? { ...current, lessonId, partIds } : { lessonId, partIds }));
          onStartPartPractice?.(lessonId, partId, activity);
        }}
        onOpenGrammarPart={(partId, onComplete) => onOpenGrammarPart?.(partId, null, onComplete)}
        onOpenReadingPart={(target) => onOpenReadingPart?.(target)}
      />
    </div>
  );
});
