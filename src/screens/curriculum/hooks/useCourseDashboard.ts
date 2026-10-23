import { useEffect, useMemo, useState } from 'react';
import { LOCKED_BOOK_LESSON_TITLES, SAMPLE_BOOKS, SAMPLE_LESSONS } from '../../../data/books';
import type { Flashcard } from '../../../data/flashcards';
import { getInteractiveGrammarManifestForLesson } from '../../../data/interactiveGrammarManifest';
import { fetchVocabulary } from '../../../services/vocabularyService';
import { useAppStore } from '../../../store/useAppStore';
import type { CourseDashboardProgress, LessonPartSelectionMap } from '../../../types/models';
import { getLessonSelectionKey } from '../../../utils/lesson/lessonPartSelection';
import { aggregateLessonPartProgress } from '../../../utils/lesson/lessonPartProgress';

interface UseCourseDashboardOptions {
  activeBookId: number;
  /** Refetch on sign-in: a pack request sent before the session token is ready fails. */
  userId: string | null;
  hasFullCourseAccess: boolean;
  learnedCards: string[];
  selectedLessons: number[];
  selectedLessonParts: LessonPartSelectionMap;
}

const EMPTY_PROGRESS: CourseDashboardProgress = {
  totalWords: 0,
  learnedWords: 0,
  completedLessons: 0,
  totalLessons: 0,
  progressPercent: 0,
  currentLessonId: null,
  lessons: [],
};

