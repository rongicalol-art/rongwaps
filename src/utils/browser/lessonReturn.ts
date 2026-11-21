import { isLessonPage, type LessonPageRef } from '../../app/routes';

const PENDING_LESSON_KEY = 'pendingLessonPage';

/**
 * A public lesson page's Study button remembers its lesson here (`2:5`), so the app can open that
 * lesson after the trip through Google sign-in (which always returns to the home address).
 * A bare number is a Book 1 lesson, stored before other books had pages.
 * Storage can throw in private mode or when site data is blocked.
 */
export function rememberLessonReturn({ bookId, lessonId }: LessonPageRef): void {
  try { sessionStorage.setItem(PENDING_LESSON_KEY, `${bookId}:${lessonId}`); } catch { /* ignore */ }
}

function read(): LessonPageRef | null {
  try {
    const parts = (sessionStorage.getItem(PENDING_LESSON_KEY) ?? '').split(':').map(Number);
    const [bookId, lessonId] = parts.length === 1 ? [1, parts[0]] : parts;
    return isLessonPage(bookId, lessonId) ? { bookId, lessonId } : null;
  } catch { return null; }
}

export const hasLessonReturn = (): boolean => read() !== null;

export function takeLessonReturn(): LessonPageRef | null {
  const ref = read();
  try { sessionStorage.removeItem(PENDING_LESSON_KEY); } catch { /* ignore */ }
  return ref;
}
