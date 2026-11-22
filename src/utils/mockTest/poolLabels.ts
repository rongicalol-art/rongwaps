import type { LessonTestItem, LessonTestLesson, LessonTestPart } from '../../types/lessonTest';
import { levelDifficulty } from './adaptiveScale';
import type { MockBand, PoolEntry } from './pool';

/**
 * Labels for the lesson tests' questions, so they serve as the mock test's first pool. A question's level comes
 * from where its lesson sits in the books (docs/reference/TOCFL.md, "Levels and the books"), its section from
 * its shape, and its first difficulty from how far into the level its lesson is. Questions written for the mock
 * test carry their own labels and do not pass through here.
 */

/** Each level's lessons in order, as [book, first lesson, last lesson] runs. 0.5 and 0.9 are Novice 1 and 2. */
const LEVEL_LESSONS: ReadonlyArray<{ level: number; band: MockBand; runs: ReadonlyArray<readonly [number, number, number]> }> = [
  { level: 0.5, band: 'N', runs: [[1, 1, 4]] },
  { level: 0.9, band: 'N', runs: [[1, 5, 8]] },
  { level: 1, band: 'A', runs: [[1, 9, 16], [2, 1, 2]] },
  { level: 2, band: 'A', runs: [[2, 3, 9]] },
  { level: 3, band: 'B', runs: [[2, 10, 16], [3, 1, 9]] },
  { level: 4, band: 'B', runs: [[3, 10, 16], [4, 1, 3]] },
];

export interface LessonLevel {
  level: number;
  band: MockBand;
  /** 0 at the level's first lesson, 1 at its last. */
  position: number;
}

export function lessonLevel(bookId: number, lessonId: number): LessonLevel | null {
  for (const { level, band, runs } of LEVEL_LESSONS) {
    const lessons = runs.flatMap(([book, first, last]) => Array.from({ length: last - first + 1 }, (_, i) => `${book}:${first + i}`));
    const index = lessons.indexOf(`${bookId}:${lessonId}`);
    if (index >= 0) return { level, band, position: lessons.length > 1 ? index / (lessons.length - 1) : 0.5 };
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
  return lesson.slots.flatMap((slot) => slot.versions.map((item): PoolEntry => ({
    item,
    part: slot.part,
    band: place.band,
    section: poolSection(place.band, slot.part, item),
    level: place.level,
    difficulty: levelDifficulty(slot.part, place.level, place.position),
  })));
}
