import { useEffect, useMemo, useState } from 'react';
import { SAMPLE_LESSONS } from '../../../data/books';
import type { Flashcard } from '../../../data/flashcards';
import { getInteractiveGrammarPartsForLesson } from '../../../data/interactiveGrammarPages';
import { fetchVocabulary } from '../../../services/vocabularyService';
import { useGrammarLessonStore } from '../../../store/useGrammarLessonStore';
import type { CourseDashboardProgress, LessonPartSelectionMap } from '../../../types/models';
import { getLessonSelectionKey } from '../../../utils/lessonPartSelection';

interface UseCourseDashboardOptions {
  activeBookId: number;
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
  learnedCards,
  selectedLessons,
  selectedLessonParts,
}: UseCourseDashboardOptions) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const completedGrammarPartIds = useGrammarLessonStore((state) => state.completedPartIds);

  useEffect(() => {
    let isMounted = true;
    setCards([]);
    setIsLoading(true);
    setError(null);

    fetchVocabulary(activeBookId)
      .then((courseCards) => {
        if (isMounted) setCards(courseCards);
      })
      .catch((loadError) => {
        if (!isMounted) return;
        setCards([]);
        setError(loadError instanceof Error ? loadError.message : 'Course progress is unavailable.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeBookId]);


  const progress = useMemo<CourseDashboardProgress>(() => {
    if (!cards.length) return EMPTY_PROGRESS;

    const configuredLessons = activeBookId === 1
      ? [{ id: 0, label: 'Introduction', title: 'Getting Started', status: 'available' }, ...SAMPLE_LESSONS]
      : SAMPLE_LESSONS;
    const configuredLessonsById = new Map(configuredLessons.map((lesson) => [lesson.id, lesson]));
    const lessonDefinitions = Array.from(new Set(cards.map((card) => card.lessonId)))
      .sort((a, b) => a - b)
      .map((lessonId) => configuredLessonsById.get(lessonId) ?? {
        id: lessonId,
        label: `Lesson ${lessonId}`,
        title: `Lesson ${lessonId}`,
        status: 'available',
      });
    const learnedSet = new Set(learnedCards.map((cardId) => cardId.toLowerCase()));
    const cardsByLesson = new Map<number, Flashcard[]>();

    cards.forEach((card) => {
      const lessonCards = cardsByLesson.get(card.lessonId) ?? [];
      lessonCards.push(card);
      cardsByLesson.set(card.lessonId, lessonCards);
    });

    const baseLessons = lessonDefinitions
      .map((lesson) => {
        const lessonCards = cardsByLesson.get(lesson.id) ?? [];
        const learnedCount = lessonCards.filter(
          (card) => learnedSet.has(card.id.toLowerCase()),
        ).length;
        const grammarParts = getInteractiveGrammarPartsForLesson(activeBookId, lesson.id);
        const requiredPathCount = grammarParts.length;
        const completedPathCount = grammarParts.filter(
          (part) => completedGrammarPartIds.includes(part.id),
        ).length;
        const isCompleted = learnedCount === lessonCards.length
          && completedPathCount === requiredPathCount;
        return {
          lesson,
          lessonCards,
          learnedCount,
          requiredPathCount,
          completedPathCount,
          isCompleted,
        };
      })
      .filter(({ lessonCards }) => lessonCards.length > 0);

    const selectedLessonId = selectedLessons.find((id) => cardsByLesson.has(id));
    const nextIncompleteLesson = baseLessons.find(
      ({ isCompleted }) => !isCompleted,
    );
    const currentLessonId = selectedLessonId
      ?? nextIncompleteLesson?.lesson.id
      ?? baseLessons[0]?.lesson.id
      ?? null;

    const lessons = baseLessons.map(({
      lesson,
      lessonCards,
      learnedCount,
      requiredPathCount,
      completedPathCount,
      isCompleted,
    }) => {
      const isLocked = lesson.status === 'locked';
      const isCurrent = lesson.id === currentLessonId;
      const cardsByPart = new Map<number, Flashcard[]>();

      lessonCards.forEach((card) => {
        const partId = card.partId ?? 1;
        const partCards = cardsByPart.get(partId) ?? [];
        partCards.push(card);
        cardsByPart.set(partId, partCards);
      });

      const availablePartIds = Array.from(cardsByPart.keys()).sort((a, b) => a - b);
      const partSelection = selectedLessonParts[getLessonSelectionKey(activeBookId, lesson.id)];
      const selectedPartIds = partSelection === 'all'
        || (!partSelection && selectedLessons.includes(lesson.id))
        ? availablePartIds
        : partSelection ?? [];
      const selectedPartSet = new Set(selectedPartIds);
      const parts = availablePartIds.map((partId) => {
        const partCards = cardsByPart.get(partId) ?? [];
        return {
          id: partId,
          wordCount: partCards.length,
          learnedCount: partCards.filter((card) => learnedSet.has(card.id.toLowerCase())).length,
          isSelected: selectedPartSet.has(partId),
        };
      });

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

    const learnedWords = cards.filter(
      (card) => learnedSet.has(card.id.toLowerCase()),
    ).length;
    const completedLessons = lessons.filter((lesson) => lesson.isFullyCompleted).length;
    const totalRequiredPaths = lessons.reduce(
      (total, lesson) => total + lesson.requiredPathCount,
      0,
    );
    const totalCompletedPaths = lessons.reduce(
      (total, lesson) => total + lesson.completedPathCount,
      0,
    );
    const totalLearningUnits = cards.length + totalRequiredPaths;
    const completedLearningUnits = learnedWords + totalCompletedPaths;

    return {
      totalWords: cards.length,
      learnedWords,
      completedLessons,
      totalLessons: lessons.length,
      progressPercent: totalLearningUnits > 0
        ? Math.round((completedLearningUnits / totalLearningUnits) * 100)
        : 0,
      currentLessonId,
      lessons,
    };
  }, [
    activeBookId,
    cards,
    completedGrammarPartIds,
    learnedCards,
    selectedLessonParts,
    selectedLessons,
  ]);

  return { progress, isLoading, error };
}
