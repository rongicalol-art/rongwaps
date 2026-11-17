import { LESSON_PAGE_LESSONS } from '../../app/routes';

const PENDING_LESSON_KEY = 'pendingLessonPage';

/**
 * A public lesson page's Study button remembers its lesson here, so the app can open that
 * lesson after the trip through Google sign-in (which always returns to the home address).
 * Storage can throw in private mode or when site data is blocked.
 */
export function rememberLessonReturn(lessonId: number): void {
  try { sessionStorage.setItem(PENDING_LESSON_KEY, String(lessonId)); } catch { /* ignore */ }
}

function read(): number | null {
  try {
    const lessonId = Number(sessionStorage.getItem(PENDING_LESSON_KEY));
    return Number.isInteger(lessonId) && lessonId >= 1 && lessonId <= LESSON_PAGE_LESSONS ? lessonId : null;
  } catch { return null; }
}

export const hasLessonReturn = (): boolean => read() !== null;

export function takeLessonReturn(): number | null {
  const lessonId = read();
  try { sessionStorage.removeItem(PENDING_LESSON_KEY); } catch { /* ignore */ }
  return lessonId;
}
