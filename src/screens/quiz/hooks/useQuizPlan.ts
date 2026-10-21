import { useEffect, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import type { PlanOptions, QuizBeat } from '../../../utils/vocabulary/quizDirector';
import { prepareQuizPlan } from '../../../services/quizPlanner';

const NO_BEATS: QuizBeat[] = [];

export function useQuizPlan(cards: readonly Flashcard[], options: PlanOptions, key: string, enabled: boolean) {
  const [plan, setPlan] = useState<{ key: string; beats: QuizBeat[]; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled || cards.length === 0) return;
    const controller = new AbortController();
    void prepareQuizPlan(cards, options, controller.signal).then((beats) => {
      if (!controller.signal.aborted) setPlan({ key, beats, error: false });
    }, () => {
      if (!controller.signal.aborted) setPlan({ key, beats: NO_BEATS, error: true });
    });
    return () => controller.abort();
    // The round key deliberately freezes settings and vocabulary for a resumable plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, attempt]);
  const current = plan?.key === key ? plan : null;
  return {
    beats: current?.beats ?? NO_BEATS,
    pending: enabled && cards.length > 0 && !current,
    error: current?.error ?? false,
    retry: () => { setPlan(null); setAttempt((value) => value + 1); },
  };
}
