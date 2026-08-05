import { memo, useCallback, useEffect, useMemo } from 'react';
import { SAMPLE_BOOKS } from '../../data/books';
import { ActionButton, AppIcon, StickyWorkspaceHeader, type StickyWorkspaceHeaderMenuToggle } from '../../lib/widgets';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../hooks/useAuth';
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
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ui-surface text-ui-muted-strong transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/25"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      ) : (
        <AppIcon name="profile" size={22} />
      )}
    </button>
  );
}

export const CurriculumLibrary = memo(function CurriculumLibrary({
  activeBookId = 1,
  onActiveBookChange = () => {},
  selectedLessons = [],
  onToggleLesson = () => {},
  onStartPractice,
  menuToggle,
  onProfileClick,
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
    // No padding above the sticky header. Any gap above it makes the header
    // scroll briefly before it pins at top:0, which reads as unintentional.
    // The header sits flush against the scroll container top, like Library.
    <div className="relative w-full">
      <div className="flex w-full animate-in flex-col pb-24 duration-500 fade-in zoom-in-[0.98]">
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