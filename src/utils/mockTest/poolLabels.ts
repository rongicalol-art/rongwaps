import type { LessonTestItem, LessonTestLesson, LessonTestPart } from '../../types/lessonTest';
import { bandDifficulty } from './bandScore';
import type { MockBand, PoolEntry } from './pool';

/**
 * Labels for the lesson tests' questions, so they serve as the mock test's first pool. A question's band and level
 * come from where its lesson sits in the books (docs/reference/TOCFL.md, "Levels and the books"), its section from
 * its shape, and its first difficulty from how far into the band its lesson is. Questions written for the mock
 * test carry their own labels and do not pass through here.
 */

/** Each band's levels with their lessons in order, as [book, first lesson, last lesson] runs. 0.5 and 0.9 are Novice 1 and 2. */
const BAND_LESSONS: ReadonlyArray<{ band: MockBand; levels: ReadonlyArray<{ level: number; runs: ReadonlyArray<readonly [number, number, number]> }> }> = [
  { band: 'N', levels: [{ level: 0.5, runs: [[1, 1, 4]] }, { level: 0.9, runs: [[1, 5, 8]] }] },
  { band: 'A', levels: [{ level: 1, runs: [[1, 9, 16], [2, 1, 2]] }, { level: 2, runs: [[2, 3, 9]] }] },
  { band: 'B', levels: [{ level: 3, runs: [[2, 10, 16], [3, 1, 9]] }, { level: 4, runs: [[3, 10, 16], [4, 1, 3]] }] },
];

export interface LessonLevel {
  level: number;
  band: MockBand;
  /** 0 at the band's first lesson, 1 at its last. */
  position: number;
}

export function lessonLevel(bookId: number, lessonId: number): LessonLevel | null {
  for (const { band, levels } of BAND_LESSONS) {
    const lessons = levels.flatMap(({ level, runs }) => runs.flatMap(([book, first, last]) => (
      Array.from({ length: last - first + 1 }, (_, i) => ({ level, id: `${book}:${first + i}` }))
    )));
    const index = lessons.findIndex((lesson) => lesson.id === `${bookId}:${lessonId}`);
    if (index >= 0) return { level: lessons[index].level, band, position: index / (lessons.length - 1) };
  }
  return null;
}

/** A question's shape, named after the part of the official paper it mirrors. */
export function itemShape(item: LessonTestItem): string {
  switch (item.kind) {
    case 'hear-pick-picture': return 'hear-pick-picture';
    case 'picture-hear': return 'picture-hear';
    case 'dialogue': {
      const talk = new Set(item.lines.map((line) => line.speaker)).size === 1;
      if (item.questions.length > 1) return talk ? 'talk-group' : 'dialogue-group';
      if (talk) return 'talk';
      return item.printed ? 'dialogue-printed' : 'dialogue-spoken';
    }
    case 'read-pick-picture': return 'sentence-picture';
    case 'realia': return 'realia';
    case 'scene-gap': return 'scene-gap';
    case 'paragraph-bank': return 'paragraph-bank';
    case 'cloze': return 'cloze';
    case 'reading': return item.questions.length > 1 ? 'reading-group' : 'reading';
  }
}

export function poolSection(band: MockBand, part: LessonTestPart, item: LessonTestItem): string {
  return `${band}:${part}:${itemShape(item)}`;
}

/** Every version of every slot of a lesson, labelled. A lesson outside the level table gives nothing. */
export function lessonPoolEntries(lesson: LessonTestLesson): PoolEntry[] {
  const place = lessonLevel(lesson.bookId, lesson.lessonId);
  if (!place) return [];
  const origin = { key: lesson.key, bookId: lesson.bookId, lessonId: lesson.lessonId, band: lesson.band, allowWords: lesson.allowWords };
  return lesson.slots.flatMap((slot) => slot.versions.map((item): PoolEntry => ({
    item,
    part: slot.part,
    band: place.band,
    section: poolSection(place.band, slot.part, item),
    level: place.level,
    difficulty: bandDifficulty(place.band, slot.part, place.position),
    family: `${lesson.key}:${slot.id}`,
    origin,
  })));
}
