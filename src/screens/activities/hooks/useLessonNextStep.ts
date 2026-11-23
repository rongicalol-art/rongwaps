import { useMemo } from 'react';
import type { SessionNextStep } from '../../../features/practice';
import { usePartHasSentences } from '../../../hooks/usePartHasSentences';
import { useAppStore } from '../../../store/useAppStore';
import type { Flashcard } from '../../../data/flashcards';
import { PRACTICE_MODES, pickPracticeSuggestion, type PracticeModeId } from '../practiceModes';

interface UseLessonNextStepOptions {
  /** Only a single lesson's own session has a fitting next step (not review, library or race decks). */
  enabled: boolean;
  bookId: number;
  lessonId: number | null;
  partIds: number[];
  /** The session's words; practice on them in the last week marks a mode as done. */
  cards: Flashcard[];
  onPractice: (mode: PracticeModeId) => void;
}

/**
 * The end screen's next step after a lesson quiz: Sentences when the part has them (the owner's pick over the
 * dialogue), otherwise the first practice mode not done on these words this week.
 */
export function useLessonNextStep({ enabled, bookId, lessonId, partIds, cards, onPractice }: UseLessonNextStepOptions): SessionNextStep | null {
  const reviewEvents = useAppStore((state) => state.reviewEvents);
  const hasSentences = usePartHasSentences(bookId, enabled ? lessonId : null, partIds, cards.length > 0);

  const partsKey = partIds.join(',');
  return useMemo(() => {
    if (!enabled || lessonId === null || partIds.length === 0) return null;
    const mode = pickPracticeSuggestion(reviewEvents, new Set(cards.map((card) => card.id)), hasSentences, Date.now());
    const { icon, label, line } = PRACTICE_MODES[mode];
    return { icon, title: `Practice ${label.toLowerCase()}`, line, onSelect: () => onPractice(mode) };
    // partsKey stands in for partIds (a new array each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, enabled, hasSentences, lessonId, onPractice, partsKey, reviewEvents]);
}
