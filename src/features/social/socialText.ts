import type { Activity } from '../../../shared/lobby';
import type { RaceSelection, RaceType } from '../../../shared/quizRace';
import { RACE_BOOKS } from '../../../shared/courseAccess';
import { isNameAllowed } from '../../../shared/nameFilter';

const TYPE_LABEL: Record<RaceType, string> = {
  meaning: 'Pick meaning', listen: 'Listen', hanzi: 'Pick character', match: 'Pair match', 'true-false': 'True or false', build: 'Build the word',
};
const ACTIVITY_LABEL: Record<Activity, string> = {
  lesson: 'Browsing', cards: 'Flashcards', quiz: 'Quiz', grammar: 'Grammar', reading: 'Reading', writing: 'Writing', race: 'Quiz race', test: 'Mock test',
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

const MINUTE = 60_000;
/** "Seen 12 min ago", "Seen 3 h ago", "Seen yesterday", "Seen 4 days ago", "Seen Nov 2" (an offline classmate). */
export function seenLabel(at: number | null | undefined, now = Date.now()): string {
  if (!at) return 'Not online';
  const gap = Math.max(0, now - at);
  if (gap < 5 * MINUTE) return 'Seen just now';
  if (gap < 60 * MINUTE) return `Seen ${Math.round(gap / MINUTE)} min ago`;
  if (gap < 24 * 60 * MINUTE) return `Seen ${Math.round(gap / (60 * MINUTE))} h ago`;
  const days = Math.round(gap / (24 * 60 * MINUTE));
  if (days < 2) return 'Seen yesterday';
  if (days < 7) return `Seen ${days} days ago`;
  return `Seen ${new Date(at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
}

/** A conversation's time in the Chats list: "9:41 PM" today, else "Yesterday" or "Nov 2". */
export function listTime(at: number, now = Date.now()): string {
  const day = new Date(at).setHours(0, 0, 0, 0);
  const today = new Date(now).setHours(0, 0, 0, 0);
  if (day === today) return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (today - day <= 86_400_000 * 1.5) return 'Yesterday';
  return new Date(at).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

/** "Kai Lin" → "kai.lin": what the database makes an automatic @username from (it cleans it again). */
export function usernameBase(name: string): string {
  const base = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s-]+/g, '.')
    .replace(/[^a-z0-9_.]/g, '').replace(/\.{2,}/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 16).replace(/\.+$/, '');
  return base.length >= 3 && isNameAllowed(base) ? base : 'learner';
}
