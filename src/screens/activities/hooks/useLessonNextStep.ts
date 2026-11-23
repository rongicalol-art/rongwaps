import { useEffect, useMemo, useState } from 'react';
import type { SessionNextStep } from '../../../features/practice';
import { usePartHasSentences } from '../../../hooks/usePartHasSentences';
import { fetchReadingsPack } from '../../../services/contentPacks';
import { useAppStore } from '../../../store/useAppStore';
import type { ReadingRecord } from '../../../types/models';
import { isEssayReading } from '../../../utils/lesson/readingKind';
import type { Flashcard } from '../../../data/flashcards';
import { PRACTICE_MODES, pickPracticeSuggestion, type PracticeModeId } from '../practiceModes';

export interface ReadingTarget {
  bookId: number;
  lessonId: number;
  partId: number | number[];
}

interface UseLessonNextStepOptions {
  /** Only a single lesson's own session has a fitting next step (not review, library or race decks). */
  enabled: boolean;
  bookId: number;
  lessonId: number | null;
  partIds: number[];
  /** The session's words; practice on them in the last week marks a mode as done. */
  cards: Flashcard[];
  onPractice: (mode: PracticeModeId) => void;
  onRead?: (target: ReadingTarget) => void;
}

/**
 * The end screen's next step after a lesson quiz: the part's dialogue while it is unread (it uses the words
 * just learned), otherwise the first practice mode not done on these words this week.
 */
export function useLessonNextStep({ enabled, bookId, lessonId, partIds, cards, onPractice, onRead }: UseLessonNextStepOptions): SessionNextStep | null {
  const readReadingIds = useAppStore((state) => state.readReadingIds);
  const reviewEvents = useAppStore((state) => state.reviewEvents);
  const [readings, setReadings] = useState<{ bookId: number; list: ReadingRecord[] } | null>(null);
  const hasSentences = usePartHasSentences(bookId, enabled ? lessonId : null, partIds, cards.length > 0);

  useEffect(() => {
    if (!enabled) return undefined;
    let current = true;
    void fetchReadingsPack(bookId).then((pack) => { if (current) setReadings({ bookId, list: pack ?? [] }); });
    return () => { current = false; };
  }, [bookId, enabled]);

  const partsKey = partIds.join(',');
  return useMemo(() => {
    if (!enabled || lessonId === null || partIds.length === 0) return null;
    const parts = new Set(partIds);
    const unread = readings?.bookId === bookId
      ? readings.list.find((r) => r.lessonId === lessonId && parts.has(r.dialogueNumber) && !readReadingIds.includes(r.id))
      : undefined;
    if (unread && onRead) {
      const partId = partIds.length > 1 ? partIds : partIds[0];
      return {
        icon: 'dialogue',
        title: isEssayReading(unread) ? 'Read the essay' : 'Read the dialogue',
        line: 'See these words in use',
        onSelect: () => onRead({ bookId, lessonId, partId }),
      };
    }

    const mode = pickPracticeSuggestion(reviewEvents, new Set(cards.map((card) => card.id)), hasSentences, Date.now());
    const { icon, label, line } = PRACTICE_MODES[mode];
    return { icon, title: `Practice ${label.toLowerCase()}`, line, onSelect: () => onPractice(mode) };
    // partsKey stands in for partIds (a new array each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, cards, enabled, hasSentences, lessonId, onPractice, onRead, partsKey, readReadingIds, readings, reviewEvents]);
}
