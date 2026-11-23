import { useCallback, useMemo, useState } from 'react';
import type { LessonTestScreen } from '../../../utils/lesson/lessonTestPlan';

/**
 * The Fix round after a test: the screens that hold a missed question, each answered again and checked, with the
 * reason shown. Shared by the lesson test and the mock test.
 */
export function useFixRound(screens: LessonTestScreen[], missedIds: readonly string[] | null) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);

  const fixScreens = useMemo(() => {
    if (!missedIds) return [];
    const missed = new Set(missedIds);
    return screens
      .map((entry) => ({ ...entry, questionIds: entry.questionIds.filter((id) => missed.has(id)) }))
      .filter((entry) => entry.questionIds.length > 0);
  }, [missedIds, screens]);

  /** Starts the round over; false when there is nothing to fix. */
  const start = useCallback(() => {
    setIndex(0);
    setAnswers({});
    setChecked(false);
    return fixScreens.length > 0;
  }, [fixScreens.length]);

  /** Moves on after a checked screen; false when that was the last one. */
  const advance = useCallback(() => {
    setChecked(false);
    if (index + 1 >= fixScreens.length) return false;
    setIndex(index + 1);
    return true;
  }, [fixScreens.length, index]);

  const answer = useCallback((questionId: string, choice: number | undefined) => setAnswers((current) => {
    const next = { ...current };
    if (choice === undefined) delete next[questionId];
    else next[questionId] = choice;
    return next;
  }), []);

  return {
    screens: fixScreens,
    screen: fixScreens[index] as LessonTestScreen | undefined,
    index,
    answers,
    answer,
    checked,
    check: () => setChecked(true),
    start,
    advance,
  };
}
