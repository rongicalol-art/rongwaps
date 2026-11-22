import type { LessonTestPlan } from '../../utils/lesson/lessonTestPlan';

/** A lesson test's best and latest results, and what to bring back next time. Keyed by lesson key ("b1l04"). */
/** A type alias (not an interface) so it is assignable to the settings jsonb column type. */
export type LessonTestRecord = {
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
};

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

/** The last finished run of a lesson's test, for Scripts & answers on the Test tab. */
export interface LessonTestReview {
  plan: LessonTestPlan;
  /** Question id → original choice index, as answered in the test. */
  answers: Record<string, number>;
  at: string;
}

export interface LessonTestResult {
  key: string;
  correct: number;
  total: number;
  listening: [number, number];
  reading: [number, number];
  missedLessons: number[];
  shownVersionIds: string[];
  /** The run itself, kept for Scripts & answers. */
  review?: Omit<LessonTestReview, 'at'>;
}

export interface LessonTestState {
  lessonTests: Record<string, LessonTestRecord>;
  lessonTestAttempt: LessonTestAttempt | null;
  /** Each lesson's last finished run (lesson key → run). */
  lessonTestLast: Record<string, LessonTestReview>;
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
    lessonTestLast: {},
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
      return {
        lessonTests: { ...state.lessonTests, [result.key]: record },
        lessonTestAttempt: null,
        lessonTestLast: result.review ? { ...state.lessonTestLast, [result.key]: { ...result.review, at } } : state.lessonTestLast,
      };
    }),
    resetLessonTests: () => set({ lessonTests: {}, lessonTestAttempt: null, lessonTestLast: {} }),
  };
}

const pair = (value: unknown): value is [number, number] =>
  Array.isArray(value) && value.length === 2 && value.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0);

/** A record as another device saved it, or null when it is not one (the cloud copy is untrusted input). */
function validRecord(value: unknown): LessonTestRecord | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Partial<LessonTestRecord>;
  const last = r.last;
  if (typeof r.best !== 'number' || typeof r.total !== 'number' || !(r.total > 0) || r.best < 0 || r.best > r.total
    || typeof r.bestAt !== 'string' || Number.isNaN(Date.parse(r.bestAt))
    || !last || typeof last.correct !== 'number' || typeof last.total !== 'number' || !(last.total > 0)
    || typeof last.at !== 'string' || Number.isNaN(Date.parse(last.at)) || !pair(last.listening) || !pair(last.reading)) return null;
  const seen = r.seen && typeof r.seen === 'object' && !Array.isArray(r.seen)
    ? Object.fromEntries(Object.entries(r.seen).filter(([, n]) => typeof n === 'number' && n > 0)) : {};
  return {
    best: r.best, total: r.total, bestAt: r.bestAt,
    last: { correct: last.correct, total: last.total, at: last.at, listening: last.listening, reading: last.reading },
    missedLessons: Array.isArray(r.missedLessons) ? r.missedLessons.filter((n): n is number => typeof n === 'number') : [],
    seen,
  };
}

/**
 * Test records from another device, merged into this one's: per lesson the better best score, the newer last run
 * (with its missed lessons), and the higher count for each version seen. Returns only what changes locally.
 */
export function mergeLessonTests(
  local: Record<string, LessonTestRecord>,
  cloud: unknown,
): { lessonTests?: Record<string, LessonTestRecord> } {
  if (!cloud || typeof cloud !== 'object' || Array.isArray(cloud)) return {};
  let merged: Record<string, LessonTestRecord> | null = null;
  for (const [key, value] of Object.entries(cloud as Record<string, unknown>)) {
    const theirs = validRecord(value);
    if (!theirs) continue;
    const mine = local[key];
    if (!mine) { (merged ??= { ...local })[key] = theirs; continue; }
    const theirBest = theirs.best / theirs.total > mine.best / mine.total;
    const theirLast = Date.parse(theirs.last.at) > Date.parse(mine.last.at);
    const seen = { ...mine.seen };
    let moreSeen = false;
    for (const [id, count] of Object.entries(theirs.seen)) if (count > (seen[id] ?? 0)) { seen[id] = count; moreSeen = true; }
    if (!theirBest && !theirLast && !moreSeen) continue;
    (merged ??= { ...local })[key] = {
      best: theirBest ? theirs.best : mine.best, total: theirBest ? theirs.total : mine.total, bestAt: theirBest ? theirs.bestAt : mine.bestAt,
      last: theirLast ? theirs.last : mine.last,
      missedLessons: theirLast ? theirs.missedLessons : mine.missedLessons,
      seen,
    };
  }
  return merged ? { lessonTests: merged } : {};
}

/**
 * `lessonTests` (best and last scores) is synced inside the settings blob's `grammarProgress`, which the
 * server's progress reset clears. The attempt in progress and the last finished run stay on this device.
 */
export const LESSON_TEST_SYNCED_KEYS = ['lessonTests'] as const;
export const LESSON_TEST_PERSISTED_KEYS = ['lessonTests', 'lessonTestAttempt', 'lessonTestLast'] as const;

export const LESSON_TEST_ACCOUNT_SWITCH_DEFAULTS = {
  lessonTests: {},
  lessonTestAttempt: null,
  lessonTestLast: {},
};
