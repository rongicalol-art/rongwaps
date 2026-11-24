import { useEffect, useState } from 'react';
import { fetchLessonTest } from '../services/contentPacks';
import type { LessonTestLesson, LessonTestSounds } from '../types/lessonTest';

export interface LessonTestData {
  lesson: LessonTestLesson;
  sounds: LessonTestSounds;
}

/** A lesson's test from its own file; `null` once loaded means the lesson has no test (yet). */
export function useLessonTestData(bookId: number | null, lessonId: number | null) {
  const [state, setState] = useState<{ key: string; data: LessonTestData | null; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = bookId && lessonId ? `${bookId}:${lessonId}:${attempt}` : null;

  useEffect(() => {
    if (!key || !bookId || !lessonId) return undefined;
    let current = true;
    void fetchLessonTest(bookId, lessonId).then(
      (file) => {
        if (current) setState({ key, data: file ? { lesson: file.lesson, sounds: file.sounds } : null, error: false });
      },
      () => { if (current) setState({ key, data: null, error: true }); },
    );
    return () => { current = false; };
  }, [bookId, key, lessonId]);

  const loaded = state?.key === key ? state : null;
  return {
    data: loaded?.data ?? null,
    isLoading: Boolean(key) && !loaded,
    error: loaded?.error ?? false,
    retry: () => setAttempt((value) => value + 1),
  };
}
