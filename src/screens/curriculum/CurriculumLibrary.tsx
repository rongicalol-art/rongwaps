import { memo, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SAMPLE_BOOKS } from '../../data/books';
import { getInteractiveGrammarManifestForLesson } from '../../data/interactiveGrammarManifest';
import {
  ActionButton,
  AlertBanner,
  AppIcon,
  StickyWorkspaceHeader,
  UserAvatar,
  type StickyWorkspaceHeaderMenuToggle,
} from '../../lib/widgets';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../hooks/useAuth';
import { reconcilePartSelectionsForBook } from '../../utils/lessonPartSelection';
import { BookCarousel } from './BookCarousel';
import { LessonItem } from './LessonItem';
import { StarterLesson } from './StarterLesson';
import { CurriculumSkeleton } from './components/CurriculumSkeleton';
import { useCourseDashboard } from './hooks/useCourseDashboard';
import { loadPracticeSession } from '../../utils/practiceLoader';

interface CurriculumLibraryProps {
  activeBookId?: number;
  onActiveBookChange?: (id: number) => void;
  selectedLessons?: number[];
  onToggleLesson?: (id: number, availablePartIds: number[]) => void;
  onStartPractice?: () => void;
  /** Opens the grammar window for a manifest part id. */
  onOpenGrammarPart?: (partId: string) => void;
  /** Mobile hamburger shown overlaid left in the sticky header (Books home). */
  menuToggle?: StickyWorkspaceHeaderMenuToggle;
  /** Opens the Profile tab (rendered as the avatar in the header's right side). */
  onProfileClick?: () => void;
}

function ProfileAvatarButton({ onClick }: { onClick: () => void }) {
  const { currentUser } = useAuth();
  const avatarValue = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture;
  const avatarUrl = typeof avatarValue === 'string' ? avatarValue : null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open profile"
      className="flex shrink-0 items-center justify-center rounded-full focus-ring"
    >
      <UserAvatar src={avatarUrl} size="md" />
    </button>
  );
}

export const CurriculumLibrary = memo(function CurriculumLibrary({
  activeBookId = 1,
  onActiveBookChange = () => {},
  selectedLessons = [],
  onToggleLesson = () => {},
  onStartPractice,
  onOpenGrammarPart,
  menuToggle,
  onProfileClick,
}: CurriculumLibraryProps) {
  const learnedCards = useAppStore((state) => state.learnedCards);
  const selectedLessonParts = useAppStore((state) => state.selectedLessonParts);
  const setSelectedLessonParts = useAppStore((state) => state.setSelectedLessonParts);
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

  // Workshop button target: the lesson's first grammar part (manifest order).
  const firstGrammarPartByLesson = useMemo(() => {
    const firstPartByLesson = new Map<number, string>();
    progress.lessons.forEach((lesson) => {
      const [firstPart] = getInteractiveGrammarManifestForLesson(activeBookId, lesson.id);
      if (firstPart) firstPartByLesson.set(lesson.id, firstPart.id);
    });
    return firstPartByLesson;
  }, [activeBookId, progress.lessons]);

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
        grammarPartId={firstGrammarPartByLesson.get(lesson.id)}
        onOpenGrammar={onOpenGrammarPart}
      />
  ));

  return (
    // No padding above the sticky header. Any gap above it makes the header
    // scroll briefly before it pins at top:0, which reads as unintentional.
    // The header sits flush against the scroll container top, like Library.
    <div className="relative w-full">
      <div className="flex w-full animate-in flex-col pb-36 duration-500 fade-in zoom-in-[0.98] sm:pb-28">
        <StickyWorkspaceHeader
          title={activeBook.title}
          menuToggle={menuToggle}
          rightContent={onProfileClick ? <ProfileAvatarButton onClick={onProfileClick} /> : undefined}
        />

        <BookCarousel
          activeBookId={activeBookId}
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
                <CurriculumSkeleton hasStarterLesson={activeBook.id === 1} />
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
                  <StarterLesson
                    starterLesson={starterLesson}
                    activeBook={activeBook}
                    isSelected={starterLesson.isSelected}
                    onToggleLesson={handleToggleLesson}
                  />
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
        </div>
      </div>

      <div className="workspace-window pointer-events-none fixed bottom-0 right-0 z-50 bg-gradient-to-t from-ui-canvas via-ui-canvas/95 to-transparent pb-sheet-safe pt-10">
        <div className="mx-auto w-full max-w-2xl px-4 md:px-6">
          <ActionButton
            size="lg"
            fullWidth
            disabled={isLoading || selectedLessonCount === 0 || !onStartPractice}
            onClick={onStartPractice}
            onMouseEnter={() => void loadPracticeSession({ activeBookId, selectedLessons, activity: 'flashcards' })}
            onTouchStart={() => void loadPracticeSession({ activeBookId, selectedLessons, activity: 'flashcards' })}
            onFocus={() => void loadPracticeSession({ activeBookId, selectedLessons, activity: 'flashcards' })}
            edgeColor={activeBook.edgeHex}
            aria-label={selectedLessonCount > 0
              ? `Start with ${selectedLessonCount} selected ${selectedLessonCount === 1 ? 'lesson' : 'lessons'}`
              : 'Select a lesson before starting'}
            className={`pointer-events-auto min-h-14 btn-touch-primary ${activeBook.accentBg}`}
          >
            <AppIcon name="play" size={20} />
            <span>Start</span>
          </ActionButton>
        </div>
      </div>
    </div>
  );
});