import type { Activity } from '../../../shared/lobby';
import type { RaceSelection, RaceType } from '../../../shared/quizRace';
import { RACE_BOOKS } from '../../../shared/courseAccess';

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

/** "Book 3 · L1 · P1–3", "Book 1 · L2–4", or "Book 1 · L1, L3" (one lesson shows its parts). */
export function lessonsSummary({ book, lessons }: Pick<RaceSelection, 'book' | 'lessons'>): string {
  const keys = Object.keys(lessons).map(Number).sort((a, b) => a - b);
  const run = keys.every((key, index) => index === 0 || key === keys[index - 1] + 1);
  const picked = keys.length === 1 ? `${lessonName(keys[0])} · ${partsName(lessons[keys[0]])}`
    : run ? `${lessonName(keys[0])}–${keys[keys.length - 1]}` : keys.map(lessonName).join(', ');
  return `Book ${book ?? 1} · ${picked}`;
}

/** A new room covers the learner's lesson when everyone can open it (`RACE_BOOKS`), all parts; else Book 1 Lesson 1. */
export function defaultSelection(lesson: number | null): RaceSelection {
  const book = lesson === null ? 1 : Math.floor(lesson / 100);
  const id = lesson === null ? 1 : lesson % 100;
  const range = RACE_BOOKS[book];
  if (!range || id < range.first || id > range.last) return { book: 1, lessons: { 1: [1, 2, 3] }, types: [] };
  return { book, lessons: { [id]: id === 0 ? [1] : [1, 2, 3] }, types: [] };
}

export const describeSelection = (selection: RaceSelection) => `${lessonsSummary(selection)} · ${typeLabel(selection.types)}`;

/** "Lesson 4 · Quiz" for a presence row; lesson keys are `bookId * 100 + lessonId`. */
export function whereLabel(lesson: number | null, activity: Activity | null, sameLesson: boolean): string {
  if (sameLesson || lesson === null) return activityLabel(activity);
  const book = Math.floor(lesson / 100);
  const id = lesson % 100;
  const where = `${book > 1 ? `Book ${book} · ` : ''}${id === 0 ? 'Intro' : `Lesson ${id}`}`;
  return activity && activity !== 'lesson' ? `${where} · ${activityLabel(activity)}` : where;
}
