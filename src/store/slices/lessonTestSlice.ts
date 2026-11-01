import type { LessonTestPlan } from '../../utils/lesson/lessonTestPlan';

/** A lesson test's best and latest results, and what to bring back next time. Keyed by lesson key ("b1l04"). */
export interface LessonTestRecord {
  best: number;
  total: number;
  bestAt: string;
  last: {
    correct: number;
    total: number;
    at: string;
    listening: [correct: number, total: number];
    reading: [correct: number, total: number];
  };
  /** Earlier lessons the learner missed questions from: their review slots weigh more next time. */
  missedLessons: number[];
  /** Times each version was shown, so a retake picks the least-seen ones. */
  seen: Record<string, number>;
}

/** The test in progress (one at a time), so closing the app resumes it. */
export interface LessonTestAttempt {
  key: string;
  plan: LessonTestPlan;
  /** Question id → original choice index (independent of the shuffled order). */
  answers: Record<string, number>;
  /** Index of the next screen to show. */
  screen: number;
  startedAt: number;
}

export interface LessonTestResult {
  key: string;
  correct: number;
  total: number;
  listening: [number, number];
  reading: [number, number];
  missedLessons: number[];
  shownVersionIds: string[];
}

export interface LessonTestState {
  lessonTests: Record<string, LessonTestRecord>;
  lessonTestAttempt: LessonTestAttempt | null;
  saveLessonTestAttempt: (attempt: LessonTestAttempt | null) => void;
  recordLessonTestResult: (result: LessonTestResult) => void;
  resetLessonTests: () => void;
}

type SetState = (
  partial: Partial<LessonTestState> | ((state: LessonTestState) => Partial<LessonTestState>),
) => void;

export function createLessonTestSlice(set: SetState): LessonTestState {
  return {
    lessonTests: {},
    lessonTestAttempt: null,
    saveLessonTestAttempt: (attempt) => set({ lessonTestAttempt: attempt }),
    recordLessonTestResult: (result) => set((state) => {
      const previous = state.lessonTests[result.key];
      const at = new Date().toISOString();
      const seen = { ...(previous?.seen ?? {}) };
      for (const id of result.shownVersionIds) seen[id] = (seen[id] ?? 0) + 1;
      const isBest = !previous || result.correct / result.total > previous.best / previous.total;
      const record: LessonTestRecord = {
        best: isBest ? result.correct : previous.best,
        total: isBest ? result.total : previous.total,
        bestAt: isBest ? at : previous.bestAt,
        last: { correct: result.correct, total: result.total, at, listening: result.listening, reading: result.reading },
        missedLessons: result.missedLessons,
        seen,
      };
      return { lessonTests: { ...state.lessonTests, [result.key]: record }, lessonTestAttempt: null };
    }),
    resetLessonTests: () => set({ lessonTests: {}, lessonTestAttempt: null }),
  };
}

/** Local to this device for now (not cloud-synced yet): best scores and the attempt in progress. */
export const LESSON_TEST_PERSISTED_KEYS = ['lessonTests', 'lessonTestAttempt'] as const;

export const LESSON_TEST_ACCOUNT_SWITCH_DEFAULTS = {
  lessonTests: {},
  lessonTestAttempt: null,
};
