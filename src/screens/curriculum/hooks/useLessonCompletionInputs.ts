import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchReadingsPack } from '../../../services/contentPacks';
import { useAppStore } from '../../../store/useAppStore';
import type { CourseLessonProgress } from '../../../types/models';
import {
  isLessonTestPassed,
  lessonProgressKey,
  summarizeLessonCompletion,
  type ActivityProgress,
} from '../../../utils/lesson/lessonCompletion';
import { checkpointForUser } from '../../../utils/sync/cloudSyncQueue';

/** Each lesson's reading ids, once the book's readings pack has loaded (null until then). */
function useLessonReadingIds(bookId: number, enabled: boolean) {
  const [state, setState] = useState<{ bookId: number; byLesson: Map<number, string[]> } | null>(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let current = true;
    fetchReadingsPack(bookId).then((readings) => {
      if (!current) return;
      const byLesson = new Map<number, string[]>();
      for (const reading of readings ?? []) byLesson.set(reading.lessonId, [...(byLesson.get(reading.lessonId) ?? []), reading.id]);
      setState({ bookId, byLesson });
    }).catch(() => {});
    return () => { current = false; };
  }, [bookId, enabled]);
  return state?.bookId === bookId ? state.byLesson : null;
}

/**
 * A book's lesson completion: `completionFor` gives one lesson's done state, activity bars and
 * test result from the learner's progress (readings count once the book's readings are known).
 */
export function useLessonCompletion(bookId: number, enabled: boolean) {
  const completedPageIds = useAppStore((state) => state.completedPageIds);
  const readReadingIds = useAppStore((state) => state.readReadingIds);
  const lessonDoneMarks = useAppStore((state) => state.lessonDoneMarks);
  const lessonTests = useAppStore((state) => state.lessonTests);
  const readingIdsByLesson = useLessonReadingIds(bookId, enabled);
  return useCallback((lessonId: number, words: ActivityProgress, grammarPageIds: string[]) => {
    const key = lessonProgressKey(bookId, lessonId);
    const readingIds = readingIdsByLesson?.get(lessonId) ?? [];
    return {
      completion: summarizeLessonCompletion({
        words,
        grammar: { done: grammarPageIds.filter((id) => completedPageIds.includes(id)).length, total: grammarPageIds.length },
        reading: readingIdsByLesson
          ? { done: readingIds.filter((id) => readReadingIds.includes(id)).length, total: readingIds.length }
          : null,
        mark: lessonDoneMarks[key],
      }),
      isTestPassed: isLessonTestPassed(lessonTests[key]),
    };
  }, [bookId, completedPageIds, lessonDoneMarks, lessonTests, readReadingIds, readingIdsByLesson]);
}

/**
 * Lessons done before readings counted (all words + all grammar) stay done: once per book on this
 * device, after this account's first sync (so cards and grammar from other devices are already here),
 * they get a done mark. `lessons` is null until the book's progress is known.
 */
export function useKeepLegacyLessonsDone(bookId: number, lessons: CourseLessonProgress[] | null) {
  const legacyDoneKeys = useMemo(() => lessons
    ?.filter((lesson) => lesson.state !== 'locked' && lesson.wordCount > 0
      && lesson.learnedCount >= lesson.wordCount && lesson.completedPathCount >= lesson.requiredPathCount)
    .map((lesson) => lessonProgressKey(bookId, lesson.id)) ?? null, [bookId, lessons]);
  const isChecked = useAppStore((state) => state.legacyDoneBooks.includes(bookId));
  const hasSynced = useAppStore((state) => !state.currentUser || checkpointForUser(state.syncCheckpoint, state.currentUser.id) !== null);
  const keepLegacyLessonsDone = useAppStore((state) => state.keepLegacyLessonsDone);
  useEffect(() => {
    if (isChecked || !hasSynced || !legacyDoneKeys) return;
    keepLegacyLessonsDone(bookId, legacyDoneKeys);
  }, [bookId, hasSynced, isChecked, keepLegacyLessonsDone, legacyDoneKeys]);
}
