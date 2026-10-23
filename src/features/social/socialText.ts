import type { Activity } from '../../../shared/lobby';
import type { RaceSelection, RaceType } from '../../../shared/quizRace';

const TYPE_LABEL: Record<RaceType, string> = {
  meaning: 'Pick meaning', listen: 'Listen', hanzi: 'Pick character', match: 'Pair match', 'true-false': 'True or false', build: 'Build the word',
};
const ACTIVITY_LABEL: Record<Activity, string> = {
  lesson: 'Browsing', cards: 'Flashcards', quiz: 'Quiz', grammar: 'Grammar', reading: 'Reading', writing: 'Writing', race: 'Quiz race',
};

export const typeLabel = (types: readonly RaceType[]) => (types.length === 0 ? 'Mixed' : types.map((type) => TYPE_LABEL[type]).join(', '));
export const activityLabel = (activity: Activity | null) => (activity ? ACTIVITY_LABEL[activity] : 'Online');

const lessonName = (lesson: number) => (lesson === 0 ? 'Intro' : `L${lesson}`);
const partsName = (parts: number[]) => (parts.length === 3 ? 'P1–3' : parts.map((part) => `P${part}`).join(' '));

/** "L1 · P1–3", "L2–4", or "L1, L3" (one lesson shows its parts). */
export function lessonsSummary(lessons: RaceSelection['lessons']): string {
  const keys = Object.keys(lessons).map(Number).sort((a, b) => a - b);
  if (keys.length === 1) return `${lessonName(keys[0])} · ${partsName(lessons[keys[0]])}`;
  const run = keys.every((key, index) => index === 0 || key === keys[index - 1] + 1);
  return run ? `${lessonName(keys[0])}–${keys[keys.length - 1]}` : keys.map(lessonName).join(', ');
}

/** A new room covers the learner's lesson (Book 1 during the beta), all parts. */
export function defaultSelection(lesson: number | null): RaceSelection {
  const id = lesson !== null && Math.floor(lesson / 100) === 1 ? lesson % 100 : 1;
  return { lessons: { [id]: id === 0 ? [1] : [1, 2, 3] }, types: [] };
}

export const describeSelection = (selection: RaceSelection) => `${lessonsSummary(selection.lessons)} · ${typeLabel(selection.types)}`;

/** "Lesson 4 · Quiz" for a presence row; lesson keys are `bookId * 100 + lessonId`. */
export function whereLabel(lesson: number | null, activity: Activity | null, sameLesson: boolean): string {
  if (sameLesson || lesson === null) return activityLabel(activity);
  const book = Math.floor(lesson / 100);
  const id = lesson % 100;
  const where = `${book > 1 ? `Book ${book} · ` : ''}${id === 0 ? 'Intro' : `Lesson ${id}`}`;
  return activity && activity !== 'lesson' ? `${where} · ${activityLabel(activity)}` : where;
}
