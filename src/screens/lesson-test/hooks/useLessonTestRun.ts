import { useCallback, useMemo, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import type { LessonTestLesson, LessonTestQuestion } from '../../../types/lessonTest';
import {
  LESSON_TEST_PASS,
  lessonItemIndex,
  lessonTestScreens,
  planLessonTest,
  scoreLessonTest,
  type LessonTestScore,
  type LessonTestScreen,
} from '../../../utils/lesson/lessonTestPlan';
import type { LessonTestAttempt } from '../../../store/slices/lessonTestSlice';

export type TestStage = 'intro' | 'question' | 'results' | 'fix' | 'done';

/** A fresh run, or the saved one for this lesson (closing the app mid-test resumes it). */
function startAttempt(lesson: LessonTestLesson): LessonTestAttempt {
  const state = useAppStore.getState();
  const saved = state.lessonTestAttempt;
  if (saved?.key === lesson.key && saved.plan.items.every((item) => lessonItemIndex(lesson).has(item.itemId))) return saved;
  const record = state.lessonTests[lesson.key];
  const seed = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const plan = planLessonTest(lesson, { seen: record?.seen, missedLessons: record?.missedLessons }, seed);
  return { key: lesson.key, plan, answers: {}, screen: 0, startedAt: Date.now() };
}

/** Missed words go back into review: learned words come back sooner, unstudied ones are only logged. True when any came back. */
function reviewMissedWords(missed: LessonTestQuestion[], sessionId: string): boolean {
  const state = useAppStore.getState();
  const learned = new Set(state.learnedCards);
  let rescheduled = false;
  for (const id of new Set(missed.flatMap((question) => question.wordIds))) {
    const studied = learned.has(id) || Boolean(state.srsData[id]);
    rescheduled ||= studied;
    state.markCardReviewed(id, 2, {
      id: crypto.randomUUID(), sessionId, source: 'quiz', durationMs: 0, practiceOnly: !studied,
    }, { lapse: true });
  }
  return rescheduled;
}

/**
 * The test's flow: part curtain → questions (no right or wrong, no going back) → results → Fix round over
 * every miss (answers checked, with the reason) → done. The run is saved after every answer.
 */
export function useLessonTestRun(lesson: LessonTestLesson) {
  const [attempt, setAttempt] = useState(() => startAttempt(lesson));
  const screens = useMemo(() => lessonTestScreens(lesson, attempt.plan), [lesson, attempt.plan]);
  const [stage, setStage] = useState<TestStage>(() => (attempt.screen > 0 ? 'question' : 'intro'));
  const [result, setResult] = useState<{ score: LessonTestScore; seconds: number; passed: boolean; rescheduled: boolean } | null>(null);
  const [fixIndex, setFixIndex] = useState(0);
  const [fixAnswers, setFixAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);

  const save = useCallback((next: LessonTestAttempt) => {
    setAttempt(next);
    useAppStore.getState().saveLessonTestAttempt(next);
  }, []);

  const screen: LessonTestScreen | undefined = screens[attempt.screen];
  const fixScreens = useMemo(() => {
    if (!result) return [];
    const missed = new Set(result.score.missed.map(({ question }) => question.id));
    return screens
      .map((entry) => ({ ...entry, questionIds: entry.questionIds.filter((id) => missed.has(id)) }))
      .filter((entry) => entry.questionIds.length > 0);
  }, [result, screens]);

  const answer = useCallback((questionId: string, choice: number | undefined) => {
    const answers = { ...attempt.answers };
    if (choice === undefined) delete answers[questionId];
    else answers[questionId] = choice;
    save({ ...attempt, answers });
  }, [attempt, save]);

  const finish = useCallback(() => {
    const score = scoreLessonTest(lesson, attempt.plan, attempt.answers);
    const seconds = Math.round((Date.now() - attempt.startedAt) / 1000);
    const rescheduled = reviewMissedWords(score.missed.map(({ question }) => question), attempt.plan.seed);
    useAppStore.getState().recordLessonTestResult({
      key: lesson.key,
      correct: score.correct,
      total: score.total,
      listening: score.listening,
      reading: score.reading,
      missedLessons: [...new Set(score.missed.map(({ question }) => question.lesson).filter((id) => id !== lesson.lessonId))],
      shownVersionIds: attempt.plan.items.map((item) => item.itemId),
    });
    setResult({ score, seconds, passed: score.correct / score.total >= LESSON_TEST_PASS, rescheduled });
    setStage('results');
  }, [attempt, lesson]);

  /** Next screen: the reading part starts with its own intro. */
  const next = useCallback(() => {
    const index = attempt.screen + 1;
    if (index >= screens.length) { finish(); return; }
    save({ ...attempt, screen: index });
    setStage(screens[index].part !== screens[index - 1].part ? 'intro' : 'question');
  }, [attempt, finish, save, screens]);

  const startFix = useCallback(() => {
    setFixIndex(0);
    setFixAnswers({});
    setChecked(false);
    setStage(fixScreens.length ? 'fix' : 'done');
  }, [fixScreens.length]);

  const continueFix = useCallback(() => {
    setChecked(false);
    if (fixIndex + 1 >= fixScreens.length) setStage('done');
    else setFixIndex(fixIndex + 1);
  }, [fixIndex, fixScreens.length]);

  return {
    lesson,
    plan: attempt.plan,
    stage,
    setStage,
    screens,
    screen,
    screenIndex: attempt.screen,
    answers: attempt.answers,
    answer,
    next,
    result,
    fixScreens,
    fixScreen: fixScreens[fixIndex] as LessonTestScreen | undefined,
    fixIndex,
    fixAnswers,
    answerFix: (questionId: string, choice: number | undefined) => setFixAnswers((current) => {
      const nextAnswers = { ...current };
      if (choice === undefined) delete nextAnswers[questionId];
      else nextAnswers[questionId] = choice;
      return nextAnswers;
    }),
    checked,
    check: () => setChecked(true),
    startFix,
    continueFix,
  };
}
