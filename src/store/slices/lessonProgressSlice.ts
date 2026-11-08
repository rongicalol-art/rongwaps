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
  markReadingRead: (readingId: string) => void;
  setLessonDoneMark: (lessonKey: string, done: boolean) => void;
  /** Keeps lessons done that were done before readings counted: marks them, never overriding a mark. */
  keepLegacyLessonsDone: (bookId: number, lessonKeys: string[]) => void;
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
    // After a reset nothing was done under the old rule either, so the check can stay recorded.
    resetLessonProgress: () => set({ readReadingIds: [], lessonDoneMarks: {} }),
  };
}

/** Synced: `readReadingIds` and `lessonDoneMarks` (see cloudSyncTransforms). Local: `legacyDoneBooks`. */
export const LESSON_PROGRESS_PERSISTED_KEYS = ['readReadingIds', 'lessonDoneMarks', 'legacyDoneBooks'] as const;
export const LESSON_PROGRESS_SYNCED_KEYS = ['readReadingIds', 'lessonDoneMarks'] as const;

export const LESSON_PROGRESS_ACCOUNT_SWITCH_DEFAULTS = {
  readReadingIds: [],
  lessonDoneMarks: {},
  legacyDoneBooks: [],
};
