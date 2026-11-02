import type { AppState } from '../../store/useAppStore';
import { lessonKey } from '../../store/slices/socialSlice';
import { getSelectedLessonIds } from '../../utils/lesson/lessonPartSelection';
import type { Activity } from '../../../shared/lobby';
import type { ActivityType } from '../../types/models';

const ACTIVITY: Partial<Record<NonNullable<ActivityType>, Activity>> = { flashcards: 'cards', quiz: 'quiz', writing: 'writing', listening: 'quiz' };

type PresenceState = Pick<AppState, 'activeActivity' | 'activeBookId' | 'racePlaying' | 'race' | 'selectedLessonParts' | 'socialStudying' | 'socialViewingLesson'>;

/** What classmates see: a race first, then a study activity, then an open reading or grammar window, then the lesson window. */
export function presenceFor(state: PresenceState): { lesson: number | null; a: Activity | null } {
  const activity = state.activeActivity;
  const race = state.racePlaying ? state.race : null;
  if (race) return { lesson: lessonKey(race.selection.book ?? 1, Number(Object.keys(race.selection.lessons)[0])), a: 'race' };
  if (activity) {
    const lessonId = getSelectedLessonIds(state.selectedLessonParts, state.activeBookId)[0];
    return { lesson: lessonId !== undefined ? lessonKey(state.activeBookId, lessonId) : state.socialViewingLesson, a: ACTIVITY[activity] ?? 'lesson' };
  }
  if (state.socialStudying) return { lesson: state.socialStudying.lesson, a: state.socialStudying.a };
  return { lesson: state.socialViewingLesson, a: state.socialViewingLesson !== null ? 'lesson' : null };
}
