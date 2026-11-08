import { useEffect, useState } from 'react';
import { fetchReadingsPack } from '../../../services/contentPacks';
import { useAppStore } from '../../../store/useAppStore';
import { checkpointForUser } from '../../../utils/sync/cloudSyncQueue';

/** Each lesson's reading ids, once the book's readings pack has loaded (null until then). */
export function useLessonReadingIds(bookId: number, enabled: boolean) {
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
 * Lessons done before readings counted (all words + all grammar) stay done: once per book on this
 * device, after this account's first sync (so cards and grammar from other devices are already here),
 * they get a done mark. `legacyDoneKeys` is null until the book's progress is known.
 */
export function useKeepLegacyLessonsDone(bookId: number, legacyDoneKeys: string[] | null) {
  const isChecked = useAppStore((state) => state.legacyDoneBooks.includes(bookId));
  const hasSynced = useAppStore((state) => !state.currentUser || checkpointForUser(state.syncCheckpoint, state.currentUser.id) !== null);
  const keepLegacyLessonsDone = useAppStore((state) => state.keepLegacyLessonsDone);
  useEffect(() => {
    if (isChecked || !hasSynced || !legacyDoneKeys) return;
    keepLegacyLessonsDone(bookId, legacyDoneKeys);
  }, [bookId, hasSynced, isChecked, keepLegacyLessonsDone, legacyDoneKeys]);
}
