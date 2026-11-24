import { appendUniqueId } from '../../utils/lesson/lessonProgress';
import type { LessonDoneMark } from '../../utils/lesson/lessonCompletion';

/**
 * What a lesson needs beyond cards and grammar: readings read to the end, and lessons the learner
 * marked done by hand. Synced inside the settings blob's `grammarProgress` (see `mergeLessonProgress`),
 * so a progress reset clears it on the server like grammar completion.
 */
export interface LessonProgressState {
  /** Reading ids ("B3L01-R02") read to the end. Only grows (a reset clears it). */
  readReadingIds: string[];
  /** Lesson key ("b3l01") → the learner's own done mark; the newest mark wins across devices. */
  lessonDoneMarks: Record<string, LessonDoneMark>;
  /**
   * Books whose lessons were checked against the old done rule (all words + all grammar, before
   * readings counted). Device-local: each device checks once per book, after its first sync.
   */
  legacyDoneBooks: number[];
  /** Completed Start Here lesson numbers (1–24). Only grows (a reset clears it). */
  startHereCompletedLessons: number[];
  /** True once the learner has passed the Start Here Ready check. */
  startHerePassed: boolean;
  markReadingRead: (readingId: string) => void;
  setLessonDoneMark: (lessonKey: string, done: boolean) => void;
  /** Keeps lessons done that were done before readings counted: marks them, never overriding a mark. */
  keepLegacyLessonsDone: (bookId: number, lessonKeys: string[]) => void;
  markStartHereLessonDone: (lessonId: number) => void;
  markStartHerePassed: () => void;
  resetLessonProgress: () => void;
}

type SetState = (
  partial:
    | Partial<LessonProgressState>
    | ((state: LessonProgressState) => Partial<LessonProgressState>),
) => void;

export function createLessonProgressSlice(set: SetState): LessonProgressState {
  return {
    readReadingIds: [],
    lessonDoneMarks: {},
    legacyDoneBooks: [],
    startHereCompletedLessons: [],
    startHerePassed: false,
    keepLegacyLessonsDone: (bookId, lessonKeys) => set((state) => {
      if (state.legacyDoneBooks.includes(bookId)) return {};
      const at = new Date().toISOString();
      const added = lessonKeys.filter((key) => !state.lessonDoneMarks[key]);
      return {
        legacyDoneBooks: [...state.legacyDoneBooks, bookId],
        ...(added.length ? { lessonDoneMarks: { ...state.lessonDoneMarks, ...Object.fromEntries(added.map((key) => [key, { done: true, at }])) } } : {}),
      };
    }),
    markReadingRead: (readingId) => set((state) => {
      const next = appendUniqueId(state.readReadingIds, readingId);
      return next === state.readReadingIds ? {} : { readReadingIds: next };
    }),
    setLessonDoneMark: (lessonKey, done) => set((state) => ({
      lessonDoneMarks: { ...state.lessonDoneMarks, [lessonKey]: { done, at: new Date().toISOString() } },
    })),
    markStartHereLessonDone: (lessonId) => set((state) => {
      if (!Number.isSafeInteger(lessonId) || lessonId < 1 || lessonId > 24) return {};
      if (state.startHereCompletedLessons.includes(lessonId)) return {};
      return {
        startHereCompletedLessons: [...state.startHereCompletedLessons, lessonId].sort((a, b) => a - b),
      };
    }),
    markStartHerePassed: () => set((state) => (state.startHerePassed ? {} : { startHerePassed: true })),
    // After a reset nothing was done under the old rule either, so the check can stay recorded.
    resetLessonProgress: () => set({
      readReadingIds: [],
      lessonDoneMarks: {},
      startHereCompletedLessons: [],
      startHerePassed: false,
    }),
  };
}

/** Synced: `readReadingIds`, `lessonDoneMarks`, `startHereCompletedLessons`, `startHerePassed`. Local: `legacyDoneBooks`. */
export const LESSON_PROGRESS_PERSISTED_KEYS = [
  'readReadingIds',
  'lessonDoneMarks',
  'legacyDoneBooks',
  'startHereCompletedLessons',
  'startHerePassed',
] as const;
export const LESSON_PROGRESS_SYNCED_KEYS = [
  'readReadingIds',
  'lessonDoneMarks',
  'startHereCompletedLessons',
  'startHerePassed',
] as const;

export const LESSON_PROGRESS_ACCOUNT_SWITCH_DEFAULTS = {
  readReadingIds: [],
  lessonDoneMarks: {},
  legacyDoneBooks: [],
  startHereCompletedLessons: [],
  startHerePassed: false,
};
