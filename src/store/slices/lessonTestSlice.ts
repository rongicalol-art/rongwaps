import type { LessonTestMode, LessonTestPart } from '../../types/lessonTest';
import type { LessonTestPlan } from '../../utils/lesson/lessonTestPlan';

/** Best score on a single section (Listening or Reading). */
export type LessonTestPartBest = {
  best: number;
  total: number;
  at: string;
};

/** A lesson test's best and latest results, and what to bring back next time. Keyed by lesson key ("b1l04"). */
/** A type alias (not an interface) so it is assignable to the settings jsonb column type. */
export type LessonTestRecord = {
  best: number;
  total: number;
  bestAt: string;
  /** True when only single-part runs have finished (no full test yet; keeps `best: 0` safe for older clients). */
  partsOnly?: boolean;
  /** Best score per section (updated by single-part runs and full runs alike). */
  parts?: Partial<Record<LessonTestPart, LessonTestPartBest>>;
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
  /** Which mode ran; defaults to 'both' when both parts have questions. */
  mode?: LessonTestMode;
  /** Full test's total questions (stored on a first single-part record so `total > 0` for older clients). */
  fullTotal?: number;
  correct: number;
  total: number;
  listening: [number, number];
  reading: [number, number];
  missedLessons: number[];
  shownVersionIds: string[];
  /** The run itself, kept for Scripts & answers. */
  review?: Omit<LessonTestReview, 'at'>;
}

/**
 * A finished full test is the lesson's first full run when no full test was saved before (on any device).
 * Single-part runs leave a `partsOnly` record, which doesn't count: only a learner's first full run feeds the
 * question statistics, and a listening- or reading-only run would skew the rest-of-test score each answer is paired with.
 */
export const isFirstFullRun = (record: LessonTestRecord | undefined, mode: LessonTestMode) =>
  mode === 'both' && (!record || record.partsOnly === true);

/** Best score for a given mode (full test or one section), falling back to `last[part]` on older records. */
export function lessonTestBestForMode(
  record: LessonTestRecord | undefined,
  mode: LessonTestMode,
): { best: number; total: number } | null {
  if (!record) return null;
  if (mode === 'both') {
    if (record.partsOnly || record.total <= 0) return null;
    return { best: record.best, total: record.total };
  }
  const partBest = record.parts?.[mode];
  if (partBest && partBest.total > 0) return { best: partBest.best, total: partBest.total };
  const lastPart = record.last[mode];
  return lastPart && lastPart[1] > 0 ? { best: lastPart[0], total: lastPart[1] } : null;
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

function inferResultMode(result: Pick<LessonTestResult, 'mode' | 'listening' | 'reading'>): LessonTestMode {
  if (result.mode) return result.mode;
  const hasListening = result.listening[1] > 0;
  const hasReading = result.reading[1] > 0;
  if (hasListening && !hasReading) return 'listening';
  if (hasReading && !hasListening) return 'reading';
  return 'both';
}

function mergePartBest(
  previous: LessonTestPartBest | undefined,
  pairScore: [number, number],
  at: string,
): LessonTestPartBest | undefined {
  const [correct, total] = pairScore;
  if (total <= 0) return previous;
  if (!previous || previous.total <= 0 || correct / total > previous.best / previous.total) {
    return { best: correct, total, at };
  }
  return previous;
}

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
      const mode = inferResultMode(result);
      const listeningBest = mergePartBest(previous?.parts?.listening, result.listening, at);
      const readingBest = mergePartBest(previous?.parts?.reading, result.reading, at);
      const parts: Partial<Record<LessonTestPart, LessonTestPartBest>> = {
        ...(listeningBest ? { listening: listeningBest } : {}),
        ...(readingBest ? { reading: readingBest } : {}),
      };
      const isFull = mode === 'both';
      const hadFull = Boolean(previous && !previous.partsOnly);
      const isBestFull = isFull && (!hadFull || result.correct / result.total > previous!.best / previous!.total);
      const record: LessonTestRecord = {
        best: isFull ? (isBestFull ? result.correct : previous!.best) : (hadFull ? previous!.best : 0),
        total: isFull ? (isBestFull ? result.total : previous!.total) : (hadFull ? previous!.total : Math.max(1, result.fullTotal ?? result.total)),
        bestAt: isFull ? (isBestFull ? at : previous!.bestAt) : (hadFull ? previous!.bestAt : at),
        ...(!isFull && !hadFull ? { partsOnly: true } : {}),
        ...(Object.keys(parts).length > 0 ? { parts } : {}),
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

function validPartBest(value: unknown): LessonTestPartBest | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const p = value as Partial<LessonTestPartBest>;
  if (typeof p.best !== 'number' || typeof p.total !== 'number' || !(p.total > 0) || p.best < 0 || p.best > p.total
    || typeof p.at !== 'string' || Number.isNaN(Date.parse(p.at))) return undefined;
  return { best: p.best, total: p.total, at: p.at };
}

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
  const rawParts = r.parts && typeof r.parts === 'object' && !Array.isArray(r.parts) ? r.parts as Record<string, unknown> : null;
  const listening = rawParts ? validPartBest(rawParts.listening) : undefined;
  const reading = rawParts ? validPartBest(rawParts.reading) : undefined;
  const parts = listening || reading ? { ...(listening ? { listening } : {}), ...(reading ? { reading } : {}) } : undefined;
  return {
    best: r.best, total: r.total, bestAt: r.bestAt,
    ...(r.partsOnly === true ? { partsOnly: true } : {}),
    ...(parts ? { parts } : {}),
    last: { correct: last.correct, total: last.total, at: last.at, listening: last.listening, reading: last.reading },
    missedLessons: Array.isArray(r.missedLessons) ? r.missedLessons.filter((n): n is number => typeof n === 'number') : [],
    seen,
  };
}

/**
 * Test records from another device, merged into this one's: per lesson the better best score (full test beats
 * single-part-only), the better per-part best scores, the newer last run (with its missed lessons), and the higher
 * count for each version seen. Returns only what changes locally.
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
    const theirFull = !theirs.partsOnly;
    const mineFull = !mine.partsOnly;
    const theirBest = (theirFull && !mineFull) || (theirFull === mineFull && theirs.best / theirs.total > mine.best / mine.total);
    const theirLast = Date.parse(theirs.last.at) > Date.parse(mine.last.at);
    const seen = { ...mine.seen };
    let moreSeen = false;
    for (const [id, count] of Object.entries(theirs.seen)) if (count > (seen[id] ?? 0)) { seen[id] = count; moreSeen = true; }
    let partsChanged = false;
    const parts: Partial<Record<LessonTestPart, LessonTestPartBest>> = { ...(mine.parts ?? {}) };
    for (const part of ['listening', 'reading'] as const) {
      const tp = theirs.parts?.[part];
      const mp = mine.parts?.[part];
      if (tp && (!mp || tp.best / tp.total > mp.best / mp.total)) {
        parts[part] = tp;
        partsChanged = true;
      }
    }
    if (!theirBest && !theirLast && !moreSeen && !partsChanged) continue;
    const nextPartsOnly = !theirFull && !mineFull;
    (merged ??= { ...local })[key] = {
      best: theirBest ? theirs.best : mine.best, total: theirBest ? theirs.total : mine.total, bestAt: theirBest ? theirs.bestAt : mine.bestAt,
      ...(nextPartsOnly ? { partsOnly: true } : {}),
      ...(Object.keys(parts).length > 0 ? { parts } : {}),
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
