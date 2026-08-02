import { memo, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SAMPLE_BOOKS } from '../../data/books';
import { ActionButton, AppIcon } from '../../lib/widgets';
import { useAppStore } from '../../store/useAppStore';
import { reconcilePartSelectionsForBook } from '../../utils/lessonPartSelection';
import { BookCarousel } from './BookCarousel';
import { LessonItem } from './LessonItem';
import { StarterLesson } from './StarterLesson';
import { useCourseDashboard } from './hooks/useCourseDashboard';

interface CurriculumLibraryProps {
  activeBookId?: number;
  onActiveBookChange?: (id: number) => void;
  selectedLessons?: number[];
  onToggleLesson?: (id: number, availablePartIds: number[]) => void;
  onStartPractice?: () => void;
}

export const CurriculumLibrary = memo(function CurriculumLibrary({
  activeBookId = 1,
  onActiveBookChange = () => {},
  selectedLessons = [],
  onToggleLesson = () => {},
  onStartPractice,
}: CurriculumLibraryProps) {
  const { learnedCards, selectedLessonParts, setSelectedLessonParts } = useAppStore();
  const activeBook = useMemo(
    () => SAMPLE_BOOKS.find((book) => book.id === activeBookId) || SAMPLE_BOOKS[0],
    [activeBookId],
  );
  const { progress, isLoading, error } = useCourseDashboard({
    activeBookId,
    learnedCards,
    selectedLessons,
    selectedLessonParts,
  });

  useEffect(() => {
    if (isLoading || error) return;

    const availablePartsByLesson = Object.fromEntries(
      progress.lessons.map((lesson) => [lesson.id, lesson.parts.map((part) => part.id)]),
    );
    setSelectedLessonParts((current) => (
      reconcilePartSelectionsForBook(current, activeBookId, availablePartsByLesson)
    ));
  }, [activeBookId, error, isLoading, progress.lessons, setSelectedLessonParts]);

  const handleToggleLesson = useCallback((lessonId: number) => {
    const lesson = progress.lessons.find((item) => item.id === lessonId);
    const availablePartIds = lesson?.parts.map((part) => part.id) ?? [];
    onToggleLesson(lessonId, availablePartIds);
  }, [onToggleLesson, progress.lessons]);

  const starterLesson = progress.lessons.find((lesson) => lesson.id === 0);
  const regularLessons = progress.lessons.filter((lesson) => lesson.id !== 0);
  const midIndex = Math.ceil(regularLessons.length / 2);
  const lessonColumns = [
    regularLessons.slice(0, midIndex),
    regularLessons.slice(midIndex),
  ];
  const selectedLessonCount = progress.lessons.filter((lesson) => lesson.isSelected).length;

  const renderLessonList = (lessons: typeof regularLessons) => lessons.map((lesson, index) => (
      <LessonItem
        key={lesson.id}
        lesson={lesson}
        isSelected={lesson.isSelected}
        isPrevSelected={index > 0 && lessons[index - 1].isSelected}
        isNextSelected={index < lessons.length - 1 && lessons[index + 1].isSelected}
        onToggle={handleToggleLesson}
        accentColor={activeBook.accent}
        edgeHex={activeBook.edgeHex}
      />
  ));

  return (
    <div className="relative w-full">
      <div className="flex w-full animate-in flex-col pb-24 duration-500 fade-in zoom-in-[0.98]">
        <div className="sticky top-0 z-40 flex origin-top flex-col items-center bg-gradient-to-b from-ui-canvas via-ui-canvas/95 to-transparent pb-1 pt-[calc(0.5rem+env(safe-area-inset-top,0px))] backdrop-blur-[2px] md:pb-2 md:pt-2">
          <div className="relative z-20 flex h-14 w-full flex-col items-center justify-center px-16 text-center md:h-16 md:px-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeBook.id}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute flex flex-col items-center"
              >
                <h1 className="mb-0.5 text-xl font-extrabold tracking-tight text-ui-ink sm:text-2xl md:text-[26px]">
                  {activeBook.title}
                </h1>
                <p className={`text-[11px] font-black uppercase tracking-widest md:text-[12px] ${activeBook.accent}`}>
                  {activeBook.label}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <BookCarousel
          activeBookId={activeBookId}
          onActiveBookChange={onActiveBookChange}
        />

        <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-12 md:px-12">
          {error && (
            <p role="alert" className="mb-5 w-full rounded-[16px] border-b-4 border-feedback-danger-edge bg-feedback-danger-surface px-4 py-3 text-sm font-bold text-feedback-danger">
              {error}
            </p>
          )}

          {isLoading && progress.lessons.length === 0 ? (
            <div aria-label="Loading lessons" className="grid w-full grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-x-6">
              {Array.from({ length: 8 }, (_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-[24px] border-b-4 border-ui-border bg-ui-surface" />
              ))}
            </div>
          ) : (
            <>
              {starterLesson && (
                <StarterLesson
                  starterLesson={starterLesson}
                  activeBook={activeBook}
                  isSelected={starterLesson.isSelected}
                  onToggleLesson={handleToggleLesson}
                />
              )}

              <div className="flex w-full flex-col gap-4 lg:flex-row lg:gap-6">
                <div className="flex min-w-0 flex-1 flex-col">
                  {renderLessonList(lessonColumns[0])}
                </div>
                <div className="hidden min-w-0 flex-1 flex-col lg:flex">
                  {renderLessonList(lessonColumns[1])}
                </div>
              </div>

              <div className="mt-4 flex w-full flex-col lg:hidden">
                {renderLessonList(lessonColumns[1])}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="workspace-window pointer-events-none fixed bottom-0 right-0 z-50 bg-gradient-to-t from-ui-canvas via-ui-canvas/95 to-transparent pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-10">
        <div className="mx-auto w-full max-w-2xl px-4 md:px-6">
          <ActionButton
            size="lg"
            fullWidth
            disabled={isLoading || selectedLessonCount === 0 || !onStartPractice}
            onClick={onStartPractice}
            aria-label={selectedLessonCount > 0
              ? `Start with ${selectedLessonCount} selected ${selectedLessonCount === 1 ? 'lesson' : 'lessons'}`
              : 'Select a lesson before starting'}
            className={`pointer-events-auto min-h-14 ${activeBook.accentBg} ${activeBook.buttonEdge}`}
          >
            <AppIcon name="play" size={20} />
            <span>Start</span>
          </ActionButton>
        </div>
      </div>
    </div>
  );
});