export function useCourseDashboard({
  activeBookId,
  userId,
  hasFullCourseAccess,
  learnedCards,
  selectedLessons,
  selectedLessonParts,
}: UseCourseDashboardOptions) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const completedGrammarPartIds = useAppStore((state) => state.completedPartIds);
  const lastOpenedLessons = useAppStore((state) => state.lastOpenedLessons);

  useEffect(() => {
    let isMounted = true;
    setCards([]);
    setIsLoading(true);
    setError(null);

    if (!hasFullCourseAccess && SAMPLE_BOOKS.find((book) => book.id === activeBookId)?.status === 'locked') {
      setIsLoading(false);
      return;
    }

    fetchVocabulary(activeBookId)
      .then((courseCards) => {
        if (isMounted) setCards(courseCards);
      })
      .catch(() => {
        if (!isMounted) return;
        setCards([]);
        setError('Lessons could not load. Refresh to try again.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeBookId, hasFullCourseAccess, userId]);


  const progress = useMemo<CourseDashboardProgress>(() => {
    const bookIsLocked = !hasFullCourseAccess
      && SAMPLE_BOOKS.find((book) => book.id === activeBookId)?.status === 'locked';
    if (!cards.length && !bookIsLocked && !hasFullCourseAccess) return EMPTY_PROGRESS;

    const configuredLessons = activeBookId === 1
      ? [
        { id: 0, label: 'Introduction', title: 'Getting Started', status: 'available' },
        ...SAMPLE_LESSONS.map((lesson) => ({ ...lesson, status: hasFullCourseAccess ? 'available' : lesson.status })),
      ]
      : SAMPLE_LESSONS.map((lesson, index) => ({
        id: lesson.id,
        label: lesson.label,
        title: LOCKED_BOOK_LESSON_TITLES[activeBookId]?.[index] ?? lesson.label,
        status: bookIsLocked ? 'locked' : hasFullCourseAccess ? 'available' : (activeBookId === 3 ? (lesson.id <= 5 ? 'available' : 'locked') : lesson.status),
      }));
    const configuredLessonsById = new Map(configuredLessons.map((lesson) => [lesson.id, lesson]));
    const lessonDefinitions = bookIsLocked || hasFullCourseAccess
      ? configuredLessons
      : Array.from(new Set(cards.map((card) => card.lessonId)))
        .sort((a, b) => a - b)
        .map((lessonId) => configuredLessonsById.get(lessonId) ?? {
          id: lessonId,
          label: `Lesson ${lessonId}`,
          title: `Lesson ${lessonId}`,
          status: 'available',
        });
    const cardsByLesson = new Map<number, Flashcard[]>();

    cards.forEach((card) => {
      const lessonCards = cardsByLesson.get(card.lessonId) ?? [];
      lessonCards.push(card);
      cardsByLesson.set(card.lessonId, lessonCards);
    });

    const baseLessons = lessonDefinitions
      .map((lesson) => {
        const lessonCards = cardsByLesson.get(lesson.id) ?? [];
        const partRows = aggregateLessonPartProgress(lessonCards, learnedCards);
        const learnedCount = partRows.reduce((total, part) => total + part.learnedCount, 0);
        const grammarParts = getInteractiveGrammarManifestForLesson(activeBookId, lesson.id);
        const requiredPathCount = grammarParts.length;
        const completedPathCount = grammarParts.filter(
          (part) => completedGrammarPartIds.includes(part.id),
        ).length;
        const isCompleted = learnedCount === lessonCards.length
          && completedPathCount === requiredPathCount;
        return {
          lesson,
          lessonCards,
          partRows,
          learnedCount,
          requiredPathCount,
          completedPathCount,
          isCompleted,
        };
      })
      .filter(({ lesson, lessonCards }) => lesson.status === 'locked' || lessonCards.length > 0);

    const isOpen = ({ lesson }: { lesson: { status: string } }) => lesson.status !== 'locked';
    const openIds = new Set(baseLessons.filter(isOpen).map(({ lesson }) => lesson.id));
    const selectedLessonId = selectedLessons.find((id) => openIds.has(id));
    const nextIncompleteLesson = baseLessons.find(
      (row) => isOpen(row) && !row.isCompleted,
    );
    const lastOpenedLessonId = lastOpenedLessons[activeBookId];
    const currentLessonId = (lastOpenedLessonId !== undefined && openIds.has(lastOpenedLessonId) ? lastOpenedLessonId : undefined)
      ?? selectedLessonId
      ?? nextIncompleteLesson?.lesson.id
      ?? baseLessons[0]?.lesson.id
      ?? null;

    const lessons = baseLessons.map(({
      lesson,
      lessonCards,
      partRows,
      learnedCount,
      requiredPathCount,
      completedPathCount,
      isCompleted,
    }) => {
      const isLocked = lesson.status === 'locked';
      const isCurrent = lesson.id === currentLessonId;
      const availablePartIds = partRows.map((part) => part.id);
      const partSelection = selectedLessonParts[getLessonSelectionKey(activeBookId, lesson.id)];
      const selectedPartIds = partSelection === 'all'
        || (!partSelection && selectedLessons.includes(lesson.id))
        ? availablePartIds
        : partSelection ?? [];
      const selectedPartSet = new Set(selectedPartIds);
      const parts = partRows.map((part) => ({
        ...part,
        isSelected: selectedPartSet.has(part.id),
      }));

      return {
        id: lesson.id,
        label: lesson.label,
        title: lesson.title,
        previewChinese: lessonCards[0]?.front,
        previewEnglish: lessonCards[0]?.back,
        wordCount: lessonCards.length,
        learnedCount,
        isSelected: selectedPartIds.length > 0,
        areAllPartsSelected: availablePartIds.length > 0 && selectedPartIds.length === availablePartIds.length,
        parts,
        requiredPathCount,
        completedPathCount,
        startedPathCount: completedPathCount,
        isFullyCompleted: isCompleted,
        state: isLocked
          ? 'locked' as const
          : isCurrent
            ? 'current' as const
            : isCompleted
              ? 'completed' as const
              : 'available' as const,
      };
    });

    // Locked lessons stay listed but never count toward totals.
    const openLessons = lessons.filter((lesson) => lesson.state !== 'locked');
    const openWords = openLessons.reduce((total, lesson) => total + lesson.wordCount, 0);
    const learnedWords = openLessons.reduce((total, lesson) => total + lesson.learnedCount, 0);
    const completedLessons = openLessons.filter((lesson) => lesson.isFullyCompleted).length;
    const totalRequiredPaths = openLessons.reduce(
      (total, lesson) => total + lesson.requiredPathCount,
      0,
    );
    const totalCompletedPaths = openLessons.reduce(
      (total, lesson) => total + lesson.completedPathCount,
      0,
    );
    const totalLearningUnits = openWords + totalRequiredPaths;
    const completedLearningUnits = learnedWords + totalCompletedPaths;

    return {
      totalWords: openWords,
      learnedWords,
      completedLessons,
      totalLessons: openLessons.length,
      progressPercent: totalLearningUnits > 0
        ? Math.round((completedLearningUnits / totalLearningUnits) * 100)
        : 0,
      currentLessonId,
      lessons,
    };
  }, [
    activeBookId,
    cards,
    hasFullCourseAccess,
    completedGrammarPartIds,
    lastOpenedLessons,
    learnedCards,
    selectedLessonParts,
    selectedLessons,
  ]);

  return { progress, isLoading, error };
}
