import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import test from 'node:test';
import { readJson } from '../acceptance_helpers';
import type { LessonTestLesson } from '../../src/types/lessonTest';
import { lessonLevel, lessonPoolEntries } from '../../src/utils/mockTest/poolLabels';

/** The lesson tests as the mock test's first pool: every question gets a band, a section, a level and a difficulty. */

const lessons = readdirSync('content/lesson-tests')
  .filter((name) => name.startsWith('book-'))
  .flatMap((book) => readdirSync(`content/lesson-tests/${book}`).map((file) => readJson<LessonTestLesson>(`content/lesson-tests/${book}/${file}`)));

test('lessons map to levels in book order', () => {
  assert.deepEqual(lessonLevel(1, 1), { level: 0.5, band: 'N', position: 0 });
  assert.equal(lessonLevel(1, 9)?.level, 1);
  assert.equal(lessonLevel(2, 2)?.position, 1);
  assert.deepEqual([lessonLevel(2, 10)?.level, lessonLevel(2, 10)?.band], [3, 'B']);
  assert.equal(lessonLevel(3, 16)?.level, 4);
  assert.equal(lessonLevel(9, 1), null);
});

test('every authored lesson test question is labelled', () => {
  for (const lesson of lessons) {
    const entries = lessonPoolEntries(lesson);
    assert.equal(entries.length, lesson.slots.reduce((sum, slot) => sum + slot.versions.length, 0), lesson.key);
    for (const entry of entries) {
      assert.match(entry.section, /^[NABC]:(listening|reading):[a-z-]+$/);
      assert.ok(Number.isFinite(entry.difficulty));
    }
  }
});

test('a later lesson of a level is harder than an earlier one, and a higher level harder still', () => {
  const difficulty = (book: number, lesson: number) => lessonPoolEntries(lessons.find((l) => l.bookId === book && l.lessonId === lesson)!)
    .find((entry) => entry.part === 'listening')!.difficulty;
  assert.ok(difficulty(1, 1) < difficulty(1, 4));
  assert.ok(difficulty(1, 16) < difficulty(2, 5));
  assert.ok(difficulty(2, 5) < difficulty(2, 12));
});
